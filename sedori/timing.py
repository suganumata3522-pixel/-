"""購入日決定判断エンジン。

各モールのセール・ポイントアップ日カレンダーから、今後N日間で最も実質仕入額を
下げられる日を推奨する。確定イベント(毎月固定の日付ルール)と、開催傾向からの
予測イベントを区別して扱う。
"""
import datetime

WEEKDAYS_JA = ["月", "火", "水", "木", "金", "土", "日"]


def events_for(d):
    """date d に該当するイベントの一覧。
    各イベント: {mall, label, bonus(=ポイント上乗せ%), predicted(bool)}
    """
    ev = []
    day = d.day
    # --- 楽天市場 ---
    if day in (5, 10, 15, 20, 25, 30):
        ev.append({"mall": "楽天", "label": "5と0のつく日(楽天カードで+2倍)", "bonus": 2, "predicted": False})
    if day == 1:
        ev.append({"mall": "楽天", "label": "ワンダフルデー(+2倍)", "bonus": 2, "predicted": False})
    if day == 18:
        ev.append({"mall": "楽天", "label": "ご愛顧感謝デー(ランク特典 最大+3倍)", "bonus": 2, "predicted": False})
    if d.month in (3, 6, 9, 12) and 4 <= day <= 11:
        ev.append({"mall": "楽天", "label": "楽天スーパーセール時期(予測・買い回り最大+9倍)", "bonus": 9, "predicted": True})
    elif 4 <= day <= 11 or 19 <= day <= 26:
        ev.append({"mall": "楽天", "label": "お買い物マラソン開催が多い時期(予測・買い回り最大+9倍)", "bonus": 9, "predicted": True})
    # --- Yahoo!ショッピング ---
    if day in (5, 15, 25):
        ev.append({"mall": "Yahoo", "label": "5のつく日(+4%)", "bonus": 4, "predicted": False})
    if day in (11, 22):
        ev.append({"mall": "Yahoo", "label": "ゾロ目の日(クーポン配布)", "bonus": 2, "predicted": False})
    if d.weekday() == 6:
        ev.append({"mall": "Yahoo", "label": "日曜日(LYPプレミアム特典が多い)", "bonus": 2, "predicted": True})
    return ev


def day_score(d, mall=None):
    """その日の「お得度」スコア。確定イベントは満額、予測イベントは半分で評価。"""
    score = 0.0
    for ev in events_for(d):
        if mall and ev["mall"] != mall:
            continue
        score += ev["bonus"] * (0.5 if ev["predicted"] else 1.0)
    return score


def mall_of_source(source):
    return {"rakuten": "楽天", "yahoo": "Yahoo"}.get(source)


def best_buy_date(source=None, days=14, today=None):
    """今後 days 日間で最もスコアの高い購入日を返す。

    source: 'rakuten' / 'yahoo' / None(全モール対象)
    戻り値: {date, date_str, score, bonus(確定分%), reasons[]}  該当なしは None
    """
    today = today or datetime.date.today()
    mall = mall_of_source(source) if source else None
    best = None
    for i in range(days):
        d = today + datetime.timedelta(days=i)
        evs = [e for e in events_for(d) if not mall or e["mall"] == mall]
        if not evs:
            continue
        score = sum(e["bonus"] * (0.5 if e["predicted"] else 1.0) for e in evs)
        confirmed = sum(e["bonus"] for e in evs if not e["predicted"])
        if best is None or score > best["score"]:
            best = {
                "date": d,
                "date_str": d.isoformat(),
                "score": score,
                "bonus": confirmed,
                "reasons": [e["label"] for e in evs],
            }
    return best


def calendar(days=30, today=None):
    """今後 days 日分のイベントカレンダー。"""
    today = today or datetime.date.today()
    rows = []
    for i in range(days):
        d = today + datetime.timedelta(days=i)
        rows.append({
            "date": d,
            "date_str": d.isoformat(),
            "weekday": WEEKDAYS_JA[d.weekday()],
            "events": events_for(d),
            "score": day_score(d),
        })
    return rows
