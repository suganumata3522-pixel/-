@echo off
chcp 65001 >nul
cd /d "%~dp0"

rem Python の場所を探す(py ランチャー優先)
set "PY=python"
where py >nul 2>nul && set "PY=py"
%PY% --version >nul 2>nul
if errorlevel 1 (
    echo.
    echo  Python がインストールされていません。
    echo  https://www.python.org/downloads/ からインストールしてください。
    echo  ※インストール画面で「Add python.exe to PATH」に必ずチェックを入れてください。
    echo.
    pause
    exit /b 1
)

rem 初回のみ: 専用環境を作って必要な部品をインストール
if not exist ".venv" (
    echo 初回準備中です。1~2分お待ちください...
    %PY% -m venv .venv
)
call ".venv\Scripts\activate.bat"
pip install -q -r requirements.txt

echo.
echo  ツールを起動しました。ブラウザが自動で開きます。
echo  開かない場合は http://127.0.0.1:5050 をブラウザに入力してください。
echo  ※使っている間、この黒い画面は閉じないでください(最小化はOK)。
echo  ※終わるときはこの画面を閉じるだけです。データは保存されています。
echo.
python app.py
pause
