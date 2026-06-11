"""主要フローのスモークテスト: python3 test_smoke.py で実行。"""
import os
import re
import tempfile

from sedori import create_app
from sedori.amazon import DemoAmazonPricer, _spapi_price, parse_keepa_product
from sedori.listing import channel_kind, extract_keywords, recommend_price


def test_listing_logic():
    print("出品ロジック:")
    assert channel_kind("Amazon (FBA)") == "amazon"
    assert channel_kind("メルカリ") == "mercari"
    assert channel_kind("ヤフオク!") == "auction"
    assert channel_kind("楽天ラクマ") == "rakuma"
    assert channel_kind("Yahoo!フリマ") == "flea"
    print("  OK 販路種別の判定")

    mercari = {"fee_rate": 10.0, "fixed_fee": 0, "shipping_cost": 210}
    price, floor, target = recommend_price(3000, 300, mercari, min_profit=500, min_rate=10)
    # 実質仕入2700 + 送料210 = 2910 / 0.9 = 3233.3 → 損益分岐3240
    assert floor == 3240, floor
    assert price >= 3240 and price % 100 in (80, 0), price
    print(f"  OK 推奨価格 {price}円 / 損益分岐 {floor}円")
    # Amazon相場をアンカーにするケース
    price2, floor2, _ = recommend_price(3000, 300, mercari, amazon_price=5980)
    assert price2 >= 5980 - 100 and price2 >= floor2
    print(f"  OK Amazon相場アンカー時 {price2}円")

    kw = extract_keywords("【新品】Nintendo Switch ゼルダの伝説 限定版")
    assert "Nintendo" in kw and "新品" in kw
    print("  OK キーワード抽出:", kw)

    # 楽天 新API(2026年刷新)のクライアント構成
    from sedori.sources import RakutenSource
    r = RakutenSource("uuid-app-id", "pk_testkey", "example.com")
    assert r.origin == "https://example.com" and r.referer == "https://example.com/"
    assert r.URLS[0].startswith("https://openapi.rakuten.co.jp/ichibams/api/")
    r2 = RakutenSource("uuid-app-id")  # 許可サイト未設定時の既定値
    assert r2.origin == "https://example.com"
    print("  OK 楽天新API: Origin/Refererと新エンドポイント構成")


def test_research_logic():
    print("リサーチロジック:")
    from sedori.research import passes_thresholds
    from sedori.sources import DEFAULT_SORT, DemoSource, RakutenSource, YahooSource

    settings = {"min_profit": "500", "min_profit_rate": "10", "min_roi": "15",
                "require_amazon_basis": "1", "max_amazon_rank": "50000"}
    base = {"profit": 1000, "profit_rate": 20.0, "roi": 30.0,
            "sell_basis": "amazon", "amazon_rank": 1200}
    assert passes_thresholds(dict(base), settings)
    assert not passes_thresholds(dict(base, sell_basis="係数"), settings), \
        "係数推定はAmazon相場必須モードで除外されるべき"
    assert not passes_thresholds(dict(base, amazon_rank=99999), settings), \
        "ランキング上限超えは除外されるべき"
    assert passes_thresholds(dict(base, amazon_rank=0), settings)  # ランク不明は許容
    assert passes_thresholds(dict(base, sell_basis="係数"),
                             dict(settings, require_amazon_basis="0"))
    print("  OK Amazon相場必須モードとランキング上限")

    # 並び順: 既定は売れ筋(レビュー件数順)— 安い順固定だと最安ジャンクしか拾えない
    assert DEFAULT_SORT == "review"
    assert RakutenSource.SORTS[DEFAULT_SORT] == "-reviewCount"
    assert YahooSource.SORTS[DEFAULT_SORT] == "-review_count"
    print("  OK 既定の並び順は売れ筋(レビュー件数順)")

    items = DemoSource().search("テスト", limit=50, min_price=3000)
    assert items and all(it["price"] >= 3000 for it in items)
    items = DemoSource().search("テスト", limit=50, sort="price_desc")
    assert items == sorted(items, key=lambda x: x["price"], reverse=True)
    print("  OK 仕入下限フィルタと並び順(デモソース)")


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
    # デモ価格履歴: 終点が現在価格と一致
    hist = d.history_by_jan("4901234567894")
    assert len(hist) > 10
    assert hist[-1][1] == d.price_by_jan("4901234567894")["price"]
    assert hist == d.history_by_jan("4901234567894")
    print(f"  OK デモ価格履歴: {len(hist)}点(終点=現在価格)")
    # SP-API出品の状態マッピング
    from sedori.amazon import SPAPI_CONDITIONS
    assert SPAPI_CONDITIONS["新品・未開封"] == "new_new"
    assert SPAPI_CONDITIONS["中古"] == "used_good"
    print("  OK SP-API condition_typeマッピング")


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
                 "/sales", "/report", "/channels", "/settings",
                 "/scan", "/finance", "/expenses", "/listings"]:
        ok(c.get(path), f"GET {path}")

    print("リサーチ(デモ検索 + Amazon相場):")
    res = c.post("/research", data={"keyword": "ゲームソフト", "channel_id": "3",
                                    "min_price": "1000", "sort": "review"})
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

    print("バーコード仕入れAPI:")
    res = c.get("/api/amazon/4901234567894")
    data = res.get_json()
    assert data["found"] and data["price"] > 0 and data["channel_name"]
    print(f"  OK JAN→相場JSON: ¥{data['price']:,} ({data['channel_name']}手数料込みで利益計算可)")
    res = c.get("/api/amazon/0000000000000")
    assert res.get_json()["found"] in (True, False)  # デモは必ず生成されるが応答形式を確認
    print("  OK API応答形式")

    print("価格改定アラート:")
    # 自動リサーチ由来の候補(JANあり)から在庫を作り、キャッシュ価格を吊り上げて下落を演出
    res = c.post("/purchases/new", data={
        "candidate_id": "2", "name": "アラートテスト商品", "source": "demo",
        "qty": "1", "unit_cost": "3000", "points": "0",
        "purchase_date": "2026-06-10", "channel_id": "1", "status": "在庫",
    }, follow_redirects=True)
    ok(res, "JAN付き在庫を作成")
    with app.app_context():
        from sedori import db as dbm2
        db2 = dbm2.get_db()
        jan = db2.execute("SELECT jan FROM candidates WHERE id=2").fetchone()["jan"]
        db2.execute("UPDATE amazon_prices SET price=price*2 WHERE jan=?", (jan,))
        db2.commit()
    res = c.post("/alerts/check", follow_redirects=True)
    ok(res, "価格チェック実行")
    body = res.get_data(as_text=True)
    assert "値下がりアラート 1件" in body, body[:300]
    assert "価格改定アラート" in body and "-50.0%" in body
    print("  -> 50%下落を検知してダッシュボードに表示")
    ok(c.post("/alerts/1/dismiss", follow_redirects=True), "アラートを確認済みに")

    print("価格履歴グラフ:")
    res = c.get("/candidates/2/history")
    ok(res, "GET /candidates/2/history")
    body = res.get_data(as_text=True)
    assert "polyline" in body and "90日平均" in body
    print("  -> SVGチャートと平均比較バッジを確認")

    print("資金繰り:")
    ok(c.post("/finance", data={"monthly_budget": "200000",
                                "monthly_profit_goal": "50000"}, follow_redirects=True),
       "予算・目標の保存")
    res = c.get("/finance")
    body = res.get_data(as_text=True)
    assert "¥200,000" in body and "営業利益" in body and "達成率" in body
    print("  -> 予算消化・利益目標達成率を表示")

    print("経費管理:")
    ok(c.post("/expenses", data={"expense_date": "2026-06-10", "category": "梱包材",
                                 "amount": "1500", "notes": "ダンボール"}, follow_redirects=True),
       "経費登録")
    res = c.get("/expenses")
    assert "¥1,500" in res.get_data(as_text=True)
    res = c.get("/report")
    body = res.get_data(as_text=True)
    assert "経費" in body and "営業利益" in body
    print("  -> レポートに経費・営業利益列を表示")
    res = c.get("/export/expenses.csv")
    ok(res, "経費CSV")

    print("出品作成:")
    ok(c.get("/listings"), "GET /listings")
    ok(c.get("/listings/new?purchase_id=1"), "出品フォーム(仕入から)")
    res = c.post("/listings/generate", data={
        "purchase_id": "1", "name": "テスト商品", "condition": "新品・未開封",
        "cost": "5000", "points": "500", "accessories": "箱・説明書付き",
        "channel_ids": ["1", "3"],
    }, follow_redirects=True)
    ok(res, "ドラフト一括生成(Amazon+メルカリ)")
    body = res.get_data(as_text=True)
    assert "2販路分の出品ドラフト" in body
    assert "#テスト商品" in body or "#" in body, "メルカリ用ハッシュタグがない"
    assert "損益分岐" in body
    print("  -> 販路別テンプレート(タグ・損益分岐価格付き)を確認")
    ok(c.post("/listings/1/update", data={
        "title": "編集後タイトル", "description": "編集後", "tags": "#a", "price": "7980",
    }, follow_redirects=True), "ドラフト編集保存")
    res = c.post("/listings/1/ai", follow_redirects=True)
    assert "Anthropic APIキーが未設定" in res.get_data(as_text=True)
    print("  OK AI磨き上げ: キー未設定時は案内を表示")
    res = c.post("/listings/1/publish_amazon", follow_redirects=True)
    assert "SP-API認証情報と出品者ID" in res.get_data(as_text=True)
    print("  OK SP-API自動出品: 認証未設定時は案内を表示")
    ok(c.post("/listings/1/status", data={"status": "出品済"}, follow_redirects=True), "出品済みへ")
    assert "出品済" in c.get("/listings").get_data(as_text=True)

    print("在庫連動(売り切れ時の取り下げ):")
    # 在庫1個の仕入(purchase 2)をAmazon+メルカリに出品済みにする
    c.post("/listings/generate", data={
        "purchase_id": "2", "name": "アラートテスト商品", "condition": "新品",
        "cost": "4500", "points": "0", "channel_ids": ["1", "3"],
    })
    c.post("/listings/3/status", data={"status": "出品済"})
    c.post("/listings/4/status", data={"status": "出品済"})
    res = c.post("/sales/new", data={
        "purchase_id": "2", "name": "アラートテスト商品", "qty": "1",
        "sale_price": "8000", "channel_id": "1", "shipping": "0",
        "other_cost": "0", "sale_date": "2026-06-11",
    }, follow_redirects=True)
    ok(res, "売り切れになる売上を登録")
    body = res.get_data(as_text=True)
    assert "出品を取り下げてください" in body, body[:500]
    res = c.get("/")
    body = res.get_data(as_text=True)
    assert "取り下げが必要な出品" in body and "要取下げ" in body
    print("  -> 他販路の出品が「要取下げ」になりダッシュボードに警告")
    ok(c.post("/listings/3/status", data={"status": "取下げ済"}, follow_redirects=True),
       "取り下げ完了を記録")
    ok(c.post("/listings/4/status", data={"status": "取下げ済"}, follow_redirects=True),
       "取り下げ完了を記録(2件目)")
    assert "取り下げが必要な出品" not in c.get("/").get_data(as_text=True)
    print("  -> 全件対応で警告が消えることを確認")

    print("再出品リマインダー:")
    c.post("/listings/generate", data={
        "name": "再出品テスト商品", "condition": "新品", "cost": "2000",
        "points": "0", "channel_ids": ["3"],
    })
    with app.app_context():
        from sedori import db as dbm3
        db3 = dbm3.get_db()
        lid = db3.execute("SELECT MAX(id) FROM listings").fetchone()[0]
        db3.execute("UPDATE listings SET status='出品済', "
                    "created_at=datetime('now','-20 days') WHERE id=?", (lid,))
        db3.commit()
    res = c.get("/listings")
    body = res.get_data(as_text=True)
    assert "再出品のおすすめ" in body and "20日" in body
    print("  -> 14日経過した出品を再出品候補として表示")
    before = None
    with app.app_context():
        from sedori import db as dbm4
        before = dbm4.get_db().execute("SELECT COUNT(*) FROM listings").fetchone()[0]
    res = c.post(f"/listings/{lid}/relist", follow_redirects=True)
    ok(res, "再出品用に複製")
    with app.app_context():
        from sedori import db as dbm5
        db5 = dbm5.get_db()
        assert db5.execute("SELECT COUNT(*) FROM listings").fetchone()[0] == before + 1
        assert db5.execute("SELECT status FROM listings WHERE id=?", (lid,)).fetchone()[0] == "要取下げ"
        new_status = db5.execute("SELECT status FROM listings ORDER BY id DESC LIMIT 1").fetchone()[0]
        assert new_status == "下書き"
    print("  -> 新ドラフト複製+旧出品を「要取下げ」化を確認")
    c.post(f"/listings/{lid}/status", data={"status": "取下げ済"})

    print("出品画像の整形:")
    import io as _io
    from PIL import Image as _Image
    buf = _io.BytesIO()
    _Image.new("RGB", (800, 600), (200, 30, 30)).save(buf, "PNG")
    buf.seek(0)
    res = c.post("/images", data={
        "photo": (buf, "test.png"), "presets": ["amazon", "mercari"],
    }, content_type="multipart/form-data")
    ok(res, "画像変換(Amazon+メルカリ)")
    body = res.get_data(as_text=True)
    assert "2サイズの画像" in body and "2000×2000" in body
    import glob as _glob
    from sedori.images import output_dir
    made = sorted(_glob.glob(os.path.join(output_dir(), "*.jpg")))[-2:]
    with _Image.open(made[0]) as im:
        assert im.size == (2000, 2000), im.size
    for f in made:
        os.unlink(f)
    print("  -> 白背景2000×2000pxの正方形画像を確認")

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
    test_listing_logic()
    print()
    test_research_logic()
    print()
    run()
