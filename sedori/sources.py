"""仕入元データソース。

楽天市場 / Yahoo!ショッピング の商品検索APIコネクタと、APIキー未設定時に
動作確認できるデモソースを提供する。各ソースは search() で
{name, price, url, shop, jan, source, point_rate} のリストを返す。
"""
import hashlib
import random

import requests

TIMEOUT = 10


class SourceError(Exception):
    pass


class RakutenSource:
    name = "rakuten"
    label = "楽天市場"
    # 2026年2月のAPI刷新後のエンドポイント(新バージョン→旧バージョンの順に試行)
    URLS = [
        "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401",
        "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601",
    ]

    def __init__(self, app_id, access_key="", allowed_site=""):
        self.app_id = app_id
        self.access_key = (access_key or "").strip()
        site = (allowed_site or "https://example.com").strip().rstrip("/")
        if not site.startswith("http"):
            site = "https://" + site
        # 新APIは「許可されたウェブサイト」に登録したドメインを
        # Origin/Refererヘッダーで名乗る必要がある
        self.origin = site
        self.referer = site + "/"

    def search(self, keyword, limit=20, max_price=0):
        params = {
            "applicationId": self.app_id,
            "keyword": keyword,
            "hits": min(limit, 30),
            "sort": "+itemPrice",
            "availability": 1,
        }
        if self.access_key:
            params["accessKey"] = self.access_key
        if max_price:
            params["maxPrice"] = max_price
        headers = {
            "Referer": self.referer,
            "Origin": self.origin,
            "User-Agent": "Mozilla/5.0 (sedori-tool)",
        }
        last_err = ""
        for url in self.URLS:
            try:
                res = requests.get(url, params=params, headers=headers, timeout=TIMEOUT)
            except requests.RequestException as e:
                raise SourceError(f"楽天API エラー: {e}")
            if res.status_code == 404:
                last_err = "エンドポイントが見つかりません"
                continue  # 旧バージョンのパスを試す
            try:
                data = res.json()
            except ValueError:
                raise SourceError(f"楽天API エラー: 応答を解析できません({res.status_code})")
            if res.status_code != 200:
                detail = (data.get("error_description") or data.get("error")
                          or f"HTTP {res.status_code}")
                if res.status_code in (401, 403):
                    hint = "(設定の「楽天アクセスキー(pk_...)」と「楽天 許可ウェブサイト」が、楽天に登録した内容と一致しているか確認してください)"
                elif res.status_code == 400:
                    hint = "(楽天アプリIDとアクセスキーの貼り間違い・空白混入がないか確認してください)"
                elif res.status_code == 429:
                    hint = "(リクエストが多すぎます。少し待ってから再実行してください)"
                else:
                    hint = ""
                raise SourceError(f"楽天API エラー: {detail} {hint}")
            items = []
            for wrap in data.get("Items", []):
                it = wrap.get("Item", wrap) if isinstance(wrap, dict) else wrap
                items.append({
                    "name": it.get("itemName", ""),
                    "price": int(it.get("itemPrice", 0)),
                    "url": it.get("itemUrl", ""),
                    "shop": it.get("shopName", ""),
                    "jan": "",
                    "source": self.name,
                    "point_rate": float(it.get("pointRate", 1) or 1),
                })
            return items
        raise SourceError(f"楽天API エラー: {last_err}")


class YahooSource:
    name = "yahoo"
    label = "Yahoo!ショッピング"
    URL = "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch"

    def __init__(self, app_id):
        self.app_id = app_id

    def search(self, keyword, limit=20, max_price=0):
        params = {
            "appid": self.app_id,
            "query": keyword,
            "results": min(limit, 50),
            "sort": "+price",
            "in_stock": "true",
        }
        if max_price:
            params["price_to"] = max_price
        try:
            res = requests.get(self.URL, params=params, timeout=TIMEOUT)
            res.raise_for_status()
            data = res.json()
        except (requests.RequestException, ValueError) as e:
            raise SourceError(f"Yahoo!ショッピングAPI エラー: {e}")
        items = []
        for it in data.get("hits", []):
            items.append({
                "name": it.get("name", ""),
                "price": int(it.get("price", 0)),
                "url": it.get("url", ""),
                "shop": (it.get("seller") or {}).get("name", ""),
                "jan": it.get("janCode", "") or "",
                "source": self.name,
                "point_rate": 1.0,
            })
        return items


class DemoSource:
    """APIキー未設定でも動作確認できる擬似データソース。

    キーワードから決定的に商品リストを生成する(同じキーワードなら同じ結果)。
    """
    name = "demo"
    label = "デモデータ"

    CATEGORIES = ["限定版", "新品未開封", "中古美品", "セット品", "訳あり特価"]
    SHOPS = ["デモ商店A", "デモ商店B", "アウトレットC", "ホビーショップD"]

    def search(self, keyword, limit=20, max_price=0):
        seed = int(hashlib.md5(keyword.encode("utf-8")).hexdigest(), 16) % (2 ** 32)
        rng = random.Random(seed)
        items = []
        for i in range(limit):
            base = rng.randint(800, 18000)
            price = int(base / 100) * 100 + rng.choice([0, 80, 99])
            if max_price and price > max_price:
                continue
            items.append({
                "name": f"{keyword} {rng.choice(self.CATEGORIES)} #{i + 1}",
                "price": price,
                "url": f"https://example.com/demo/{seed}/{i + 1}",
                "shop": rng.choice(self.SHOPS),
                "jan": f"49{rng.randint(10 ** 10, 10 ** 11 - 1)}",
                "source": self.name,
                "point_rate": float(rng.choice([1, 1, 2, 5, 10])),
            })
        return items


def build_sources(settings):
    """設定からアクティブなソース一覧を構築する。APIキーが1つもなければデモのみ。"""
    sources = []
    if settings.get("rakuten_app_id"):
        sources.append(RakutenSource(
            settings["rakuten_app_id"],
            settings.get("rakuten_access_key", ""),
            settings.get("rakuten_allowed_site", ""),
        ))
    if settings.get("yahoo_app_id"):
        sources.append(YahooSource(settings["yahoo_app_id"]))
    if not sources:
        sources.append(DemoSource())
    return sources
