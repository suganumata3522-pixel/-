# プロ野球ニュース → YouTube 動画 自動化

プロ野球の最新ニュースを自動収集し、最終的に YouTube 動画として公開するためのパイプライン。
**現在はステップ1 (ニュース取得 + 台本生成) まで実装済み。**

## ロードマップ

- [x] **ステップ1**: ニュース収集 + 重複除去 + 記事本文抽出 + Claude による台本生成
- [ ] ステップ2: VOICEVOX 等での音声合成 + 画像スライドショー + ffmpeg で動画ファイル生成
- [ ] ステップ3: YouTube Data API での自動アップロード + GitHub Actions でのスケジュール実行

## 使い方

```bash
pip install -r requirements.txt
cp .env.example .env   # ANTHROPIC_API_KEY を埋める

# ニュース収集のみ (Claude API 不要・無料で動作確認できる)
python main.py --skip-script

# 台本生成まで実行
python main.py
```

出力は `out/<日時>/` に:
- `news.json` ... 上位記事のメタ + 抽出済み本文
- `script.json` ... タイトル候補 / 説明文 / タグ / チャプター / 台本本文 / 出典
- `script.txt` ... ナレーション本文だけ抜粋 (TTS への入力に使う)

## 設定

`config.yaml` で調整:
- 検索クエリ (Google News RSS)
- 追加 RSS フィード
- 重複判定しきい値・直近何時間まで対象にするか・上位何件か
- Claude モデル・目標尺・トーン・想定視聴者

## 取得元

- **Google News RSS** (複数の検索クエリ): メインの取得源
- **任意の RSS フィード**: `config.yaml` の `rss_feeds` に追加可能
- **Reddit** (r/npb, r/baseball): 補助的に取得

## 著作権についての注意 (重要)

このステップでは台本のテキスト生成のみ行います。Claude には以下を厳守させています:

- 記事本文の長文引用はしない (要点のみ短く)
- 情報源(媒体名)を必ず明示する
- 推測・創作はしない

**今後のステップ2で画像/映像素材を扱う際は、必ず以下を守ってください:**
- 記事サイトから取得した報道写真をそのまま動画に使うのは **著作権侵害** になる可能性が高い
- 球団公式 SNS のプレス用画像、Wikipedia (CC BY-SA, クレジット表記必須)、フリー素材サイト、AI 生成画像 などの利用を推奨

## ディレクトリ構成

```
.
├── config.yaml
├── main.py
├── requirements.txt
└── src/
    └── baseball_news/
        ├── aggregator.py        重複除去・ランキング
        ├── extractor.py         記事本文抽出
        ├── models.py            データクラス
        ├── script_generator.py  Claude による台本生成
        ├── cli.py               エントリポイント
        └── sources/
            ├── rss.py           Google News / 任意 RSS
            └── reddit.py        Reddit JSON
```
