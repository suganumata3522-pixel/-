@echo off
chcp 65001 >nul
rem ===== ToDoリストを「タブなしの独立ウィンドウ」で開く =====
rem このバッチと同じフォルダにある todo.html を、Edge または Chrome の
rem アプリモード（アドレスバー・タブなし）で開きます。

set "DIR=%~dp0"
set "URL=file:///%DIR:\=/%todo.html"

rem --- Microsoft Edge を優先 ---
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%EDGE%" (
  start "" "%EDGE%" --app="%URL%" --window-size=420,640
  goto :eof
)

rem --- Edge が無ければ Google Chrome ---
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" --app="%URL%" --window-size=420,640
  goto :eof
)

rem --- どちらも無ければ既定のブラウザで開く ---
start "" "%URL%"
