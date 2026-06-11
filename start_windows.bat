@echo off
rem 電脳せどり管理ツール 起動スクリプト(日本語Windows向け Shift-JIS版)
cd /d "%~dp0"

set "PY=python"
where /q py && set "PY=py"
%PY% --version
if errorlevel 1 (
    echo.
    echo  Python がインストールされていません。
    echo  https://www.python.org/downloads/ からインストールしてください。
    echo  ※インストール画面で「Add python.exe to PATH」に必ずチェックを入れてください。
    echo.
    pause
    exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
    echo 初回準備中です。1~2分お待ちください...
    %PY% -m venv .venv
)
if not exist ".venv\Scripts\python.exe" (
    echo.
    echo  準備に失敗しました。この画面のスクリーンショットを添えてご相談ください。
    echo.
    pause
    exit /b 1
)

".venv\Scripts\python.exe" -m pip install -q -r requirements.txt

echo.
echo  ツールを起動しました。ブラウザが自動で開きます。
echo  開かない場合は http://127.0.0.1:5050 をブラウザに入力してください。
echo  ※使っている間、この黒い画面は閉じないでください。最小化はOKです。
echo  ※終わるときはこの画面を閉じるだけです。データは保存されています。
echo.
".venv\Scripts\python.exe" app.py
pause
