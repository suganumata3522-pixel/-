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
    URL = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601"

    def __init__(self, app_id):
        self.app_id = app_id

    def search(self, keyword, limit=20, max_price=0):
        params = {
            "applicationId": self.app_id,
            "keyword": keyword,
            "hits": min(limit, 30),
            "sort": "+itemPrice",
            "availability": 1,
        }
        if max_price:
            params["maxPrice"] = max_price
        try:
            res = requests.get(self.URL, params=params, timeout=TIMEOUT)
            res.raise_for_status()
            data = res.json()
        except (requests.RequestException, ValueError) as e:
            raise SourceError(f"楽天API エラー: {e}")
        items = []
        for wrap in data.get("Items", []):
            it = wrap.get("Item", wrap)
            items.append({
                "name": it.get("itemName", ""),
                "price": int(it.get("itemPrice", 0)),
                "url": it.get("itemUrl", ""),
                "shop": it.get("shopName", ""),
                "jan": "",
                "source": self.name,
                "point_rate": float(it.get("pointRate", 1)),
            })
        return items


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
        sources.append(RakutenSource(settings["rakuten_app_id"]))
    if settings.get("yahoo_app_id"):
        sources.append(YahooSource(settings["yahoo_app_id"]))
    if not sources:
        sources.append(DemoSource())
    return sources
