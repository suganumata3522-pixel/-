# プロ野球ニュース → YouTube 動画 自動化

プロ野球の最新ニュースを自動収集し、最終的に YouTube 動画として公開するためのパイプライン。
**現在はステップ3 (球団テーマカラー対応の情報スライド + サムネ生成) まで実装済み。**

## デフォルトのチャンネルプリセット

`config.yaml` の初期値は以下を狙っています:

- **尺**: 3〜5分のショート (`script.target_minutes: 4`)
- **話者**: VOICEVOX 四国めたん 1人読み (`tts.voicevox.speaker: 2`)
- **本編ナレーション**: 落ち着いた解説調 (`script.tone`)
- **画面テロップ / サムネ**: 派手なキャッチ + 数字強調 (`script.thumbnail_tone`)
- **背景画像**: 写真調 (Pexels → Nano Banana の photorealistic 生成)
- **本編スライド**: 各チャプターを 1 枚の情報スライド (タイトルバー + 箇条書き + 統計テーブル + 強調コールアウト + フッター) として描画
- **テーマカラー**: 台本から主役球団を自動推定し、12 球団のテーマカラーに切り替え

別ジャンル/別チャンネルに転用するときは `config.yaml` と `src/baseball_news/teams.py` を書き換えてください。

## ロードマップ

- [x] **ステップ1**: ニュース収集 + 重複除去 + 記事本文抽出 + Claude による台本生成
- [x] **ステップ2**: VOICEVOX で音声合成 + 画像取得 (手動素材/Pexels/AI生成) + ffmpeg で `video.mp4` 生成
- [x] **ステップ3**: Pillow による情報スライド + サムネ生成 (球団テーマカラー + 強調マークアップ)
- [ ] ステップ4: YouTube Data API での自動アップロード + スケジュール実行

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

# 5. (任意) 球団ロゴ画像を assets/manual/logos/ に配置
#    詳細は assets/manual/logos/README.md
```

### 実行

```powershell
# (a) ニュース収集だけ (Claude API 不要・無料で動作確認)
python main.py --skip-script

# (b) ニュース収集 + 台本生成
python main.py

# (c) 一気通貫: ニュース → 台本 → 音声 → スライド → 動画 (video.mp4) + サムネ
python main.py --build-video

# (d) すでに作った script.json を編集してから動画だけ作り直す
python main.py --video-from out\20260530_120000\script.json
```

出力は `out/<日時>/` に:
- `news.json` ... 上位記事のメタ + 抽出済み本文
- `script.json` ... タイトル候補 / 説明文 / タグ / `thumbnail` / チャプター(narration + image_keywords + slide) / 出典
- `script.txt` ... ナレーション全文 (参考)
- `audio/chXX.wav` ... チャプターごとの VOICEVOX 音声
- `backgrounds/chXX/*` ... チャプターごとの背景写真 (1枚)
- `slides/slide_chXX.png` ... チャプターごとに合成された情報スライド (1枚)
- `thumbnail.jpg` ... YouTube 用サムネ (球団テーマカラー + ロゴ + 派手キャッチ)
- `video.mp4` ... 最終動画

## 本編スライドの構造

リファレンスにしたインフォグラフィック型のレイアウト:

| 領域 | 用途 | script.json 上のキー |
|---|---|---|
| 上部 中央 タイトルバー | チャプタータイトル | `chapters[].title` |
| 上部 右 サブバッジ | 補足情報 (年齢/年目 等, 任意) | `chapters[].slide.subtitle` |
| 左 大 箇条書きパネル | 5項目までの解説 (強調マークアップ可) | `chapters[].slide.bullets[]` |
| 右 サブテーブル | 統計などの 2 列テーブル (任意) | `chapters[].slide.right_box.{title,rows}` |
| 中央 下 矢印+強調ボックス | 転換点・最新トピック (任意) | `chapters[].slide.highlight.{text,with_arrow}` |
| 最下 黒バー フッター | 次予告・締めテロップ (任意) | `chapters[].slide.footer` |

### 強調マークアップ

`bullets` と `highlight.text` の中で `[文字列|色]` 形式で部分強調できます。

| 色キー | 用途 |
|---|---|
| `青` / `blue` | 球速低下・防御率悪化・年齢・継続事項などの「事実値」 |
| `赤` / `red`  | 復帰・離脱・抹消・移籍などの「重要な転換点」 |
| `黄` / `yellow` | 球団テーマカラー (使用頻度低) |
| `白` / `白` / `黒` / `black` | 強制色指定 |

例:

```text
"bullets": [
  "平均球速も[142キロ|青]から[139キロ|青]に低下",
  "3回途中3失点。[左太もも負傷|赤]"
]
```

## サムネの構造

リファレンスにしたサムネのレイアウト:

| 領域 | 用途 | script.json 上のキー |
|---|---|---|
| 上部 黄色 (球団 primary) ヘッドラインボックス | 短い予告 | `thumbnail.headline` |
| 中央 球団ロゴ (無ければ球団名テキスト) | チームの主張 | `thumbnail.team` |
| 下部 大きなメインキャッチ (派手 accent 色 + 黒縁) | 1 行目 | `thumbnail.main` |
| 下部 サブキャッチ | 2 行目 (任意) | `thumbnail.sub` |
| 背景写真 | 球場・客席など | `thumbnail.keywords[]` |

## 球団テーマカラーの自動切替

`src/baseball_news/teams.py` に NPB 12 球団のパレットを定義しています。

- 「主役球団」は次の優先順で決まります:
  1. `script.thumbnail.team` で Claude が指定したキー
  2. 台本テキスト全体での球団エイリアス出現数の最多球団
  3. どちらも特定できなければ汎用 (`default`) パレット
- パレットには `primary` (上部・下部ボックス背景), `accent` (派手アクセント), `highlight_blue` / `highlight_red` (本文強調) などが入っており、サムネと本編スライドの全要素が球団色に統一されます。

## 球団公式SNSなど「使いたいが自動取得が困難な素材」の扱い

Instagram/X の公式アカウント画像は API/ToS の制約で自動取得が現実的でないため、**手動配置方式** を採用しています。

- スライドの背景は基本 Pexels / AI 生成の汎用写真
- 球団ロゴだけは `assets/manual/logos/<team_key>.png` に手動配置 (詳細は同ディレクトリの README)
- 個別の選手写真などをチャプター背景として使いたい場合は `assets/manual/<chapter_slug>/` に置く

## 設定 (`config.yaml`)

| セクション | 役割 |
|---|---|
| `sources` | Google News / 任意 RSS / Reddit の取得元 |
| `aggregation` | 期間・重複しきい値・上位件数 |
| `script` | Claude モデル・尺・本編トーン・サムネトーン・想定視聴者 |
| `tts.voicevox` | VOICEVOX エンドポイント・話者ID・速度/ピッチ |
| `images` | スライド背景の取得優先順位、AI生成プロバイダ (nano_banana / openai) |
| `video` | 解像度・fps・SRT字幕を上に重ねるか (`subtitles`, 既定 false) |
| `thumbnail` | サムネ + スライド共通の Pillow フォントパス |

## 著作権についての注意 (重要)

- 記事本文の長文引用はしない (要点のみ短く)
- 情報源(媒体名)を必ず明示する
- 推測・創作はしない
- **記事サイトから取得した報道写真をそのまま動画に使うのは著作権侵害になる可能性が高い**ため、画像は AI 生成 / フリー素材 / 自分で撮影したもの / 公式が再配布を許可している素材 に限定してください
- **球団ロゴ・標章は各球団・親会社の登録商標および著作物**です。`assets/manual/logos/` に配置するロゴ画像の利用範囲は、各球団の素材利用規約を必ず事前に確認してください

## ディレクトリ構成

```
.
├── config.yaml
├── main.py
├── requirements.txt
├── assets/
│   └── manual/
│       ├── logos/             球団ロゴ (手動配置)
│       └── <chapter_slug>/    任意: チャプター背景に使う手動画像
└── src/baseball_news/
    ├── aggregator.py         重複除去・ランキング
    ├── extractor.py          記事本文抽出
    ├── models.py             データクラス
    ├── script_generator.py   Claude による台本生成 (thumbnail + slide スキーマ)
    ├── tts.py                VOICEVOX クライアント
    ├── image_sources.py      Local / Pexels / Nano Banana / OpenAI
    ├── subtitles.py          SRT 生成
    ├── video.py              ffmpeg 呼び出し
    ├── teams.py              NPB 12球団テーマカラー + 球団検出
    ├── slide_renderer.py     Pillow でサムネ / 本編スライドを合成
    ├── thumbnail.py          サムネ + チャプタースライド生成の薄ラッパ
    ├── build_video.py        TTS→背景→スライド→動画→サムネのオーケストレータ
    ├── cli.py                エントリポイント
    └── sources/
        ├── rss.py            Google News / 任意 RSS
        └── reddit.py         Reddit JSON
```
