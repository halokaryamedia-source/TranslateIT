param(
  [string]$Url = "https://www.mivubi.com/"
)

$ErrorActionPreference = "Stop"
$Bridge = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Bridge

Write-Host "=== TranslateIT V11.1 Local Test ===" -ForegroundColor Cyan
Write-Host "Bridge: $Bridge"
Write-Host "URL: $Url"

Write-Host "`n=== Install dependencies ===" -ForegroundColor Cyan
& npm.cmd install
& npx.cmd playwright install chromium

Write-Host "`n=== Syntax check ===" -ForegroundColor Cyan
node --check "$Bridge\server.mjs"
node --check "$Bridge\audit-v11-1-professional.mjs"
node --check "$Bridge\smoke-v11-1.mjs"

Write-Host "`n=== Restart bridge ===" -ForegroundColor Cyan
Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object { $_.CommandLine -match "RenderBridge|server.mjs" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"cd '$Bridge'; node server.mjs`""
Start-Sleep 3

Write-Host "`n=== Health ===" -ForegroundColor Cyan
Invoke-RestMethod "http://127.0.0.1:8844/health" | Format-List

Write-Host "`n=== V11.1 Smoke Test ===" -ForegroundColor Cyan
node "$Bridge\smoke-v11-1.mjs" $Url

Write-Host "`n=== V11.1 Honest Audit ===" -ForegroundColor Cyan
node "$Bridge\audit-v11-1-professional.mjs" $Url

Write-Host "`n=== Figma Next Step ===" -ForegroundColor Green
Write-Host "Reload the Figma plugin, paste $Url, then click Import Design Clone."
Write-Host "Expected frames:"
Write-Host "01 Screenshot Preview / Pure Reference"
Write-Host "02 Rebuild Plan / AI Interpretation"
Write-Host "03 UI Components / Structured Library"
Write-Host "04 Editable Result / Clean Structured Draft"
Write-Host "05 Audit / Design Clone Notes"
