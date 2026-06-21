$ErrorActionPreference = "Stop"
$Bridge = Split-Path -Parent $MyInvocation.MyCommand.Path
$Url = if ($args.Count -gt 0) { $args[0] } else { "https://www.mivubi.com/" }

Set-Location $Bridge

Write-Host "=== TranslateIT Alpha V5 Internal Gate ===" -ForegroundColor Cyan
Write-Host "Target: $Url" -ForegroundColor DarkGray

Write-Host "`n=== Static V5 Wiring ===" -ForegroundColor Cyan
node audit-alpha-v5-default.mjs

Write-Host "`n=== Bridge Health ===" -ForegroundColor Cyan
Invoke-RestMethod http://127.0.0.1:8844/health | ConvertTo-Json -Depth 8

Write-Host "`n=== Media Capture Gate ===" -ForegroundColor Cyan
node audit-alpha-v4-media.mjs $Url

Write-Host "`n=== Structured Model Gate ===" -ForegroundColor Cyan
node audit-alpha-v5-model.mjs $Url

Write-Host "`nAlpha V5 internal gate finished." -ForegroundColor Green
