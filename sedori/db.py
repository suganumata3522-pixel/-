import sqlite3

from flask import current_app, g

SCHEMA = """
CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    fee_rate REAL NOT NULL DEFAULT 10,      -- 販売手数料(%)
    fixed_fee INTEGER NOT NULL DEFAULT 0,   -- 固定手数料(円)
    shipping_cost INTEGER NOT NULL DEFAULT 0, -- 標準送料(円)
    notes TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS saved_searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    max_price INTEGER NOT NULL DEFAULT 0,   -- 仕入上限(0=無制限)
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    jan TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',        -- rakuten / yahoo / demo / manual
    url TEXT NOT NULL DEFAULT '',
    shop TEXT NOT NULL DEFAULT '',
    cost INTEGER NOT NULL,                  -- 仕入価格
    sell_price INTEGER NOT NULL,            -- 想定売価
    channel_id INTEGER,                     -- 想定販路
    point_rate REAL NOT NULL DEFAULT 0,     -- 仕入時ポイント還元率(%)
    profit INTEGER NOT NULL DEFAULT 0,
    profit_rate REAL NOT NULL DEFAULT 0,
    roi REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT '候補',     -- 候補 / 仕入予定 / 仕入済 / 見送り
    buy_date TEXT NOT NULL DEFAULT '',      -- 推奨購入日
    buy_reason TEXT NOT NULL DEFAULT '',
    asin TEXT NOT NULL DEFAULT '',          -- Amazon ASIN(相場取得時)
    sell_basis TEXT NOT NULL DEFAULT '',    -- 想定売価の根拠(amazon / 係数 など)
    amazon_rank INTEGER NOT NULL DEFAULT 0, -- Amazon売れ筋ランキング
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (channel_id) REFERENCES channels(id)
);

CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER,
    name TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    qty INTEGER NOT NULL DEFAULT 1,
    unit_cost INTEGER NOT NULL,
    total_cost INTEGER NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,      -- 獲得ポイント(合計)
    purchase_date TEXT NOT NULL,
    channel_id INTEGER,                     -- 販売予定販路
    status TEXT NOT NULL DEFAULT '在庫',     -- 在庫 / 出品中 / 売却済
    notes TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (candidate_id) REFERENCES candidates(id),
    FOREIGN KEY (channel_id) REFERENCES channels(id)
);

CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER,
    name TEXT NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1,
    sale_price INTEGER NOT NULL,            -- 1個あたり売価
    channel_id INTEGER,
    fees INTEGER NOT NULL DEFAULT 0,
    shipping INTEGER NOT NULL DEFAULT 0,
    other_cost INTEGER NOT NULL DEFAULT 0,
    net_profit INTEGER NOT NULL DEFAULT 0,
    sale_date TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (purchase_id) REFERENCES purchases(id),
    FOREIGN KEY (channel_id) REFERENCES channels(id)
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER,
    channel_id INTEGER,
    name TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '',
    price INTEGER NOT NULL DEFAULT 0,        -- 推奨出品価格
    price_floor INTEGER NOT NULL DEFAULT 0,  -- 損益分岐価格(これ未満は赤字)
    condition TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT '下書き',    -- 下書き / 出品済
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (purchase_id) REFERENCES purchases(id),
    FOREIGN KEY (channel_id) REFERENCES channels(id)
);

CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_date TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'その他',
    amount INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS price_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER,
    name TEXT NOT NULL DEFAULT '',
    jan TEXT NOT NULL DEFAULT '',
    old_price INTEGER NOT NULL DEFAULT 0,
    new_price INTEGER NOT NULL DEFAULT 0,
    drop_rate REAL NOT NULL DEFAULT 0,      -- 下落率(%)
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    dismissed INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id)
);

CREATE TABLE IF NOT EXISTS amazon_prices (
    jan TEXT PRIMARY KEY,
    asin TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    price INTEGER NOT NULL DEFAULT 0,       -- 0 = 見つからなかった
    rank INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT '',        -- keepa / sp-api / demo
    fetched_at TEXT NOT NULL
);
"""

DEFAULT_CHANNELS = [
    ("Amazon (FBA)", 15.0, 500, 0, "手数料15% + FBA出荷費用の概算500円/個"),
    ("Amazon (自己発送)", 15.0, 0, 250, "手数料15% + 自己発送送料"),
    ("メルカリ", 10.0, 0, 210, "手数料10% + らくらくメルカリ便(ネコポス)想定"),
    ("ヤフオク!", 10.0, 0, 230, "LYPプレミアム未加入は10%"),
    ("楽天ラクマ", 10.0, 0, 210, "手数料10%(税込)"),
    ("Yahoo!フリマ", 5.0, 0, 230, "手数料5%"),
]

DEFAULT_SETTINGS = {
    "rakuten_app_id": "",
    "yahoo_app_id": "",
    "min_profit": "500",            # 自動リサーチ: 最低利益額(円)
    "min_profit_rate": "10",        # 最低利益率(%)
    "min_roi": "15",                # 最低ROI(%)
    "sell_multiplier": "1.35",      # 想定売価係数(仕入価格×係数)
    "default_channel_id": "",       # 既定販路(空=最初のアクティブ販路)
    "base_point_rate": "1",         # 通常ポイント還元率(%)
    "keepa_api_key": "",            # Keepa APIキー(Amazon売価の自動取得)
    "spapi_client_id": "",          # Amazon SP-API LWAクライアントID
    "spapi_client_secret": "",      # Amazon SP-API LWAクライアントシークレット
    "spapi_refresh_token": "",      # Amazon SP-API リフレッシュトークン
    "amazon_cache_hours": "24",     # Amazon売価キャッシュ有効時間
    "anthropic_api_key": "",        # Claude API(出品文のAI磨き上げ)
    "listing_model": "claude-opus-4-8",  # AI磨き上げに使うモデル
    "listing_signature": "",        # 出品文の末尾に入れる定型文(任意)
    "monthly_budget": "100000",     # 月間仕入予算(円)
    "monthly_profit_goal": "30000", # 月間利益目標(円)
    "price_drop_threshold": "10",   # 価格下落アラートのしきい値(%)
    "spapi_seller_id": "",          # Amazon出品者ID(SP-API自動出品)
}


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(current_app.config["DB_PATH"])
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db():
    db = g.pop("db", None)
    if db is not None:
        db.close()


def _ensure_column(db, table, column, decl):
    cols = [r[1] for r in db.execute(f"PRAGMA table_info({table})").fetchall()]
    if column not in cols:
        db.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")


def init_db():
    db = get_db()
    db.executescript(SCHEMA)
    # 既存DBへのマイグレーション
    _ensure_column(db, "candidates", "asin", "TEXT NOT NULL DEFAULT ''")
    _ensure_column(db, "candidates", "sell_basis", "TEXT NOT NULL DEFAULT ''")
    _ensure_column(db, "candidates", "amazon_rank", "INTEGER NOT NULL DEFAULT 0")
    if db.execute("SELECT COUNT(*) FROM channels").fetchone()[0] == 0:
        db.executemany(
            "INSERT INTO channels (name, fee_rate, fixed_fee, shipping_cost, notes) VALUES (?,?,?,?,?)",
            DEFAULT_CHANNELS,
        )
    for key, value in DEFAULT_SETTINGS.items():
        db.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?,?)", (key, value))
    db.commit()


def get_settings():
    db = get_db()
    rows = db.execute("SELECT key, value FROM settings").fetchall()
    settings = dict(DEFAULT_SETTINGS)
    settings.update({r["key"]: r["value"] for r in rows})
    return settings


def save_settings(values):
    db = get_db()
    for key in DEFAULT_SETTINGS:
        if key in values:
            db.execute(
                "INSERT INTO settings (key, value) VALUES (?,?) "
                "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (key, values[key].strip()),
            )
    db.commit()


def default_channel(settings=None):
    db = get_db()
    settings = settings or get_settings()
    cid = settings.get("default_channel_id", "")
    if cid:
        row = db.execute("SELECT * FROM channels WHERE id=?", (cid,)).fetchone()
        if row:
            return row
    return db.execute("SELECT * FROM channels WHERE active=1 ORDER BY id LIMIT 1").fetchone()
