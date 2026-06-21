$ErrorActionPreference = "Stop"
$Bridge = Split-Path -Parent $MyInvocation.MyCommand.Path
$Url = if ($args.Count -gt 0) { $args[0] } else { "https://www.mivubi.com/" }

Set-Location $Bridge

Write-Host "=== TranslateIT Alpha V5 Internal Gate ===" -ForegroundColor Cyan
Write-Host "Target: $Url" -ForegroundColor DarkGray

Write-Host "`n=== Plugin Syntax Readiness Gate ===" -ForegroundColor Cyan
node audit-alpha-v5-plugin-syntax.mjs

Write-Host "`n=== Single Active Engine Gate ===" -ForegroundColor Cyan
node audit-alpha-v5-single-engine.mjs

Write-Host "`n=== Static Strict V5 Wiring ===" -ForegroundColor Cyan
node audit-alpha-v5-default.mjs

Write-Host "`n=== Bridge Health ===" -ForegroundColor Cyan
Invoke-RestMethod http://127.0.0.1:8844/health | ConvertTo-Json -Depth 8

Write-Host "`n=== Strict V5 Media Capture Gate ===" -ForegroundColor Cyan
node audit-alpha-v5-media.mjs $Url

Write-Host "`n=== Structured Model Gate ===" -ForegroundColor Cyan
node audit-alpha-v5-model.mjs $Url

Write-Host "`n=== Strict V5 Model Gate ===" -ForegroundColor Cyan
node audit-alpha-v5-model-strict.mjs $Url

Write-Host "`nAlpha V5 internal gate finished." -ForegroundColor Green
