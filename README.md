# baseball-news

プロ野球の話題を 12 ソースから自動収集し、選手プロフィール (通算成績含む) を付けて
Claude で**台本テキスト**を生成するツールです。

> 音声収録・動画編集・サムネ作成は手動で行う想定です。
> 本ツールが出力するのは「台本 JSON」までです。

## 収集ソース (12)

1. Yahoo!ニュース (野球カテゴリ) RSS
2. Google News RSS
3. スポーツ紙 5 紙 RSS (日刊スポーツ / スポニチ / サンスポ / デイリー / 報知)
4. 野球専門メディア RSS (フルカウント / ベースボールキング / Number Web)
5. はてなブックマーク RSS
6. なんJ系まとめサイト RSS
7. Google Trends
8. YouTube Data API v3 (要 `YOUTUBE_API_KEY`)
9. NPB 公式 (試合速報・順位表)
10. X / Twitter API (要 `X_BEARER_TOKEN`、Basic 課金 — 未設定なら自動 skip)
11. Yahoo!リアルタイム検索 (スクレイプ)
12. Bluesky (要 `BLUESKY_HANDLE` / `BLUESKY_APP_PASSWORD` — 未設定なら自動 skip)

## セットアップ

```sh
python -m venv .venv
. .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # ANTHROPIC_API_KEY を最低限セット
```

## 使い方

```sh
# 12 ソースから話題収集 → out/topics_YYYYMMDD.json
python main.py collect

# 上記の上位話題から台本生成 → out/script_<id>.json
python main.py script <topic_id>
```

## 開発状況

現在 Phase 1 (リポジトリ刷新) 完了。Phase 2 以降で各 collector を実装します。
