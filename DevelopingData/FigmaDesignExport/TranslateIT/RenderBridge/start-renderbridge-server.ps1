$ErrorActionPreference = 'Stop'
$BridgeRoot = $PSScriptRoot
cd $BridgeRoot

Write-Host 'TranslateIT RenderBridge Server' -ForegroundColor Green
Write-Host "BridgeRoot: $BridgeRoot"
Write-Host 'Port: http://127.0.0.1:8844'

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

Write-Host 'Starting RenderBridge. Keep this window open while using the Figma plugin.' -ForegroundColor Yellow
Write-Host 'Health URL: http://127.0.0.1:8844/health'
Write-Host ''
node .\server.mjs
