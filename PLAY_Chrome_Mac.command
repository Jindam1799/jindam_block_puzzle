#!/bin/bash
# HSK Block Puzzle - 항상 Google Chrome으로 실행
cd "$(dirname "$0")"
if ! open -a "Google Chrome" "index.html" 2>/dev/null; then
  echo "Google Chrome이 없어요. https://www.google.com/chrome/ 에서 설치해 주세요."
  open "index.html"
fi
