$ErrorActionPreference = "Stop"
$Bridge = Split-Path -Parent $MyInvocation.MyCommand.Path
$Url = if ($args.Count -gt 0) { $args[0] } else { "https://www.mivubi.com/" }

Set-Location $Bridge
Write-Host "=== TranslateIT Alpha V5 Strict Gate ===" -ForegroundColor Cyan
Write-Host "Target: $Url" -ForegroundColor DarkGray

npm.cmd install
npx.cmd playwright install chromium

$Log = Join-Path $Bridge "bridge-v5.log"
Start-Process powershell -WindowStyle Hidden -ArgumentList "-ExecutionPolicy Bypass -Command `"cd '$Bridge'; node start-alpha-v5.mjs > bridge-v5.log 2>&1`""
Start-Sleep 8

$Health = Invoke-RestMethod http://127.0.0.1:8844/health
$Health | ConvertTo-Json -Depth 8
if (-not ($Health.adapter -match "v5|enhanced|structured")) {
  throw "Bridge health is not V5 enhanced structured. Adapter: $($Health.adapter)"
}
if ($Health.publicVersion -ne "Version 0.1 - Alpha") {
  throw "Unexpected public version: $($Health.publicVersion)"
}

node audit-alpha-v5-single-engine.mjs
node audit-alpha-v5-default.mjs
node audit-alpha-v5-media.mjs $Url
node audit-alpha-v5-model.mjs $Url
node audit-alpha-v5-model-strict.mjs $Url

Write-Host "`nAlpha V5 strict gate finished." -ForegroundColor Green
Write-Host "Bridge log: $Log" -ForegroundColor DarkGray
