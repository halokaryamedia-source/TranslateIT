param(
  [string]$TargetUrl = 'https://www.mivubi.com/'
)

$ErrorActionPreference = 'Continue'
$BridgeRoot = $PSScriptRoot
$Reports = Join-Path $BridgeRoot 'reports'
$PackRoot = Join-Path $BridgeRoot 'self-audit-pack'
$ZipPath = Join-Path $BridgeRoot 'TranslateIT-SelfAudit-Pack.zip'
$ExitCodes = Join-Path $Reports 'self-audit-exit-codes.txt'

Write-Host 'TranslateIT Final Professional Audit Pack' -ForegroundColor Green
Write-Host "TargetUrl: $TargetUrl"

& (Join-Path $BridgeRoot 'run-local-self-audit-pack.ps1') -TargetUrl $TargetUrl

cd $BridgeRoot
Write-Host "`n=== professional-gate-report ===" -ForegroundColor Cyan
node .\tests\write-professional-gate-report.mjs
$code = $LASTEXITCODE
if ($null -eq $code) { $code = 0 }
Add-Content -Path $ExitCodes -Value "professional-gate-report=$code"
Write-Host "professional-gate-report exit code: $code"

if (Test-Path $PackRoot) { Remove-Item $PackRoot -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Force -Path $PackRoot | Out-Null
if (Test-Path $Reports) { Copy-Item -Path $Reports -Destination (Join-Path $PackRoot 'reports') -Recurse -Force }

$meta = [ordered]@{
  generatedAt = (Get-Date).ToString('o')
  targetUrl = $TargetUrl
  bridgeRoot = $BridgeRoot
  branchNote = 'translateit-clean-engine final professional self-audit'
  primaryReviewFile = 'reports/translateit-self-audit-review.html'
  readinessFile = 'reports/translateit-self-audit-readiness.json'
  professionalGateFile = 'reports/translateit-professional-gate-report.json'
  sourceSizeParityFile = 'reports/translateit-source-size-frame-parity.json'
  primaryVisualFile = 'reports/translateit-figma-sim-main-latest.png'
  uploadThisZipToChat = (Split-Path $ZipPath -Leaf)
}
$meta | ConvertTo-Json -Depth 20 | Set-Content -Path (Join-Path $PackRoot 'self-audit-meta.json') -Encoding UTF8
Compress-Archive -Path (Join-Path $PackRoot '*') -DestinationPath $ZipPath -Force

Write-Host "`nFINAL DONE" -ForegroundColor Green
Write-Host "Upload this file to chat:"
Write-Host $ZipPath -ForegroundColor Yellow
Write-Host "`nFinal gate files inside ZIP:"
Write-Host 'reports/translateit-self-audit-review.html'
Write-Host 'reports/translateit-self-audit-readiness.json'
Write-Host 'reports/translateit-professional-gate-report.json'
Write-Host 'reports/translateit-source-size-frame-parity.json'
Write-Host 'reports/translateit-figma-sim-main-latest.png'
Write-Host 'reports/translateit-figma-sim-main-diff-latest.png'
Write-Host "`nExit codes:"
if (Test-Path $ExitCodes) { Get-Content $ExitCodes }
