"""Amazon売価の自動取得。

Keepa API または Amazon SP-API からAmazon.co.jpの現在価格(カート価格)と
売れ筋ランキングを取得する。結果はDBにキャッシュしてトークン消費を抑える。

優先順位: Keepa → SP-API → (デモ商品のみ)デモ価格 → なし(係数推定にフォールバック)
"""
import datetime
import hashlib
import random
import time

import requests

from . import db as dbm

TIMEOUT = 15
JP_MARKETPLACE_ID = "A1VC38T7YXB528"
SPAPI_ENDPOINT = "https://sellingpartnerapi-fe.amazon.com"
LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token"


class AmazonPriceError(Exception):
    pass


# ---------------- Keepa ----------------

class KeepaClient:
    """Keepa Product API (domain=5: amazon.co.jp)。価格は円の整数。"""
    label = "Keepa"
    URL = "https://api.keepa.com/product"

    def __init__(self, api_key):
        self.api_key = api_key

    def _fetch(self, jan, history=0):
        params = {
            "key": self.api_key,
            "domain": 5,
            "code": jan,
            "stats": 30,
            "history": history,
        }
        try:
            res = requests.get(self.URL, params=params, timeout=TIMEOUT)
            data = res.json()
        except (requests.RequestException, ValueError) as e:
            raise AmazonPriceError(f"Keepa API エラー: {e}")
        if "error" in data:
            raise AmazonPriceError(f"Keepa API エラー: {data['error'].get('message', data['error'])}")
        products = data.get("products") or []
        return products[0] if products else None

    def price_by_jan(self, jan):
        product = self._fetch(jan, history=0)
        return parse_keepa_product(product) if product else None

    def history_by_jan(self, jan, days=90):
        """価格履歴 [(date, price), ...] を返す(新品最安、なければAmazon本体)。"""
        product = self._fetch(jan, history=1)
        if not product:
            return []
        csv = product.get("csv") or []
        series = None
        for idx in (1, 0):  # 1=新品最安, 0=Amazon本体
            if idx < len(csv) and csv[idx]:
                series = csv[idx]
                break
        if not series:
            return []
        points = []
        cutoff = datetime.date.today() - datetime.timedelta(days=days)
        for i in range(0, len(series) - 1, 2):
            kt, price = series[i], series[i + 1]
            if not isinstance(price, (int, float)) or price <= 0:
                continue
            # KeepaTime(分) → UNIX秒
            d = datetime.date.fromtimestamp((kt + 21564000) * 60)
            if d >= cutoff:
                points.append((d.isoformat(), int(price)))
        return points


def parse_keepa_product(product):
    """Keepa productオブジェクトから現在価格・ランキングを取り出す。

    stats.current のインデックス: 0=AMAZON本体, 1=新品最安, 3=売れ筋ランキング,
    18=カート価格(送料込)。-1 はデータなし。
    """
    stats = product.get("stats") or {}
    current = stats.get("current") or []

    def at(i):
        v = current[i] if i < len(current) else -1
        return v if isinstance(v, (int, float)) and v > 0 else 0

    price = at(18) or at(1) or at(0)
    if not price:
        return None
    return {
        "price": int(price),
        "rank": int(at(3)),
        "asin": product.get("asin", "") or "",
        "title": product.get("title", "") or "",
        "source": "keepa",
    }


# ---------------- Amazon SP-API ----------------

class SPAPIClient:
    """Amazon SP-API (LWAトークン認証)。JAN→ASIN解決後にカート/最安値を取得。"""
    label = "Amazon SP-API"

    def __init__(self, client_id, client_secret, refresh_token):
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token
        self._token = None
        self._token_expires = 0.0

    def _access_token(self):
        if self._token and time.time() < self._token_expires:
            return self._token
        try:
            res = requests.post(LWA_TOKEN_URL, data={
                "grant_type": "refresh_token",
                "refresh_token": self.refresh_token,
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            }, timeout=TIMEOUT)
            data = res.json()
        except (requests.RequestException, ValueError) as e:
            raise AmazonPriceError(f"SP-API 認証エラー: {e}")
        if "access_token" not in data:
            raise AmazonPriceError(f"SP-API 認証エラー: {data.get('error_description', data)}")
        self._token = data["access_token"]
        self._token_expires = time.time() + int(data.get("expires_in", 3600)) - 600
        return self._token

    def _request(self, method, path, params, body=None):
        headers = {"x-amz-access-token": self._access_token()}
        try:
            res = requests.request(
                method, SPAPI_ENDPOINT + path, params=params,
                headers=headers, json=body, timeout=TIMEOUT,
            )
            data = res.json()
        except (requests.RequestException, ValueError) as e:
            raise AmazonPriceError(f"SP-API エラー: {e}")
        if res.status_code >= 300:
            errors = data.get("errors") or [{}]
            raise AmazonPriceError(f"SP-API エラー({res.status_code}): {errors[0].get('message', data)}")
        return data

    def _get(self, path, params):
        return self._request("GET", path, params)

    def asin_by_jan(self, jan):
        data = self._get("/catalog/2022-04-01/items", {
            "identifiers": jan,
            "identifiersType": "EAN",
            "marketplaceIds": JP_MARKETPLACE_ID,
            "includedData": "summaries,salesRanks",
        })
        items = data.get("items") or []
        if not items:
            return None
        item = items[0]
        rank = 0
        for sr in item.get("salesRanks", []):
            for r in sr.get("displayGroupRanks", []) + sr.get("classificationRanks", []):
                rank = rank or int(r.get("rank", 0))
        summaries = item.get("summaries") or [{}]
        return {
            "asin": item.get("asin", ""),
            "title": summaries[0].get("itemName", ""),
            "rank": rank,
        }

    def price_by_jan(self, jan):
        info = self.asin_by_jan(jan)
        if not info or not info["asin"]:
            return None
        data = self._get(f"/products/pricing/v0/items/{info['asin']}/offers", {
            "MarketplaceId": JP_MARKETPLACE_ID,
            "ItemCondition": "New",
        })
        summary = (data.get("payload") or {}).get("Summary") or {}
        price = _spapi_price(summary)
        if not price:
            return None
        return {
            "price": price,
            "rank": info["rank"],
            "asin": info["asin"],
            "title": info["title"],
            "source": "sp-api",
        }


    def submit_listing(self, seller_id, sku, asin, price, quantity=1,
                       condition="new_new"):
        """既存ASINへの相乗り出品(オファー)をSP-API Listings APIで登録する。

        戻り値: {"status": ..., "issues": [...]}(SUBMITTED/ACCEPTED で受理)
        """
        path = f"/listings/2021-08-01/items/{seller_id}/{sku}"
        params = {"marketplaceIds": JP_MARKETPLACE_ID, "issueLocale": "ja_JP"}
        mp = {"marketplace_id": JP_MARKETPLACE_ID}
        body = {
            "productType": "PRODUCT",
            "requirements": "LISTING_OFFER_ONLY",
            "attributes": {
                "merchant_suggested_asin": [{"value": asin, **mp}],
                "condition_type": [{"value": condition, **mp}],
                "purchasable_offer": [{
                    **mp,
                    "currency": "JPY",
                    "our_price": [{"schedule": [{"value_with_tax": int(price)}]}],
                }],
                "fulfillment_availability": [{
                    "fulfillment_channel_code": "DEFAULT",
                    "quantity": int(quantity),
                }],
            },
        }
        data = self._request("PUT", path, params, body)
        return {
            "status": data.get("status", ""),
            "issues": [i.get("message", "") for i in data.get("issues", [])],
        }

    def update_quantity(self, seller_id, sku, quantity):
        """出品中SKUの在庫数を更新する(0で実質的な出品停止)。"""
        path = f"/listings/2021-08-01/items/{seller_id}/{sku}"
        params = {"marketplaceIds": JP_MARKETPLACE_ID, "issueLocale": "ja_JP"}
        body = {
            "productType": "PRODUCT",
            "patches": [{
                "op": "replace",
                "path": "/attributes/fulfillment_availability",
                "value": [{
                    "fulfillment_channel_code": "DEFAULT",
                    "quantity": int(quantity),
                }],
            }],
        }
        data = self._request("PATCH", path, params, body)
        return {
            "status": data.get("status", ""),
            "issues": [i.get("message", "") for i in data.get("issues", [])],
        }


# 出品時の状態 → SP-API condition_type
SPAPI_CONDITIONS = {
    "新品・未開封": "new_new",
    "新品": "new_new",
    "未使用に近い": "used_like_new",
    "目立った傷や汚れなし": "used_very_good",
    "やや傷や汚れあり": "used_good",
    "中古": "used_good",
}


def _spapi_price(summary):
    """Pricing APIのSummaryからカート価格(なければ新品最安+送料)を取り出す。"""
    for key in ("BuyBoxPrices", "LowestPrices"):
        for entry in summary.get(key) or []:
            landed = entry.get("LandedPrice") or {}
            amount = landed.get("Amount")
            if amount:
                return int(round(float(amount)))
    return 0


# ---------------- デモ ----------------

class DemoAmazonPricer:
    """デモ商品用の擬似Amazon相場。JANから決定的に生成する。"""
    label = "デモ相場"

    def price_by_jan(self, jan):
        seed = int(hashlib.md5(jan.encode("utf-8")).hexdigest(), 16) % (2 ** 32)
        rng = random.Random(seed)
        return {
            "price": int(rng.randint(1200, 26000) / 10) * 10,
            "rank": rng.randint(500, 150000),
            "asin": "B0DEMO" + jan[-4:],
            "title": "",
            "source": "demo",
        }

    def history_by_jan(self, jan, days=90):
        """現在価格を終点とする擬似的な90日価格推移を生成する。"""
        current = self.price_by_jan(jan)["price"]
        seed = int(hashlib.md5(("h" + jan).encode("utf-8")).hexdigest(), 16) % (2 ** 32)
        rng = random.Random(seed)
        today = datetime.date.today()
        price = current
        points = []
        for i in range(days, -1, -3):
            d = today - datetime.timedelta(days=i)
            points.append((d.isoformat(), max(300, int(price / 10) * 10)))
            price *= rng.uniform(0.96, 1.05)
        points[-1] = (today.isoformat(), current)
        return points


# ---------------- 共通入口 ----------------

def build_pricer(settings):
    if settings.get("keepa_api_key"):
        return KeepaClient(settings["keepa_api_key"])
    if all(settings.get(k) for k in ("spapi_client_id", "spapi_client_secret", "spapi_refresh_token")):
        return SPAPIClient(
            settings["spapi_client_id"],
            settings["spapi_client_secret"],
            settings["spapi_refresh_token"],
        )
    return None


def get_price(jan, settings, pricer=None, allow_demo=False, force=False):
    """JANからAmazon売価を取得する(キャッシュ優先、force=Trueで再取得)。

    戻り値: {price, rank, asin, title, source} または None。
    pricer未指定時は設定から構築。allow_demo=True かつ実APIなしならデモ相場。
    """
    if not jan:
        return None
    db = dbm.get_db()
    hours = int(float(settings.get("amazon_cache_hours", "24") or 24))
    row = db.execute("SELECT * FROM amazon_prices WHERE jan=?", (jan,)).fetchone()
    if row and not force:
        fetched = datetime.datetime.fromisoformat(row["fetched_at"])
        if datetime.datetime.now() - fetched < datetime.timedelta(hours=hours):
            if row["price"] <= 0:
                return None  # 「見つからなかった」結果もキャッシュ
            return {"price": row["price"], "rank": row["rank"], "asin": row["asin"],
                    "title": row["title"], "source": row["source"], "cached": True}

    pricer = pricer or build_pricer(settings)
    if pricer is None:
        if not allow_demo:
            return None
        pricer = DemoAmazonPricer()

    result = pricer.price_by_jan(jan)  # AmazonPriceErrorは呼び出し側で処理
    _save_cache(db, jan, result)
    return result


def get_history(jan, settings, allow_demo=False):
    """価格履歴を取得する。Keepa(またはデモ)のみ対応。非対応ならNone。"""
    if not jan:
        return None
    pricer = build_pricer(settings)
    if pricer is None and allow_demo:
        pricer = DemoAmazonPricer()
    if pricer is None or not hasattr(pricer, "history_by_jan"):
        return None
    return pricer.history_by_jan(jan)


def _save_cache(db, jan, result):
    db.execute(
        """INSERT INTO amazon_prices (jan, asin, title, price, rank, source, fetched_at)
           VALUES (?,?,?,?,?,?,?)
           ON CONFLICT(jan) DO UPDATE SET asin=excluded.asin, title=excluded.title,
             price=excluded.price, rank=excluded.rank, source=excluded.source,
             fetched_at=excluded.fetched_at""",
        (
            jan,
            (result or {}).get("asin", ""),
            (result or {}).get("title", ""),
            (result or {}).get("price", 0),
            (result or {}).get("rank", 0),
            (result or {}).get("source", ""),
            datetime.datetime.now().isoformat(timespec="seconds"),
        ),
    )
    db.commit()
