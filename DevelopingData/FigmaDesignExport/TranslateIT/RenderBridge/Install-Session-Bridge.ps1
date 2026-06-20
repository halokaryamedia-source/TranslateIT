$ErrorActionPreference = 'Stop'

$BridgeDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Launcher = Join-Path $BridgeDir 'Start-Render-Bridge-Session.ps1'
$ProtocolRoot = 'HKCU:\Software\Classes\translateit-render-bridge'

if (!(Test-Path $Launcher)) {
  Write-Host "[ERROR] Missing launcher: $Launcher" -ForegroundColor Red
  exit 1
}

if (!(Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host '[ERROR] Node.js is not installed or not available in PATH.' -ForegroundColor Red
  Write-Host 'Install Node.js LTS, then run this installer again.' -ForegroundColor Yellow
  exit 1
}

Write-Host '[INFO] Preparing Render Bridge dependencies...' -ForegroundColor Cyan
Set-Location $BridgeDir

if (!(Test-Path (Join-Path $BridgeDir 'node_modules'))) {
  npm install
}

npx playwright install chromium

Write-Host '[INFO] Registering on-demand bridge protocol...' -ForegroundColor Cyan

New-Item -Path $ProtocolRoot -Force | Out-Null
New-ItemProperty -Path $ProtocolRoot -Name '(default)' -Value 'URL:TranslateIT Render Bridge' -PropertyType String -Force | Out-Null
New-ItemProperty -Path $ProtocolRoot -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null

$CommandKey = Join-Path $ProtocolRoot 'shell\open\command'
New-Item -Path $CommandKey -Force | Out-Null
$Command = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $Launcher + '" "%1"'
Set-ItemProperty -Path $CommandKey -Name '(default)' -Value $Command

Write-Host '[DONE] Session Bridge protocol installed.' -ForegroundColor Green
Write-Host 'The Figma plugin can now start the bridge only when Import Data needs it.' -ForegroundColor Green
Write-Host 'The bridge auto-closes after it is idle.' -ForegroundColor Green
