import csv
import datetime
import io

from flask import (
    Blueprint, Response, flash, jsonify, redirect, render_template, request,
    url_for,
)

from . import amazon
from . import db as dbm
from . import images, listing, profit, research, timing

bp = Blueprint("main", __name__)


def _channels(active_only=False):
    q = "SELECT * FROM channels"
    if active_only:
        q += " WHERE active=1"
    return dbm.get_db().execute(q + " ORDER BY id").fetchall()


def _channel(cid):
    return dbm.get_db().execute("SELECT * FROM channels WHERE id=?", (cid,)).fetchone()


def _int(value, default=0):
    try:
        return int(float(str(value).replace(",", "").strip()))
    except (TypeError, ValueError):
        return default


def _float(value, default=0.0):
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return default


def _today():
    return datetime.date.today().isoformat()


# ---------------- ダッシュボード ----------------

@bp.route("/")
def dashboard():
    db = dbm.get_db()
    month = _today()[:7]
    kpi = {
        "month": month,
        "revenue": db.execute(
            "SELECT COALESCE(SUM(sale_price*qty),0) FROM sales WHERE substr(sale_date,1,7)=?", (month,)
        ).fetchone()[0],
        "profit": db.execute(
            "SELECT COALESCE(SUM(net_profit),0) FROM sales WHERE substr(sale_date,1,7)=?", (month,)
        ).fetchone()[0],
        "spend": db.execute(
            "SELECT COALESCE(SUM(total_cost),0) FROM purchases WHERE substr(purchase_date,1,7)=?", (month,)
        ).fetchone()[0],
        "stock_count": db.execute(
            "SELECT COUNT(*) FROM purchases WHERE status<>'売却済'"
        ).fetchone()[0],
        "stock_cost": db.execute(
            "SELECT COALESCE(SUM(total_cost),0) FROM purchases WHERE status<>'売却済'"
        ).fetchone()[0],
        "candidates": db.execute(
            "SELECT COUNT(*) FROM candidates WHERE status IN ('候補','仕入予定')"
        ).fetchone()[0],
    }
    monthly = db.execute(
        """SELECT substr(sale_date,1,7) AS ym,
                  SUM(sale_price*qty) AS revenue, SUM(net_profit) AS profit
           FROM sales GROUP BY ym ORDER BY ym DESC LIMIT 6"""
    ).fetchall()
    recent_sales = db.execute(
        "SELECT s.*, c.name AS channel_name FROM sales s "
        "LEFT JOIN channels c ON c.id=s.channel_id ORDER BY s.sale_date DESC, s.id DESC LIMIT 5"
    ).fetchall()
    best_rakuten = timing.best_buy_date("rakuten")
    best_yahoo = timing.best_buy_date("yahoo")
    alerts = db.execute(
        "SELECT * FROM price_alerts WHERE dismissed=0 ORDER BY id DESC LIMIT 10"
    ).fetchall()
    takedowns = db.execute(
        "SELECT l.*, ch.name AS channel_name FROM listings l "
        "LEFT JOIN channels ch ON ch.id=l.channel_id "
        "WHERE l.status='要取下げ' ORDER BY l.id DESC"
    ).fetchall()
    return render_template(
        "dashboard.html", kpi=kpi, monthly=monthly, recent_sales=recent_sales,
        best_rakuten=best_rakuten, best_yahoo=best_yahoo, alerts=alerts,
        takedowns=takedowns,
    )


# ---------------- 商品リサーチ ----------------

@bp.route("/research", methods=["GET", "POST"])
def research_view():
    db = dbm.get_db()
    settings = dbm.get_settings()
    channels = _channels(active_only=True)
    results, errors, keyword = [], [], ""
    channel = dbm.default_channel(settings)
    only_hit = False
    if request.method == "POST":
        keyword = request.form.get("keyword", "").strip()
        max_price = _int(request.form.get("max_price"))
        only_hit = request.form.get("only_hit") == "1"
        cid = request.form.get("channel_id")
        if cid and _channel(cid):
            channel = _channel(cid)
        if keyword:
            results, errors = research.search(keyword, settings, channel, limit=20, max_price=max_price)
            for it in results:
                it["hit"] = research.passes_thresholds(it, settings)
            if only_hit:
                results = [it for it in results if it["hit"]]
        else:
            flash("キーワードを入力してください", "error")
    searches = db.execute("SELECT * FROM saved_searches ORDER BY id DESC").fetchall()
    demo_mode = not settings.get("rakuten_app_id") and not settings.get("yahoo_app_id")
    return render_template(
        "research.html", results=results, errors=errors, keyword=keyword,
        channels=channels, channel=channel, searches=searches,
        settings=settings, demo_mode=demo_mode, only_hit=only_hit,
    )


@bp.route("/research/candidate", methods=["POST"])
def add_candidate():
    f = request.form
    cost = _int(f.get("cost"))
    sell = _int(f.get("sell_price"))
    point_rate = _float(f.get("point_rate"))
    channel = _channel(f.get("channel_id")) or dbm.default_channel()
    p = profit.calc_with_channel(sell, cost, channel, point_rate=point_rate)
    best = timing.best_buy_date(f.get("source") or None)
    dbm.get_db().execute(
        """INSERT INTO candidates
           (name, jan, source, url, shop, cost, sell_price, channel_id, point_rate,
            profit, profit_rate, roi, buy_date, buy_reason, asin, sell_basis, amazon_rank)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            f.get("name", ""), f.get("jan", ""), f.get("source", "manual"),
            f.get("url", ""), f.get("shop", ""), cost, sell, channel["id"], point_rate,
            p["profit"], p["profit_rate"], p["roi"],
            best["date_str"] if best else "",
            " / ".join(best["reasons"]) if best else "",
            f.get("asin", ""), f.get("sell_basis", ""), _int(f.get("amazon_rank")),
        ),
    )
    dbm.get_db().commit()
    flash(f"候補に登録しました: {f.get('name','')}", "success")
    return redirect(request.referrer or url_for("main.candidates"))


@bp.route("/amazon/lookup", methods=["POST"])
def amazon_lookup():
    """JANコード単体でAmazon相場を調べる(楽天商品などJANが取れない時の手動確認用)。"""
    jan = request.form.get("jan", "").strip()
    if not jan:
        flash("JANコードを入力してください", "error")
        return redirect(url_for("main.research_view"))
    settings = dbm.get_settings()
    demo_mode = not settings.get("rakuten_app_id") and not settings.get("yahoo_app_id")
    try:
        az = amazon.get_price(jan, settings, allow_demo=demo_mode)
    except amazon.AmazonPriceError as e:
        flash(str(e), "error")
        return redirect(url_for("main.research_view"))
    if not az:
        if not amazon.build_pricer(settings) and not demo_mode:
            flash("Keepa APIキーまたはSP-API認証情報を設定してください(設定画面)", "error")
        else:
            flash(f"JAN {jan} のAmazon商品が見つかりませんでした", "error")
    else:
        rank = f" / ランキング {az['rank']:,}位" if az.get("rank") else ""
        title = f" / {az['title']}" if az.get("title") else ""
        flash(f"Amazon相場: ¥{az['price']:,}(ASIN: {az['asin']}{rank}{title})", "success")
    return redirect(url_for("main.research_view"))


@bp.route("/searches/add", methods=["POST"])
def add_search():
    keyword = request.form.get("keyword", "").strip()
    if keyword:
        dbm.get_db().execute(
            "INSERT INTO saved_searches (keyword, max_price) VALUES (?,?)",
            (keyword, _int(request.form.get("max_price"))),
        )
        dbm.get_db().commit()
        flash(f"自動検索キーワードを追加しました: {keyword}", "success")
    return redirect(url_for("main.research_view"))


@bp.route("/searches/<int:sid>/toggle", methods=["POST"])
def toggle_search(sid):
    dbm.get_db().execute("UPDATE saved_searches SET enabled=1-enabled WHERE id=?", (sid,))
    dbm.get_db().commit()
    return redirect(url_for("main.research_view"))


@bp.route("/searches/<int:sid>/delete", methods=["POST"])
def delete_search(sid):
    dbm.get_db().execute("DELETE FROM saved_searches WHERE id=?", (sid,))
    dbm.get_db().commit()
    return redirect(url_for("main.research_view"))


@bp.route("/searches/run", methods=["POST"])
def run_auto():
    settings = dbm.get_settings()
    channel = dbm.default_channel(settings)
    added, scanned, errors = research.run_auto(settings, channel)
    for e in errors:
        flash(e, "error")
    flash(f"自動リサーチ完了: {scanned}件スキャン / {added}件を候補登録", "success")
    return redirect(url_for("main.candidates"))


# ---------------- 候補商品 ----------------

@bp.route("/candidates")
def candidates():
    status = request.args.get("status", "")
    db = dbm.get_db()
    q = ("SELECT cd.*, ch.name AS channel_name FROM candidates cd "
         "LEFT JOIN channels ch ON ch.id=cd.channel_id")
    args = ()
    if status:
        q += " WHERE cd.status=?"
        args = (status,)
    q += " ORDER BY cd.profit DESC, cd.id DESC"
    rows = db.execute(q, args).fetchall()
    return render_template("candidates.html", rows=rows, status=status)


@bp.route("/candidates/<int:cid>/status", methods=["POST"])
def candidate_status(cid):
    status = request.form.get("status", "候補")
    if status in ("候補", "仕入予定", "仕入済", "見送り"):
        dbm.get_db().execute("UPDATE candidates SET status=? WHERE id=?", (status, cid))
        dbm.get_db().commit()
    return redirect(request.referrer or url_for("main.candidates"))


@bp.route("/candidates/<int:cid>/delete", methods=["POST"])
def candidate_delete(cid):
    dbm.get_db().execute("DELETE FROM candidates WHERE id=?", (cid,))
    dbm.get_db().commit()
    return redirect(url_for("main.candidates"))


# ---------------- 購入日判断 ----------------

@bp.route("/timing")
def timing_view():
    days = _int(request.args.get("days"), 30) or 30
    cal = timing.calendar(days=days)
    best_rakuten = timing.best_buy_date("rakuten", days=days)
    best_yahoo = timing.best_buy_date("yahoo", days=days)
    pending = dbm.get_db().execute(
        "SELECT * FROM candidates WHERE status IN ('候補','仕入予定') ORDER BY buy_date, profit DESC"
    ).fetchall()
    return render_template(
        "timing.html", cal=cal, days=days,
        best_rakuten=best_rakuten, best_yahoo=best_yahoo, pending=pending,
    )


# ---------------- 仕入管理 ----------------

@bp.route("/purchases")
def purchases():
    rows = dbm.get_db().execute(
        "SELECT p.*, ch.name AS channel_name, "
        "  COALESCE((SELECT SUM(qty) FROM sales WHERE purchase_id=p.id),0) AS sold_qty "
        "FROM purchases p LEFT JOIN channels ch ON ch.id=p.channel_id "
        "ORDER BY p.purchase_date DESC, p.id DESC"
    ).fetchall()
    return render_template("purchases.html", rows=rows)


@bp.route("/purchases/new", methods=["GET", "POST"])
def purchase_new():
    db = dbm.get_db()
    if request.method == "POST":
        f = request.form
        qty = max(1, _int(f.get("qty"), 1))
        unit_cost = _int(f.get("unit_cost"))
        candidate_id = _int(f.get("candidate_id")) or None
        db.execute(
            """INSERT INTO purchases
               (candidate_id, name, source, url, qty, unit_cost, total_cost,
                points, purchase_date, channel_id, status, notes)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                candidate_id, f.get("name", ""), f.get("source", ""), f.get("url", ""),
                qty, unit_cost, unit_cost * qty, _int(f.get("points")),
                f.get("purchase_date") or _today(),
                _int(f.get("channel_id")) or None, f.get("status", "在庫"),
                f.get("notes", ""),
            ),
        )
        if candidate_id:
            db.execute("UPDATE candidates SET status='仕入済' WHERE id=?", (candidate_id,))
        db.commit()
        flash("仕入を登録しました", "success")
        return redirect(url_for("main.purchases"))

    candidate = None
    cid = request.args.get("candidate_id")
    if cid:
        candidate = db.execute("SELECT * FROM candidates WHERE id=?", (cid,)).fetchone()
    return render_template(
        "purchase_form.html", candidate=candidate,
        channels=_channels(active_only=True), today=_today(),
    )


@bp.route("/purchases/<int:pid>/status", methods=["POST"])
def purchase_status(pid):
    status = request.form.get("status", "在庫")
    if status in ("在庫", "出品中", "売却済"):
        dbm.get_db().execute("UPDATE purchases SET status=? WHERE id=?", (status, pid))
        dbm.get_db().commit()
    return redirect(url_for("main.purchases"))


@bp.route("/purchases/<int:pid>/delete", methods=["POST"])
def purchase_delete(pid):
    dbm.get_db().execute("DELETE FROM purchases WHERE id=?", (pid,))
    dbm.get_db().commit()
    return redirect(url_for("main.purchases"))


# ---------------- 在庫連動(売り切れ時の他販路取り下げ) ----------------

def _sync_listings_on_soldout(db, purchase_id):
    """在庫が売り切れた仕入に紐づく「出品済」の出品を処理する。

    Amazon(SP-API設定済み・SKUあり)は在庫0を自動送信して「取下げ済」に、
    それ以外(メルカリ等はAPIがないため)は「要取下げ」にして警告する。
    戻り値: (自動取下げ数, 手動対応が必要な販路名リスト, エラーリスト)
    """
    settings = dbm.get_settings()
    rows = db.execute(
        "SELECT l.*, ch.name AS channel_name FROM listings l "
        "LEFT JOIN channels ch ON ch.id=l.channel_id "
        "WHERE l.purchase_id=? AND l.status='出品済'", (purchase_id,)
    ).fetchall()
    creds_ok = (settings.get("spapi_seller_id", "").strip()
                and all(settings.get(k) for k in
                        ("spapi_client_id", "spapi_client_secret", "spapi_refresh_token")))
    auto, manual, errors = 0, [], []
    client = None
    for li in rows:
        is_amazon = "amazon" in (li["channel_name"] or "").lower()
        if is_amazon and creds_ok and li["sku"]:
            try:
                if client is None:
                    client = amazon.SPAPIClient(
                        settings["spapi_client_id"], settings["spapi_client_secret"],
                        settings["spapi_refresh_token"],
                    )
                client.update_quantity(settings["spapi_seller_id"], li["sku"], 0)
                db.execute("UPDATE listings SET status='取下げ済' WHERE id=?", (li["id"],))
                auto += 1
                continue
            except amazon.AmazonPriceError as e:
                errors.append(f"Amazon在庫0の送信に失敗: {e}")
        db.execute("UPDATE listings SET status='要取下げ' WHERE id=?", (li["id"],))
        manual.append(li["channel_name"] or "販路未設定")
    return auto, manual, errors


# ---------------- 売上管理 ----------------

@bp.route("/sales")
def sales():
    rows = dbm.get_db().execute(
        "SELECT s.*, ch.name AS channel_name FROM sales s "
        "LEFT JOIN channels ch ON ch.id=s.channel_id "
        "ORDER BY s.sale_date DESC, s.id DESC"
    ).fetchall()
    return render_template("sales.html", rows=rows)


@bp.route("/sales/new", methods=["GET", "POST"])
def sale_new():
    db = dbm.get_db()
    if request.method == "POST":
        f = request.form
        purchase_id = _int(f.get("purchase_id")) or None
        qty = max(1, _int(f.get("qty"), 1))
        sale_price = _int(f.get("sale_price"))
        shipping = _int(f.get("shipping"))
        other = _int(f.get("other_cost"))
        channel = _channel(f.get("channel_id"))
        revenue = sale_price * qty
        fees = (int(round(revenue * channel["fee_rate"] / 100)) + channel["fixed_fee"]) if channel else 0

        cost_part = 0
        purchase = None
        if purchase_id:
            purchase = db.execute("SELECT * FROM purchases WHERE id=?", (purchase_id,)).fetchone()
        if purchase:
            # 仕入原価をポイント按分込みで計上
            point_per_unit = purchase["points"] / purchase["qty"] if purchase["qty"] else 0
            cost_part = int(round((purchase["unit_cost"] - point_per_unit) * qty))
        else:
            cost_part = _int(f.get("unit_cost")) * qty
        net = revenue - fees - shipping - other - cost_part

        db.execute(
            """INSERT INTO sales
               (purchase_id, name, qty, sale_price, channel_id, fees, shipping,
                other_cost, net_profit, sale_date, notes)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (
                purchase_id, f.get("name", ""), qty, sale_price,
                channel["id"] if channel else None, fees, shipping, other, net,
                f.get("sale_date") or _today(), f.get("notes", ""),
            ),
        )
        if purchase:
            sold = db.execute(
                "SELECT COALESCE(SUM(qty),0) FROM sales WHERE purchase_id=?", (purchase_id,)
            ).fetchone()[0]
            if sold >= purchase["qty"]:
                db.execute("UPDATE purchases SET status='売却済' WHERE id=?", (purchase_id,))
                # 在庫切れ → 他販路の出品を連動処理
                auto, manual, errors = _sync_listings_on_soldout(db, purchase_id)
                if auto:
                    flash(f"Amazonの出品 {auto}件を在庫0にして自動取り下げしました", "success")
                if manual:
                    flash("⚠️ 在庫切れです。次の販路の出品を取り下げてください: "
                          + " / ".join(manual)
                          + "(出品作成画面に「要取下げ」として表示しています)", "error")
                for e in errors:
                    flash(e, "error")
        db.commit()
        flash(f"売上を登録しました(純利益 {net:,}円)", "success")
        return redirect(url_for("main.sales"))

    purchase = None
    pid = request.args.get("purchase_id")
    if pid:
        purchase = db.execute("SELECT * FROM purchases WHERE id=?", (pid,)).fetchone()
    return render_template(
        "sale_form.html", purchase=purchase,
        channels=_channels(active_only=True), today=_today(),
    )


@bp.route("/sales/<int:sid>/delete", methods=["POST"])
def sale_delete(sid):
    db = dbm.get_db()
    row = db.execute("SELECT purchase_id FROM sales WHERE id=?", (sid,)).fetchone()
    db.execute("DELETE FROM sales WHERE id=?", (sid,))
    if row and row["purchase_id"]:
        db.execute(
            "UPDATE purchases SET status='在庫' WHERE id=? AND status='売却済'",
            (row["purchase_id"],),
        )
    db.commit()
    return redirect(url_for("main.sales"))


# ---------------- 価格改定アラート ----------------

def _demo_mode(settings):
    return not settings.get("rakuten_app_id") and not settings.get("yahoo_app_id")


@bp.route("/alerts/check", methods=["POST"])
def alerts_check():
    """在庫商品のAmazon相場を再取得し、しきい値以上下落していたらアラートを作成する。"""
    db = dbm.get_db()
    settings = dbm.get_settings()
    threshold = _float(settings.get("price_drop_threshold"), 10.0)
    rows = db.execute(
        "SELECT p.id, p.name, cd.jan FROM purchases p "
        "JOIN candidates cd ON cd.id=p.candidate_id AND cd.jan<>'' "
        "WHERE p.status<>'売却済'"
    ).fetchall()
    if not rows:
        flash("チェック対象がありません(JAN付きの候補から仕入れた在庫が対象です)", "error")
        return redirect(url_for("main.dashboard"))

    checked, alerts, errors = 0, 0, []
    for r in rows:
        old = db.execute(
            "SELECT price FROM amazon_prices WHERE jan=? AND price>0", (r["jan"],)
        ).fetchone()
        try:
            new = amazon.get_price(r["jan"], settings, allow_demo=_demo_mode(settings), force=True)
        except amazon.AmazonPriceError as e:
            if str(e) not in errors:
                errors.append(str(e))
            continue
        checked += 1
        if not old or not new or new.get("price", 0) <= 0:
            continue
        drop = (old["price"] - new["price"]) / old["price"] * 100
        if drop >= threshold:
            db.execute(
                """INSERT INTO price_alerts (purchase_id, name, jan, old_price, new_price, drop_rate)
                   VALUES (?,?,?,?,?,?)""",
                (r["id"], r["name"], r["jan"], old["price"], new["price"], round(drop, 1)),
            )
            alerts += 1
    db.commit()
    for e in errors:
        flash(e, "error")
    flash(f"価格チェック完了: {checked}件確認 / 値下がりアラート {alerts}件", "success")
    return redirect(url_for("main.dashboard"))


@bp.route("/alerts/<int:aid>/dismiss", methods=["POST"])
def alert_dismiss(aid):
    dbm.get_db().execute("UPDATE price_alerts SET dismissed=1 WHERE id=?", (aid,))
    dbm.get_db().commit()
    return redirect(request.referrer or url_for("main.dashboard"))


# ---------------- バーコード仕入れ ----------------

@bp.route("/scan")
def scan():
    settings = dbm.get_settings()
    channel = dbm.default_channel(settings)
    return render_template("scan.html", channel=channel,
                           demo_mode=_demo_mode(settings))


@bp.route("/api/amazon/<jan>")
def api_amazon(jan):
    """JAN→Amazon相場のJSON API(バーコードスキャン用)。"""
    settings = dbm.get_settings()
    channel = dbm.default_channel(settings)
    try:
        az = amazon.get_price(jan.strip(), settings, allow_demo=_demo_mode(settings))
    except amazon.AmazonPriceError as e:
        return jsonify({"found": False, "error": str(e)})
    if not az or az.get("price", 0) <= 0:
        if not amazon.build_pricer(settings) and not _demo_mode(settings):
            return jsonify({"found": False,
                            "error": "Keepa APIキーまたはSP-API認証情報を設定してください"})
        return jsonify({"found": False, "error": "Amazonで商品が見つかりませんでした"})
    return jsonify({
        "found": True,
        "jan": jan.strip(),
        "price": az["price"],
        "rank": az.get("rank", 0),
        "asin": az.get("asin", ""),
        "title": az.get("title", ""),
        "fee_rate": channel["fee_rate"] if channel else 10,
        "fixed_fee": channel["fixed_fee"] if channel else 0,
        "shipping": channel["shipping_cost"] if channel else 0,
        "channel_id": channel["id"] if channel else "",
        "channel_name": channel["name"] if channel else "",
    })


# ---------------- 資金繰り ----------------

@bp.route("/finance", methods=["GET", "POST"])
def finance():
    if request.method == "POST":
        dbm.save_settings(request.form)
        flash("予算・目標を保存しました", "success")
        return redirect(url_for("main.finance"))

    db = dbm.get_db()
    settings = dbm.get_settings()
    month = _today()[:7]
    budget = _int(settings.get("monthly_budget"), 0)
    goal = _int(settings.get("monthly_profit_goal"), 0)

    spend = db.execute(
        "SELECT COALESCE(SUM(total_cost),0) FROM purchases WHERE substr(purchase_date,1,7)=?",
        (month,)).fetchone()[0]
    profit = db.execute(
        "SELECT COALESCE(SUM(net_profit),0) FROM sales WHERE substr(sale_date,1,7)=?",
        (month,)).fetchone()[0]
    expenses = db.execute(
        "SELECT COALESCE(SUM(amount),0) FROM expenses WHERE substr(expense_date,1,7)=?",
        (month,)).fetchone()[0]
    revenue = db.execute(
        "SELECT COALESCE(SUM(sale_price*qty),0) FROM sales WHERE substr(sale_date,1,7)=?",
        (month,)).fetchone()[0]
    stock_cost = db.execute(
        "SELECT COALESCE(SUM(total_cost),0) FROM purchases WHERE status<>'売却済'"
    ).fetchone()[0]
    planned = db.execute(
        "SELECT COALESCE(SUM(cost),0) FROM candidates WHERE status='仕入予定'"
    ).fetchone()[0]

    data = {
        "month": month,
        "budget": budget,
        "spend": spend,
        "remaining": budget - spend,
        "planned": planned,
        "stock_cost": stock_cost,
        "revenue": revenue,
        "profit": profit,
        "expenses": expenses,
        "operating": profit - expenses,
        "goal": goal,
        "goal_pct": round((profit - expenses) / goal * 100, 1) if goal else 0,
        "budget_pct": round(spend / budget * 100, 1) if budget else 0,
    }
    return render_template("finance.html", d=data, settings=settings)


# ---------------- 経費管理 ----------------

EXPENSE_CATEGORIES = ["梱包材", "送料", "交通費", "工具・備品", "月額利用料", "手数料", "その他"]


@bp.route("/expenses", methods=["GET", "POST"])
def expenses():
    db = dbm.get_db()
    if request.method == "POST":
        f = request.form
        amount = _int(f.get("amount"))
        if amount > 0:
            db.execute(
                "INSERT INTO expenses (expense_date, category, amount, notes) VALUES (?,?,?,?)",
                (f.get("expense_date") or _today(), f.get("category", "その他"),
                 amount, f.get("notes", "")),
            )
            db.commit()
            flash("経費を登録しました", "success")
        else:
            flash("金額を入力してください", "error")
        return redirect(url_for("main.expenses"))

    rows = db.execute("SELECT * FROM expenses ORDER BY expense_date DESC, id DESC").fetchall()
    monthly = db.execute(
        "SELECT substr(expense_date,1,7) AS ym, SUM(amount) AS total "
        "FROM expenses GROUP BY ym ORDER BY ym DESC LIMIT 6"
    ).fetchall()
    return render_template("expenses.html", rows=rows, monthly=monthly,
                           categories=EXPENSE_CATEGORIES, today=_today())


@bp.route("/expenses/<int:eid>/delete", methods=["POST"])
def expense_delete(eid):
    dbm.get_db().execute("DELETE FROM expenses WHERE id=?", (eid,))
    dbm.get_db().commit()
    return redirect(url_for("main.expenses"))


@bp.route("/export/expenses.csv")
def export_expenses():
    rows = dbm.get_db().execute(
        "SELECT id, expense_date, category, amount, notes FROM expenses ORDER BY expense_date"
    ).fetchall()
    return _csv_response(
        "expenses.csv",
        ["ID", "日付", "カテゴリ", "金額", "メモ"],
        [tuple(r) for r in rows],
    )


# ---------------- 価格履歴グラフ ----------------

@bp.route("/candidates/<int:cid>/history")
def candidate_history(cid):
    db = dbm.get_db()
    candidate = db.execute("SELECT * FROM candidates WHERE id=?", (cid,)).fetchone()
    if not candidate:
        return redirect(url_for("main.candidates"))
    settings = dbm.get_settings()
    points, error = [], ""
    if not candidate["jan"]:
        error = "この商品にはJANコードがないため履歴を取得できません"
    else:
        try:
            points = amazon.get_history(candidate["jan"], settings,
                                        allow_demo=_demo_mode(settings))
        except amazon.AmazonPriceError as e:
            error = str(e)
        if points is None:
            points, error = [], "価格履歴の取得にはKeepa APIキーが必要です(設定画面で登録)"

    chart = None
    if points:
        prices = [p for _, p in points]
        lo, hi = min(prices), max(prices)
        span = max(1, hi - lo)
        w, h, pad = 860, 280, 40
        step = (w - pad * 2) / max(1, len(points) - 1)
        coords = [
            (round(pad + i * step, 1),
             round(h - pad - (p - lo) / span * (h - pad * 2), 1))
            for i, (_, p) in enumerate(points)
        ]
        chart = {
            "w": w, "h": h, "pad": pad,
            "polyline": " ".join(f"{x},{y}" for x, y in coords),
            "min": lo, "max": hi,
            "first_date": points[0][0], "last_date": points[-1][0],
            "current": prices[-1],
            "avg": int(sum(prices) / len(prices)),
        }
    return render_template("price_history.html", candidate=candidate,
                           chart=chart, error=error, points=points)


# ---------------- 出品作成 ----------------

@bp.route("/listings")
def listings():
    db = dbm.get_db()
    settings = dbm.get_settings()
    rows = db.execute(
        "SELECT l.*, ch.name AS channel_name FROM listings l "
        "LEFT JOIN channels ch ON ch.id=l.channel_id "
        "ORDER BY CASE l.status WHEN '要取下げ' THEN 0 ELSE 1 END, l.id DESC"
    ).fetchall()
    relist_days = _int(settings.get("relist_days"), 14) or 14
    # 再出品リマインダー: 出品からN日経過し、在庫がまだある出品
    relist = db.execute(
        "SELECT l.*, ch.name AS channel_name, "
        "  CAST(julianday('now') - julianday(l.created_at) AS INTEGER) AS days "
        "FROM listings l LEFT JOIN channels ch ON ch.id=l.channel_id "
        "WHERE l.status='出品済' "
        "  AND julianday('now') - julianday(l.created_at) >= ? "
        "  AND (l.purchase_id IS NULL OR "
        "       (SELECT status FROM purchases WHERE id=l.purchase_id) <> '売却済') "
        "ORDER BY l.created_at", (relist_days,)
    ).fetchall()
    return render_template("listings.html", rows=rows, relist=relist,
                           relist_days=relist_days)


@bp.route("/listings/<int:lid>/relist", methods=["POST"])
def listing_relist(lid):
    """再出品用にドラフトを複製する(検索上位表示のための出し直し用)。"""
    db = dbm.get_db()
    row = db.execute("SELECT * FROM listings WHERE id=?", (lid,)).fetchone()
    if not row:
        return redirect(url_for("main.listings"))
    db.execute(
        """INSERT INTO listings
           (purchase_id, channel_id, name, title, description, tags,
            price, price_floor, condition, status)
           VALUES (?,?,?,?,?,?,?,?,?,'下書き')""",
        (row["purchase_id"], row["channel_id"], row["name"], row["title"],
         row["description"], row["tags"], row["price"], row["price_floor"],
         row["condition"]),
    )
    db.execute("UPDATE listings SET status='要取下げ' WHERE id=?", (lid,))
    db.commit()
    flash("再出品用ドラフトを複製しました。販路側で①古い出品を削除 → ②新しいドラフトで出品し直してください"
          "(古い方は「要取下げ」にしてあります)", "success")
    return redirect(url_for("main.listings"))


@bp.route("/listings/new")
def listing_new():
    db = dbm.get_db()
    purchase = None
    pid = request.args.get("purchase_id")
    if pid:
        purchase = db.execute("SELECT * FROM purchases WHERE id=?", (pid,)).fetchone()
    return render_template(
        "listing_form.html", purchase=purchase,
        channels=_channels(active_only=True), conditions=listing.CONDITIONS,
    )


@bp.route("/listings/generate", methods=["POST"])
def listing_generate():
    db = dbm.get_db()
    settings = dbm.get_settings()
    f = request.form
    name = f.get("name", "").strip()
    if not name:
        flash("商品名を入力してください", "error")
        return redirect(url_for("main.listing_new"))
    channel_ids = request.form.getlist("channel_ids")
    if not channel_ids:
        flash("出品する販路を1つ以上選択してください", "error")
        return redirect(url_for("main.listing_new"))

    purchase_id = _int(f.get("purchase_id")) or None
    cost = _int(f.get("cost"))
    points = _int(f.get("points"))
    condition = f.get("condition", listing.CONDITIONS[0])

    # Amazon相場があれば価格アンカーに使う(候補経由のJAN→キャッシュ参照)
    amazon_price = 0
    if purchase_id:
        row = db.execute(
            "SELECT ap.price FROM purchases p "
            "JOIN candidates cd ON cd.id=p.candidate_id "
            "JOIN amazon_prices ap ON ap.jan=cd.jan AND ap.price>0 "
            "WHERE p.id=?", (purchase_id,)
        ).fetchone()
        amazon_price = row["price"] if row else 0

    created = 0
    for cid in channel_ids:
        channel = _channel(cid)
        if not channel:
            continue
        price, floor, _ = listing.recommend_price(
            cost, points, channel, amazon_price=amazon_price,
            min_profit=_int(settings.get("min_profit"), 500),
            min_rate=_float(settings.get("min_profit_rate"), 10.0),
        )
        draft = listing.generate(
            name, condition, channel, price, floor,
            accessories=f.get("accessories", ""), notes=f.get("notes", ""),
            signature=settings.get("listing_signature", ""),
        )
        db.execute(
            """INSERT INTO listings
               (purchase_id, channel_id, name, title, description, tags,
                price, price_floor, condition)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (purchase_id, channel["id"], name, draft["title"], draft["description"],
             draft["tags"], draft["price"], draft["price_floor"], condition),
        )
        created += 1
    db.commit()
    flash(f"{created}販路分の出品ドラフトを作成しました(編集・コピーして出品してください)", "success")
    return redirect(url_for("main.listings"))


@bp.route("/listings/<int:lid>/update", methods=["POST"])
def listing_update(lid):
    f = request.form
    dbm.get_db().execute(
        "UPDATE listings SET title=?, description=?, tags=?, price=? WHERE id=?",
        (f.get("title", ""), f.get("description", ""), f.get("tags", ""),
         _int(f.get("price")), lid),
    )
    dbm.get_db().commit()
    flash("出品ドラフトを保存しました", "success")
    return redirect(url_for("main.listings"))


@bp.route("/listings/<int:lid>/ai", methods=["POST"])
def listing_ai(lid):
    db = dbm.get_db()
    row = db.execute(
        "SELECT l.*, ch.name AS channel_name FROM listings l "
        "LEFT JOIN channels ch ON ch.id=l.channel_id WHERE l.id=?", (lid,)
    ).fetchone()
    if not row:
        return redirect(url_for("main.listings"))
    try:
        improved = listing.ai_polish(dict(row), row["channel_name"] or "", dbm.get_settings())
    except listing.ListingAIError as e:
        flash(str(e), "error")
        return redirect(url_for("main.listings"))
    db.execute(
        "UPDATE listings SET title=?, description=?, tags=? WHERE id=?",
        (improved["title"], improved["description"], improved["tags"], lid),
    )
    db.commit()
    flash("AIで出品文を磨き上げました", "success")
    return redirect(url_for("main.listings"))


@bp.route("/listings/<int:lid>/status", methods=["POST"])
def listing_status(lid):
    db = dbm.get_db()
    status = request.form.get("status", "下書き")
    if status in ("下書き", "出品済", "要取下げ", "取下げ済"):
        db.execute("UPDATE listings SET status=? WHERE id=?", (status, lid))
        if status == "出品済":
            row = db.execute("SELECT purchase_id FROM listings WHERE id=?", (lid,)).fetchone()
            if row and row["purchase_id"]:
                db.execute(
                    "UPDATE purchases SET status='出品中' WHERE id=? AND status='在庫'",
                    (row["purchase_id"],),
                )
        db.commit()
    return redirect(url_for("main.listings"))


@bp.route("/listings/<int:lid>/publish_amazon", methods=["POST"])
def listing_publish_amazon(lid):
    """SP-API Listings APIで既存ASINへの相乗り出品を登録する。"""
    db = dbm.get_db()
    settings = dbm.get_settings()
    row = db.execute(
        "SELECT l.*, cd.asin AS cand_asin FROM listings l "
        "LEFT JOIN purchases p ON p.id=l.purchase_id "
        "LEFT JOIN candidates cd ON cd.id=p.candidate_id WHERE l.id=?", (lid,)
    ).fetchone()
    if not row:
        return redirect(url_for("main.listings"))

    seller_id = settings.get("spapi_seller_id", "").strip()
    creds_ok = all(settings.get(k) for k in
                   ("spapi_client_id", "spapi_client_secret", "spapi_refresh_token"))
    if not seller_id or not creds_ok:
        flash("SP-API自動出品には、設定画面でSP-API認証情報と出品者IDの登録が必要です", "error")
        return redirect(url_for("main.listings"))
    asin = (row["cand_asin"] or "").strip()
    if not asin:
        flash("この商品にASINが紐付いていないため自動出品できません(リサーチ経由でASIN取得が必要)", "error")
        return redirect(url_for("main.listings"))

    client = amazon.SPAPIClient(
        settings["spapi_client_id"], settings["spapi_client_secret"],
        settings["spapi_refresh_token"],
    )
    sku = f"SEDORI-{row['purchase_id'] or 'L'}-{row['id']}"
    condition = amazon.SPAPI_CONDITIONS.get(row["condition"], "used_good")
    try:
        result = client.submit_listing(seller_id, sku, asin, row["price"],
                                       quantity=1, condition=condition)
    except amazon.AmazonPriceError as e:
        flash(f"自動出品に失敗しました: {e}", "error")
        return redirect(url_for("main.listings"))

    if result["status"] in ("ACCEPTED", "SUBMITTED", "VALID"):
        db.execute("UPDATE listings SET status='出品済', sku=? WHERE id=?", (sku, lid))
        if row["purchase_id"]:
            db.execute("UPDATE purchases SET status='出品中' WHERE id=? AND status='在庫'",
                       (row["purchase_id"],))
        db.commit()
        flash(f"Amazonへ出品を送信しました(SKU: {sku} / 状態: {result['status']})", "success")
    else:
        msgs = " / ".join(result["issues"]) or result["status"]
        flash(f"Amazonが出品を受理しませんでした: {msgs}", "error")
    return redirect(url_for("main.listings"))


@bp.route("/listings/<int:lid>/delete", methods=["POST"])
def listing_delete(lid):
    dbm.get_db().execute("DELETE FROM listings WHERE id=?", (lid,))
    dbm.get_db().commit()
    return redirect(url_for("main.listings"))


# ---------------- 出品画像の整形 ----------------

@bp.route("/images", methods=["GET", "POST"])
def images_view():
    results = []
    if request.method == "POST":
        file = request.files.get("photo")
        presets = request.form.getlist("presets") or list(images.PRESETS.keys())
        if not file or not file.filename:
            flash("画像ファイルを選択してください", "error")
        else:
            try:
                results = images.process(file, presets)
                flash(f"{len(results)}サイズの画像を作成しました", "success")
            except ValueError as e:
                flash(str(e), "error")
            except OSError:
                flash("画像を読み込めませんでした(ファイルが壊れている可能性があります)", "error")
    return render_template("images.html", results=results, presets=images.PRESETS)


# ---------------- 月次レポート ----------------

@bp.route("/report")
def report():
    db = dbm.get_db()
    months = db.execute(
        """SELECT ym, SUM(revenue) AS revenue, SUM(profit) AS profit,
                  SUM(spend) AS spend, SUM(sales_count) AS sales_count,
                  SUM(expense) AS expense,
                  SUM(profit) - SUM(expense) AS operating
           FROM (
             SELECT substr(sale_date,1,7) AS ym, sale_price*qty AS revenue,
                    net_profit AS profit, 0 AS spend, 1 AS sales_count, 0 AS expense FROM sales
             UNION ALL
             SELECT substr(purchase_date,1,7) AS ym, 0, 0, total_cost, 0, 0 FROM purchases
             UNION ALL
             SELECT substr(expense_date,1,7) AS ym, 0, 0, 0, 0, amount FROM expenses
           ) GROUP BY ym ORDER BY ym DESC"""
    ).fetchall()
    by_channel = db.execute(
        """SELECT COALESCE(ch.name,'(未設定)') AS channel_name,
                  COUNT(*) AS cnt, SUM(s.sale_price*s.qty) AS revenue, SUM(s.net_profit) AS profit
           FROM sales s LEFT JOIN channels ch ON ch.id=s.channel_id
           GROUP BY s.channel_id ORDER BY profit DESC"""
    ).fetchall()
    return render_template("report.html", months=months, by_channel=by_channel)


# ---------------- 販路設定 ----------------

@bp.route("/channels", methods=["GET", "POST"])
def channels():
    db = dbm.get_db()
    if request.method == "POST":
        f = request.form
        if f.get("name", "").strip():
            db.execute(
                "INSERT INTO channels (name, fee_rate, fixed_fee, shipping_cost, notes) VALUES (?,?,?,?,?)",
                (f["name"].strip(), _float(f.get("fee_rate")), _int(f.get("fixed_fee")),
                 _int(f.get("shipping_cost")), f.get("notes", "")),
            )
            db.commit()
            flash("販路を追加しました", "success")
        return redirect(url_for("main.channels"))
    return render_template("channels.html", rows=_channels())


@bp.route("/channels/<int:cid>/update", methods=["POST"])
def channel_update(cid):
    f = request.form
    dbm.get_db().execute(
        "UPDATE channels SET name=?, fee_rate=?, fixed_fee=?, shipping_cost=?, notes=?, active=? WHERE id=?",
        (f.get("name", "").strip(), _float(f.get("fee_rate")), _int(f.get("fixed_fee")),
         _int(f.get("shipping_cost")), f.get("notes", ""),
         1 if f.get("active") == "1" else 0, cid),
    )
    dbm.get_db().commit()
    flash("販路を更新しました", "success")
    return redirect(url_for("main.channels"))


@bp.route("/channels/<int:cid>/delete", methods=["POST"])
def channel_delete(cid):
    dbm.get_db().execute("DELETE FROM channels WHERE id=?", (cid,))
    dbm.get_db().commit()
    return redirect(url_for("main.channels"))


# ---------------- 設定 ----------------

@bp.route("/settings", methods=["GET", "POST"])
def settings_view():
    if request.method == "POST":
        dbm.save_settings(request.form)
        flash("設定を保存しました", "success")
        return redirect(url_for("main.settings_view"))
    return render_template(
        "settings.html", settings=dbm.get_settings(), channels=_channels(active_only=True),
    )


# ---------------- CSVエクスポート ----------------

def _csv_response(filename, header, rows):
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(header)
    writer.writerows(rows)
    return Response(
        "\ufeff" + buf.getvalue(),  # Excel向けにBOM付きUTF-8
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@bp.route("/export/purchases.csv")
def export_purchases():
    rows = dbm.get_db().execute(
        "SELECT p.id, p.purchase_date, p.name, p.source, p.qty, p.unit_cost, p.total_cost, "
        "p.points, ch.name, p.status, p.notes "
        "FROM purchases p LEFT JOIN channels ch ON ch.id=p.channel_id ORDER BY p.purchase_date"
    ).fetchall()
    return _csv_response(
        "purchases.csv",
        ["ID", "仕入日", "商品名", "仕入元", "数量", "単価", "合計", "獲得pt", "販売予定販路", "状態", "メモ"],
        [tuple(r) for r in rows],
    )


@bp.route("/export/sales.csv")
def export_sales():
    rows = dbm.get_db().execute(
        "SELECT s.id, s.sale_date, s.name, s.qty, s.sale_price, s.sale_price*s.qty, "
        "ch.name, s.fees, s.shipping, s.other_cost, s.net_profit, s.notes "
        "FROM sales s LEFT JOIN channels ch ON ch.id=s.channel_id ORDER BY s.sale_date"
    ).fetchall()
    return _csv_response(
        "sales.csv",
        ["ID", "売上日", "商品名", "数量", "単価", "売上高", "販路", "手数料", "送料", "その他経費", "純利益", "メモ"],
        [tuple(r) for r in rows],
    )
