# 바탕화면에 "HSK 블록퍼즐" 아이콘을 만듭니다. (항상 Chrome으로 실행)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$game = Join-Path $root 'index.html'
$icon = Join-Path $root 'icons\icon.ico'

$chrome = $null
foreach ($key in @(
  'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe',
  'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe',
  'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe')) {
  if (Test-Path $key) { $chrome = (Get-ItemProperty $key).'(default)'; if ($chrome) { break } }
}
if (-not $chrome) {
  foreach ($p in @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
                   "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
                   "$env:LocalAppData\Google\Chrome\Application\chrome.exe")) {
    if (Test-Path $p) { $chrome = $p; break }
  }
}
if (-not $chrome) { Write-Host 'Chrome을 찾지 못했어요. https://www.google.com/chrome/ 에서 설치해 주세요.'; exit 1 }

$desktop = [Environment]::GetFolderPath('Desktop')
$lnk = Join-Path $desktop 'HSK 블록퍼즐.lnk'
$sh = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
$sh.TargetPath = $chrome
$sh.Arguments = '--new-window "' + $game + '"'
$sh.WorkingDirectory = $root
$sh.IconLocation = $icon
$sh.Description = 'JD CHINESE HSK 블록퍼즐'
$sh.Save()
Write-Host "바탕화면에 아이콘을 만들었어요: $lnk"
