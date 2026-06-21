param(
  [string]$Url = "https://www.mivubi.com/"
)

$ErrorActionPreference = "Stop"
$Bridge = Split-Path -Parent $MyInvocation.MyCommand.Path
$Plugin = Join-Path (Split-Path -Parent $Bridge) "plugin"
Set-Location $Bridge

Write-Host "=== TranslateIT V11.2 Local Test ===" -ForegroundColor Cyan
Write-Host "Bridge: $Bridge"
Write-Host "Plugin: $Plugin"
Write-Host "URL: $Url"

Write-Host "`n=== Install dependencies ===" -ForegroundColor Cyan
& npm.cmd install
& npx.cmd playwright install chromium

Write-Host "`n=== Syntax check ===" -ForegroundColor Cyan
node --check "$Bridge\server.mjs"
node --check "$Bridge\smoke-v11-1.mjs"
node --check "$Bridge\audit-v11-1-professional.mjs"
node --check "$Bridge\audit-v11-2-template-readiness.mjs"
node --check "$Plugin\code.js"

Write-Host "`n=== Restart bridge ===" -ForegroundColor Cyan
Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object { $_.CommandLine -match "RenderBridge|server.mjs" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"cd '$Bridge'; node server.mjs`""
Start-Sleep 3

Write-Host "`n=== Health ===" -ForegroundColor Cyan
Invoke-RestMethod "http://127.0.0.1:8844/health" | Format-List

Write-Host "`n=== V11.2 Bridge Smoke Test ===" -ForegroundColor Cyan
node "$Bridge\smoke-v11-1.mjs" $Url

Write-Host "`n=== V11.2 Template Readiness Audit ===" -ForegroundColor Cyan
node "$Bridge\audit-v11-2-template-readiness.mjs" $Url

Write-Host "`n=== Figma Next Step ===" -ForegroundColor Green
Write-Host "Do not claim professional-ready until Figma canvas is visually checked."
Write-Host "Expected frames:"
Write-Host "01 Screenshot Preview / Pure Reference"
Write-Host "02 Rebuild Plan / AI Interpretation"
Write-Host "03 UI Components / Structured Library"
Write-Host "04 Editable Result / Clean Structured Draft"
Write-Host "05 Audit / Design Clone Notes"
Write-Host "Editable Result should use Header/Hero/Content/Gallery/Footer templates."
