param(
  [string]$TargetUrl = 'https://www.mivubi.com/'
)

$ErrorActionPreference = 'Continue'
$BridgeRoot = $PSScriptRoot
$Reports = Join-Path $BridgeRoot 'reports'
$PackRoot = Join-Path $BridgeRoot 'self-audit-pack'
$ZipPath = Join-Path $BridgeRoot 'TranslateIT-SelfAudit-Pack.zip'
$ExitCodes = Join-Path $Reports 'self-audit-exit-codes.txt'

Write-Host 'TranslateIT Production Readiness Audit' -ForegroundColor Green
Write-Host "TargetUrl: $TargetUrl"
& (Join-Path $BridgeRoot 'run-final-professional-audit-pack-v2.ps1') -TargetUrl $TargetUrl
cd $BridgeRoot

Write-Host "`n=== production-readiness ===" -ForegroundColor Cyan
node .\src\evaluate-production-readiness.mjs .\reports
$code = $LASTEXITCODE
if ($null -eq $code) { $code = 0 }
Add-Content -Path $ExitCodes -Value "production-readiness=$code"
Write-Host "production-readiness exit code: $code"

if (Test-Path $PackRoot) { Remove-Item $PackRoot -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Force -Path $PackRoot | Out-Null
if (Test-Path $Reports) { Copy-Item -Path $Reports -Destination (Join-Path $PackRoot 'reports') -Recurse -Force }
$meta = [ordered]@{
  generatedAt = (Get-Date).ToString('o')
  targetUrl = $TargetUrl
  bridgeRoot = $BridgeRoot
  branchNote = 'translateit-clean-engine production-readiness-alpha'
  productionReadinessFile = 'reports/translateit-production-readiness.json'
  primaryReviewFile = 'reports/translateit-self-audit-review.html'
  readinessFile = 'reports/translateit-self-audit-readiness.json'
  professionalLayerTreeFile = 'reports/translateit-professional-layer-tree.json'
  primaryVisualFile = 'reports/translateit-figma-sim-main-latest.png'
  uploadThisZipToChat = (Split-Path $ZipPath -Leaf)
}
$meta | ConvertTo-Json -Depth 20 | Set-Content -Path (Join-Path $PackRoot 'self-audit-meta.json') -Encoding UTF8
Compress-Archive -Path (Join-Path $PackRoot '*') -DestinationPath $ZipPath -Force
Write-Host "`nPRODUCTION READINESS DONE" -ForegroundColor Green
Write-Host "Upload this file to chat:"
Write-Host $ZipPath -ForegroundColor Yellow
Write-Host "`nProduction readiness file:"
Write-Host 'reports/translateit-production-readiness.json'
Write-Host "`nExit codes:"
if (Test-Path $ExitCodes) { Get-Content $ExitCodes }
