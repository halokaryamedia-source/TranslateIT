param([string]$TargetUrl = 'https://www.mivubi.com/')
$ErrorActionPreference = 'Continue'
$BridgeRoot = $PSScriptRoot
$Reports = Join-Path $BridgeRoot 'reports'
$ExitCodes = Join-Path $Reports 'self-audit-exit-codes.txt'
$ZipPath = Join-Path $BridgeRoot 'TranslateIT-SelfAudit-Pack.zip'
$PackRoot = Join-Path $BridgeRoot 'self-audit-pack'
Write-Host 'TranslateIT Hybrid Useful Output Audit' -ForegroundColor Green
& (Join-Path $BridgeRoot 'run-production-readiness-audit-v2.ps1') -TargetUrl $TargetUrl
cd $BridgeRoot
Write-Host "`n=== hybrid-useful-output ===" -ForegroundColor Cyan
node .\tests\test-hybrid-useful-output.mjs $TargetUrl
$code = $LASTEXITCODE
if ($null -eq $code) { $code = 0 }
Add-Content -Path $ExitCodes -Value "hybrid-useful-output=$code"
if (Test-Path $PackRoot) { Remove-Item $PackRoot -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Force -Path $PackRoot | Out-Null
Copy-Item -Path $Reports -Destination (Join-Path $PackRoot 'reports') -Recurse -Force
Compress-Archive -Path (Join-Path $PackRoot '*') -DestinationPath $ZipPath -Force
Write-Host "`nHYBRID USEFUL AUDIT DONE" -ForegroundColor Green
Write-Host $ZipPath -ForegroundColor Yellow
if (Test-Path $ExitCodes) { Get-Content $ExitCodes }
