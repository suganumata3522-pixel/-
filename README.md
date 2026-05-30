# プロ野球ニュース → YouTube 動画 自動化

プロ野球の最新ニュースを自動収集し、最終的に YouTube 動画として公開するためのパイプライン。
**現在はステップ2 (動画ファイル生成) まで実装済み。**

## ロードマップ

- [x] **ステップ1**: ニュース収集 + 重複除去 + 記事本文抽出 + Claude による台本生成
- [x] **ステップ2**: VOICEVOX で音声合成 + 画像取得 (手動素材/Pexels/AI生成) + ffmpeg で `video.mp4` 生成
- [ ] ステップ3: YouTube Data API での自動アップロード + スケジュール実行

## 使い方

### セットアップ (Windows 推奨)

```powershell
# 1. Python パッケージ
pip install -r requirements.txt

# 2. .env を作って APIキーを埋める
copy .env.example .env
#   ANTHROPIC_API_KEY  ... 必須 (台本生成)
#   PEXELS_API_KEY     ... 任意 (フリー画像)
#   GOOGLE_API_KEY     ... 任意 (Nano Banana で画像生成)
#   OPENAI_API_KEY     ... 任意 (gpt-image-1 で画像生成)

# 3. VOICEVOX をインストールして起動 (http://127.0.0.1:50021 で待ち受け)
#    https://voicevox.hiroshiba.jp/

# 4. ffmpeg をインストール (gyan.dev の full build 推奨, PATH を通す)
#    https://www.gyan.dev/ffmpeg/builds/
```

### 実行

```powershell
# (a) ニュース収集だけ (Claude API 不要・無料で動作確認)
python main.py --skip-script

# (b) ニュース収集 + 台本生成
python main.py

# (c) 一気通貫: ニュース → 台本 → 音声 → 画像 → 動画 (video.mp4)
python main.py --build-video

# (d) すでに作った script.json を編集してから動画だけ作り直す
python main.py --video-from out\20260530_120000\script.json
```

出力は `out/<日時>/` に:
- `news.json` ... 上位記事のメタ + 抽出済み本文
- `script.json` ... タイトル候補 / 説明文 / タグ / チャプター(narration + image_keywords) / 出典
- `script.txt` ... ナレーション全文 (参考)
- `audio/chXX.wav` ... チャプターごとの VOICEVOX 音声
- `images/chXX/*.{png,jpg}` ... チャプターごとに集めた画像
- `subtitles.srt` ... 字幕
- `video.mp4` ... 最終動画

## 球団公式SNSなど「使いたいが自動取得が困難な素材」の扱い

Instagram/X の公式アカウント画像は API/ToS の制約で自動取得が現実的でないため、**手動配置方式** を採用しています。

```
assets/manual/
├── オープニング/
│   ├── stadium.jpg
│   └── logo.png
├── 01_話題1_xx選手_移籍/
│   ├── from_official_twitter.png   ← 自分で保存した画像
│   └── team_logo.png
└── ...
```

- フォルダ名は `script.json` の `chapters[].title` を slugify したものに合わせる (実行ログに必要なフォルダ名が出ます)
- 手動素材が足りない分は **Pexels → AI生成** の順で自動補完
- 球団ロゴ・報道写真の利用は **必ず各球団・媒体の利用規約を確認** してください

## 設定 (`config.yaml`)

| セクション | 役割 |
|---|---|
| `sources` | Google News / 任意 RSS / Reddit の取得元 |
| `aggregation` | 期間・重複しきい値・上位件数 |
| `script` | Claude モデル・尺・トーン・想定視聴者 |
| `tts.voicevox` | VOICEVOX エンドポイント・話者ID・速度/ピッチ |
| `images` | 画像取得の優先順位、AI生成プロバイダ (nano_banana / openai) |
| `video` | 解像度・fps |

## 著作権についての注意 (重要)

- 記事本文の長文引用はしない (要点のみ短く)
- 情報源(媒体名)を必ず明示する
- 推測・創作はしない
- **記事サイトから取得した報道写真をそのまま動画に使うのは著作権侵害になる可能性が高い**ため、画像は AI 生成 / フリー素材 / 自分で撮影したもの / 公式が再配布を許可している素材 に限定してください

## ディレクトリ構成

```
.
├── config.yaml
├── main.py
├── requirements.txt
├── assets/
│   └── manual/               手動配置の画像 (チャプターtitle ごとのサブフォルダ)
└── src/baseball_news/
    ├── aggregator.py         重複除去・ランキング
    ├── extractor.py          記事本文抽出
    ├── models.py             データクラス
    ├── script_generator.py   Claude による台本生成
    ├── tts.py                VOICEVOX クライアント
    ├── image_sources.py      Local / Pexels / Nano Banana / OpenAI
    ├── subtitles.py          SRT 生成
    ├── video.py              ffmpeg 呼び出し
    ├── build_video.py        TTS→画像→動画のオーケストレータ
    ├── cli.py                エントリポイント
    └── sources/
        ├── rss.py            Google News / 任意 RSS
        └── reddit.py         Reddit JSON
```
