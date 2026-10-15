@echo off
rem Creates a desktop shortcut (with game icon) that always opens in Chrome
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\make_shortcut.ps1"
pause
