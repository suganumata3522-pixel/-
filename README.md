# 構造設計ナビ

建築の構造設計・構造力学をわかりやすく解説する学習サイトです。
HTML/CSS/JavaScript のみの静的サイトで、ビルド不要・そのままホスティングできます。

## 構成

```
kouzou-site/
├── index.html                      # トップページ
├── about.html                      # サイト概要・免責事項
├── privacy.html                    # プライバシーポリシー（AdSense対応）
├── 運営マニュアル.md                # 開き方・編集・記事追加・収益化の手引き
├── css/style.css                   # 共通スタイル
├── js/main.js                      # モバイルメニューなど共通JS
├── articles/
│   ├── danmen-niji-moment.html     # 断面二次モーメントの解説
│   ├── tawami.html                 # 梁のたわみ公式の解説
│   ├── rahmen-brace.html           # ラーメン構造とブレース構造
│   └── kyoyo-oryokudo.html         # 許容応力度計算とルート
└── tools/
    └── section-calculator.html     # 断面性能計算ツール（A・I・Z・i）
```

## ローカルでの確認

```bash
cd kouzou-site
python3 -m http.server 8000
# → http://localhost:8000 をブラウザで開く
```

## 公開方法（GitHub Pages）

1. リポジトリの Settings → Pages を開く
2. Source を「Deploy from a branch」にし、ブランチとフォルダを選択
3. ルート公開にしたい場合は、`kouzou-site/` の中身を専用リポジトリ
   （例: `kouzou-navi`）のルートに置くのが簡単

独自ドメイン（例: kouzou-navi.com）を取得して設定すると、
広告審査（Google AdSense など）やSEOの面で有利です。

## 記事を追加するには

`articles/` 内の既存記事をコピーして、本文・タイトル・meta description を
書き換えるのが手軽です。追加後は以下を忘れずに：

- `index.html` の記事カード一覧にリンクを追加
- 各記事のサイドバー「関連記事」に相互リンクを追加
