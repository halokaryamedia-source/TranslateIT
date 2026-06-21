$ErrorActionPreference = 'Stop'

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptRoot '..\..\..')).Path
$BridgeRoot = Join-Path $ScriptRoot 'RenderBridge'

Write-Host 'TranslateIT One-Terminal Starter' -ForegroundColor Green
Write-Host "RepoRoot:   $RepoRoot"
Write-Host "BridgeRoot: $BridgeRoot"
Write-Host ''

cd $RepoRoot

Write-Host 'Updating translateit-clean-engine...' -ForegroundColor Cyan
git fetch origin
git checkout translateit-clean-engine
git pull --ff-only origin translateit-clean-engine

cd $BridgeRoot

Write-Host ''
Write-Host 'Preparing RenderBridge...' -ForegroundColor Cyan
Get-NetTCPConnection -LocalPort 8844 -ErrorAction SilentlyContinue | ForEach-Object {
  try {
    if ($_.OwningProcess) {
      Write-Host "Stopping existing process on port 8844: $($_.OwningProcess)"
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  } catch {}
}

if (!(Test-Path 'node_modules')) {
  Write-Host 'Installing npm dependencies...'
  npm.cmd install
}

Write-Host ''
Write-Host 'RenderBridge is starting in this same terminal.' -ForegroundColor Yellow
Write-Host 'Keep this terminal open while using the Figma plugin.' -ForegroundColor Yellow
Write-Host 'Health URL: http://127.0.0.1:8844/health'
Write-Host ''

node .\server.mjs
