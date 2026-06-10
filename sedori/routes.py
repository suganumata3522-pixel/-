import csv
import datetime
import io

from flask import (
    Blueprint, Response, flash, redirect, render_template, request, url_for,
)

from . import db as dbm
from . import profit, research, timing

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
    return render_template(
        "dashboard.html", kpi=kpi, monthly=monthly, recent_sales=recent_sales,
        best_rakuten=best_rakuten, best_yahoo=best_yahoo,
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
            profit, profit_rate, roi, buy_date, buy_reason)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            f.get("name", ""), f.get("jan", ""), f.get("source", "manual"),
            f.get("url", ""), f.get("shop", ""), cost, sell, channel["id"], point_rate,
            p["profit"], p["profit_rate"], p["roi"],
            best["date_str"] if best else "",
            " / ".join(best["reasons"]) if best else "",
        ),
    )
    dbm.get_db().commit()
    flash(f"候補に登録しました: {f.get('name','')}", "success")
    return redirect(request.referrer or url_for("main.candidates"))


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


# ---------------- 月次レポート ----------------

@bp.route("/report")
def report():
    db = dbm.get_db()
    months = db.execute(
        """SELECT ym, SUM(revenue) AS revenue, SUM(profit) AS profit,
                  SUM(spend) AS spend, SUM(sales_count) AS sales_count
           FROM (
             SELECT substr(sale_date,1,7) AS ym, sale_price*qty AS revenue,
                    net_profit AS profit, 0 AS spend, 1 AS sales_count FROM sales
             UNION ALL
             SELECT substr(purchase_date,1,7) AS ym, 0, 0, total_cost, 0 FROM purchases
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
