param(
  [string]$Url = $env:TRANSLATEIT_TARGET_URL,
  [string]$PayloadPath = "reports/translateit-payload.json",
  [string]$ReadinessPath = "reports/translateit-honest-production-readiness.json"
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($Url)) { $Url = "https://www.mivubi.com/" }

Write-Host "TranslateIT final production proof" -ForegroundColor Cyan
Write-Host "Target: $Url"

if (!(Test-Path "reports")) { New-Item -ItemType Directory -Path "reports" | Out-Null }

Write-Host "\n[1/4] Import checks" -ForegroundColor Yellow
npm.cmd run test:imports

Write-Host "\n[2/4] Build full payload" -ForegroundColor Yellow
node ./src/write-payload-report.mjs $Url $PayloadPath

Write-Host "\n[3/4] Honest production readiness" -ForegroundColor Yellow
node ./src/evaluate-honest-production-readiness.mjs $PayloadPath $ReadinessPath

Write-Host "\n[4/4] Existing complete readiness" -ForegroundColor Yellow
npm.cmd run readiness:complete

Write-Host "\nDone. Review these files before Figma import:" -ForegroundColor Green
Write-Host "- $PayloadPath"
Write-Host "- $ReadinessPath"
Write-Host "- reports/translateit-engine-pipeline-readiness.json"
Write-Host "- reports/translateit-master-engine-summary.json"
