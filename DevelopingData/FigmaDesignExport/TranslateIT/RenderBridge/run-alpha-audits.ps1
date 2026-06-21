param(
  [string]$Url = "https://www.mivubi.com/"
)

$ErrorActionPreference = "Stop"
$Bridge = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Bridge

Write-Host "=== TranslateIT Version 0.1 - Alpha Audits ===" -ForegroundColor Cyan
Write-Host "URL: $Url"
Write-Host "Note: start server.mjs separately before running this script."

node --check "$Bridge\server.mjs"
node --check "$Bridge\audit-alpha-quality-gate.mjs"
node --check "$Bridge\audit-alpha-ui-library-polish.mjs"
node --check "$Bridge\audit-alpha-template-safety.mjs"
node --check "$Bridge\preview-alpha-design-clone.mjs"

Write-Host "`n=== Alpha Quality Gate ===" -ForegroundColor Cyan
node "$Bridge\audit-alpha-quality-gate.mjs" $Url

Write-Host "`n=== Alpha UI Library Polish Audit ===" -ForegroundColor Cyan
node "$Bridge\audit-alpha-ui-library-polish.mjs" $Url

Write-Host "`n=== Alpha Template Safety Audit ===" -ForegroundColor Cyan
node "$Bridge\audit-alpha-template-safety.mjs" $Url

Write-Host "`n=== Alpha HTML Preview ===" -ForegroundColor Cyan
node "$Bridge\preview-alpha-design-clone.mjs" $Url
