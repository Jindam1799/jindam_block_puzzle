@echo off
rem HSK Block Puzzle - always open in Google Chrome
cd /d "%~dp0"
start "" chrome --new-window "%~dp0index.html"
if errorlevel 1 (
  echo Google Chrome was not found. Please install Chrome: https://www.google.com/chrome/
  pause
)
