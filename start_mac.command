#!/bin/bash
cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
    echo ""
    echo " Python がインストールされていません。"
    echo " https://www.python.org/downloads/ からインストールしてください。"
    echo ""
    read -r -p "Enterキーで閉じます"
    exit 1
fi

# 初回のみ: 専用環境を作って必要な部品をインストール
if [ ! -d ".venv" ]; then
    echo "初回準備中です。1〜2分お待ちください..."
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt

echo ""
echo " ツールを起動しました。ブラウザが自動で開きます。"
echo " 開かない場合は http://127.0.0.1:5050 をブラウザに入力してください。"
echo " ※使っている間、このウィンドウは閉じないでください(最小化はOK)。"
echo " ※終わるときはこのウィンドウを閉じるだけです。データは保存されています。"
echo ""
python app.py
