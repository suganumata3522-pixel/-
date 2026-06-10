"""主要フローのスモークテスト: python3 test_smoke.py で実行。"""
import os
import re
import tempfile

from sedori import create_app
from sedori.amazon import DemoAmazonPricer, _spapi_price, parse_keepa_product


def test_amazon_parsers():
    print("Amazon応答パース:")
    # Keepa: current[18]=カート価格 が優先される
    p = parse_keepa_product({
        "asin": "B000TEST01", "title": "テスト商品",
        "stats": {"current": [3000, 2800, -1, 1234] + [-1] * 14 + [2980]},
    })
    assert p == {"price": 2980, "rank": 1234, "asin": "B000TEST01",
                 "title": "テスト商品", "source": "keepa"}, p
    print("  OK Keepa: カート価格 2,980円 / ランク 1,234位")
    # Keepa: カートなし→新品最安にフォールバック、価格なし→None
    p = parse_keepa_product({"asin": "A", "stats": {"current": [-1, 2800, -1, 50]}})
    assert p["price"] == 2800
    assert parse_keepa_product({"asin": "A", "stats": {"current": [-1, -1]}}) is None
    print("  OK Keepa: フォールバックと欠損処理")
    # SP-API: BuyBoxPrices優先、なければLowestPrices
    assert _spapi_price({"BuyBoxPrices": [{"LandedPrice": {"Amount": 4980.0}}]}) == 4980
    assert _spapi_price({"LowestPrices": [{"LandedPrice": {"Amount": 4500.0}}]}) == 4500
    assert _spapi_price({}) == 0
    print("  OK SP-API: LandedPrice抽出")
    # デモ相場は決定的
    d = DemoAmazonPricer()
    assert d.price_by_jan("4901234567894") == d.price_by_jan("4901234567894")
    print("  OK デモ相場: 決定的生成")


def run():
    fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    app = create_app(db_path=db_path)
    app.config["TESTING"] = True
    c = app.test_client()

    def ok(res, label, code=200):
        assert res.status_code in (code, 302), f"{label}: HTTP {res.status_code}"
        print(f"  OK {label}")

    print("ページ表示:")
    for path in ["/", "/research", "/candidates", "/timing", "/purchases",
                 "/sales", "/report", "/channels", "/settings"]:
        ok(c.get(path), f"GET {path}")

    print("リサーチ(デモ検索 + Amazon相場):")
    res = c.post("/research", data={"keyword": "ゲームソフト", "channel_id": "3"})
    ok(res, "POST /research")
    body = res.get_data(as_text=True)
    assert "候補登録" in body
    assert "Amazon相場" in body, "デモ商品(JANあり)にAmazon相場が付与されていない"
    assert "ランク" in body
    print("  -> 想定売価にAmazon相場(デモ)とランキングを表示")

    print("Amazon相場の単体検索とキャッシュ:")
    res = c.post("/amazon/lookup", data={"jan": "4901234567894"}, follow_redirects=True)
    ok(res, "JAN単体検索")
    assert "Amazon相場: ¥" in res.get_data(as_text=True)
    with app.app_context():
        from sedori import amazon as az_mod
        from sedori import db as dbm
        cached = az_mod.get_price("4901234567894", dbm.get_settings(), allow_demo=True)
        assert cached and cached.get("cached"), "2回目の取得がキャッシュから返っていない"
    print("  -> 2回目はキャッシュから取得")

    print("自動リサーチ:")
    ok(c.post("/searches/add", data={"keyword": "フィギュア", "max_price": "0"}), "キーワード追加")
    res = c.post("/searches/run", follow_redirects=True)
    ok(res, "一括実行")
    body = res.get_data(as_text=True)
    m = re.search(r"(\d+)件スキャン / (\d+)件を候補登録", body)
    assert m, "自動リサーチの結果メッセージが見つからない"
    print(f"  -> {m.group(0)}")

    print("候補→仕入→売上:")
    res = c.post("/research/candidate", data={
        "name": "テスト商品", "source": "rakuten", "cost": "5000",
        "sell_price": "9000", "point_rate": "10", "channel_id": "1",
    }, follow_redirects=True)
    ok(res, "候補登録")
    res = c.get("/candidates")
    assert "テスト商品" in res.get_data(as_text=True)
    assert "推奨購入日" in res.get_data(as_text=True)

    ok(c.get("/purchases/new?candidate_id=1"), "仕入フォーム(候補から)")
    res = c.post("/purchases/new", data={
        "candidate_id": "1", "name": "テスト商品", "source": "rakuten",
        "qty": "2", "unit_cost": "5000", "points": "1000",
        "purchase_date": "2026-06-10", "channel_id": "1", "status": "在庫",
    }, follow_redirects=True)
    ok(res, "仕入登録")

    res = c.post("/sales/new", data={
        "purchase_id": "1", "name": "テスト商品", "qty": "1",
        "sale_price": "9000", "channel_id": "1", "shipping": "0",
        "other_cost": "0", "sale_date": "2026-06-10",
    }, follow_redirects=True)
    ok(res, "売上登録(1個)")
    body = res.get_data(as_text=True)
    # 期待値: 9000 - (9000*15%+500) - (5000-500) = 2650
    assert "2,650" in body, "純利益の自動計算が想定と違う: " + body[:200]
    print("  -> 純利益 2,650円(手数料15%+500円、pt按分500円控除)を確認")

    res = c.post("/sales/new", data={
        "purchase_id": "1", "name": "テスト商品", "qty": "1",
        "sale_price": "9000", "channel_id": "1", "shipping": "0",
        "other_cost": "0", "sale_date": "2026-06-11",
    }, follow_redirects=True)
    ok(res, "売上登録(残り全部→売却済へ)")
    res = c.get("/purchases")
    assert "売却済" in res.get_data(as_text=True)
    print("  -> 仕入が自動で「売却済」に更新")

    print("レポート/CSV:")
    res = c.get("/report")
    ok(res, "GET /report")
    assert "販路別実績" in res.get_data(as_text=True)
    res = c.get("/export/sales.csv")
    ok(res, "売上CSV")
    assert "純利益" in res.get_data(as_text=True)
    res = c.get("/export/purchases.csv")
    ok(res, "仕入CSV")

    print("販路設定/設定:")
    ok(c.post("/channels", data={"name": "eBay", "fee_rate": "13", "fixed_fee": "0",
                                 "shipping_cost": "2000", "notes": "輸出"}), "販路追加")
    ok(c.post("/channels/7/update", data={"name": "eBay", "fee_rate": "13.25", "fixed_fee": "30",
                                          "shipping_cost": "2000", "notes": "輸出", "active": "1"}), "販路更新")
    ok(c.post("/settings", data={"rakuten_app_id": "", "yahoo_app_id": "",
                                 "min_profit": "800", "min_profit_rate": "12", "min_roi": "20",
                                 "sell_multiplier": "1.4", "default_channel_id": "3",
                                 "base_point_rate": "1"}), "設定保存")
    res = c.get("/settings")
    assert 'value="800"' in res.get_data(as_text=True)

    print("購入日判断:")
    res = c.get("/timing")
    body = res.get_data(as_text=True)
    assert "5と0のつく日" in body or "5のつく日" in body
    print("  OK イベントカレンダー表示")

    os.unlink(db_path)
    print("\n✅ 全スモークテスト合格")


if __name__ == "__main__":
    test_amazon_parsers()
    print()
    run()
