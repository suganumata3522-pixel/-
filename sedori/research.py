"""利益商品リサーチエンジン。

各仕入元を横断検索し、想定売価(Amazon相場があればそれを優先、なければ係数推定)と
販路手数料から利益を試算。しきい値(最低利益額・利益率・ROI)を超える商品を
利益商品として抽出する。
"""
import time

from . import amazon
from . import db as dbm
from . import profit, timing
from .sources import SourceError, build_sources


def estimate_sell_price(cost, settings):
    """想定売価 = 仕入価格 × 係数(100円単位に丸め)。実運用では相場を上書き入力する。"""
    multiplier = float(settings.get("sell_multiplier", "1.35") or 1.35)
    return int(round(cost * multiplier / 100)) * 100


def attach_sell_price(item, settings, pricer, errors):
    """商品にAmazon相場ベースの想定売価を付与する。取れなければ係数推定。"""
    az = None
    if item.get("jan"):
        try:
            az = amazon.get_price(
                item["jan"], settings, pricer=pricer,
                allow_demo=(item["source"] == "demo"),
            )
        except amazon.AmazonPriceError as e:
            if str(e) not in errors:
                errors.append(str(e))
    if az and az.get("price", 0) > 0:
        item.update({
            "sell_price": az["price"],
            "sell_basis": "amazon",
            "asin": az.get("asin", ""),
            "amazon_rank": az.get("rank", 0),
        })
    else:
        item.update({
            "sell_price": estimate_sell_price(item["price"], settings),
            "sell_basis": "係数",
            "asin": "",
            "amazon_rank": 0,
        })


def search(keyword, settings, channel, limit=20, max_price=0):
    """キーワード検索 → 利益試算付きの結果リストと、ソースごとのエラーを返す。"""
    results, errors = [], []
    pricer = amazon.build_pricer(settings)
    for src in build_sources(settings):
        try:
            items = src.search(keyword, limit=limit, max_price=max_price)
        except SourceError as e:
            errors.append(str(e))
            continue
        for it in items:
            attach_sell_price(it, settings, pricer, errors)
            p = profit.calc_with_channel(it["sell_price"], it["price"], channel,
                                         point_rate=it["point_rate"])
            it.update({
                "source_label": src.label,
                "profit": p["profit"],
                "profit_rate": p["profit_rate"],
                "roi": p["roi"],
            })
            results.append(it)
    results.sort(key=lambda x: x["profit"], reverse=True)
    return results, errors


def passes_thresholds(item, settings):
    return (
        item["profit"] >= int(settings.get("min_profit", "500") or 0)
        and item["profit_rate"] >= float(settings.get("min_profit_rate", "10") or 0)
        and item["roi"] >= float(settings.get("min_roi", "15") or 0)
    )


def run_auto(settings, channel):
    """保存済み検索キーワードを一括実行し、しきい値を超えた商品を候補登録する。

    戻り値: (登録件数, スキャン件数, エラーリスト)
    """
    db = dbm.get_db()
    searches = db.execute(
        "SELECT * FROM saved_searches WHERE enabled=1 ORDER BY id"
    ).fetchall()
    added, scanned, all_errors = 0, 0, []
    real_api = bool(settings.get("rakuten_app_id") or settings.get("yahoo_app_id"))
    for i, s in enumerate(searches):
        if real_api and i > 0:
            time.sleep(1.5)  # 連続リクエストによる429(レート制限)を防ぐ
        items, errors = search(s["keyword"], settings, channel, limit=20, max_price=s["max_price"])
        all_errors.extend(errors)
        scanned += len(items)
        for it in items:
            if not passes_thresholds(it, settings):
                continue
            exists = db.execute(
                "SELECT 1 FROM candidates WHERE url=? AND url<>''", (it["url"],)
            ).fetchone()
            if exists:
                continue
            best = timing.best_buy_date(it["source"])
            db.execute(
                """INSERT INTO candidates
                   (name, jan, source, url, shop, cost, sell_price, channel_id,
                    point_rate, profit, profit_rate, roi, buy_date, buy_reason,
                    asin, sell_basis, amazon_rank)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    it["name"], it["jan"], it["source"], it["url"], it["shop"],
                    it["price"], it["sell_price"], channel["id"],
                    it["point_rate"], it["profit"], it["profit_rate"], it["roi"],
                    best["date_str"] if best else "",
                    " / ".join(best["reasons"]) if best else "",
                    it.get("asin", ""), it.get("sell_basis", ""), it.get("amazon_rank", 0),
                ),
            )
            added += 1
    db.commit()
    return added, scanned, all_errors
