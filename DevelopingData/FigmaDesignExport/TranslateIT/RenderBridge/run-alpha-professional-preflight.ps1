param(
  [string]$Url = "https://www.mivubi.com/"
)

$ErrorActionPreference = "Stop"
$Bridge = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Bridge

Write-Host "=== TranslateIT Version 0.1 - Alpha Professional Preflight ===" -ForegroundColor Cyan
Write-Host "URL: $Url"
Write-Host "Goal: run every non-Figma validation gate before manual testing."

Write-Host "`n=== Install / Environment ===" -ForegroundColor Cyan
& npm.cmd install
& npx.cmd playwright install chromium

Write-Host "`n=== Static Syntax Checks ===" -ForegroundColor Cyan
node --check "$Bridge\server.mjs"
node --check "$Bridge\smoke-v11-1.mjs"
node --check "$Bridge\audit-alpha-code-contract.mjs"
node --check "$Bridge\audit-alpha-quality-gate.mjs"
node --check "$Bridge\audit-alpha-ui-library-polish.mjs"
node --check "$Bridge\audit-alpha-template-safety.mjs"
node --check "$Bridge\audit-alpha-pretest-gate.mjs"
node --check "$Bridge\preview-alpha-semantic.mjs"
node --check "$Bridge\preview-alpha-design-clone.mjs"
node --check "$Bridge\..\plugin\code.js"

Write-Host "`n=== Restart Render Bridge ===" -ForegroundColor Cyan
Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object { $_.CommandLine -match "server.mjs|RenderBridge" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"cd '$Bridge'; node server.mjs`""
Start-Sleep 4

Write-Host "`n=== Runtime Smoke Test ===" -ForegroundColor Cyan
node "$Bridge\smoke-v11-1.mjs" $Url

Write-Host "`n=== Static Code Contract ===" -ForegroundColor Cyan
node "$Bridge\audit-alpha-code-contract.mjs"

Write-Host "`n=== Alpha Quality Gate ===" -ForegroundColor Cyan
node "$Bridge\audit-alpha-quality-gate.mjs" $Url

Write-Host "`n=== Alpha Pre-Test Gate ===" -ForegroundColor Cyan
node "$Bridge\audit-alpha-pretest-gate.mjs" $Url

Write-Host "`n=== UI Library Polish Audit ===" -ForegroundColor Cyan
node "$Bridge\audit-alpha-ui-library-polish.mjs" $Url

Write-Host "`n=== Template Safety Audit ===" -ForegroundColor Cyan
node "$Bridge\audit-alpha-template-safety.mjs" $Url

Write-Host "`n=== Semantic Preview ===" -ForegroundColor Cyan
node "$Bridge\preview-alpha-semantic.mjs" $Url

Write-Host "`n=== Legacy Preview Compatibility ===" -ForegroundColor Cyan
node "$Bridge\preview-alpha-design-clone.mjs" $Url

Write-Host "`n=== Preflight Complete ===" -ForegroundColor Green
Write-Host "Generated: $Bridge\alpha-semantic-preview.html"
Write-Host "Generated: $Bridge\alpha-design-clone-preview.html"
Write-Host "Important: this still does not replace real Figma visual validation."
