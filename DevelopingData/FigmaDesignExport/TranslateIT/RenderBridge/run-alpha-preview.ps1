param(
  [string]$Url = "https://www.mivubi.com/"
)

$ErrorActionPreference = "Stop"
$Bridge = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Bridge

Write-Host "=== TranslateIT Version 0.1 - Alpha Preview ===" -ForegroundColor Cyan
Write-Host "URL: $Url"

& npm.cmd install
& npx.cmd playwright install chromium
node --check "$Bridge\server.mjs"
node --check "$Bridge\preview-alpha-design-clone.mjs"
node --check "$Bridge\audit-alpha-template-safety.mjs"

Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object { $_.CommandLine -match "RenderBridge|server.mjs" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"cd '$Bridge'; node server.mjs`""
Start-Sleep 3

Write-Host "`n=== Alpha Template Safety Audit ===" -ForegroundColor Cyan
node "$Bridge\audit-alpha-template-safety.mjs" $Url

Write-Host "`n=== Alpha HTML Preview ===" -ForegroundColor Cyan
node "$Bridge\preview-alpha-design-clone.mjs" $Url
Start-Process "$Bridge\alpha-design-clone-preview.html"
