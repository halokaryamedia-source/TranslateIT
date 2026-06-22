param(
  [string]$TargetUrl='https://www.mivubi.com/',
  [string]$OmniParserRepo='D:\Tools\OmniParser'
)

$ErrorActionPreference='Continue'
$Root=$PSScriptRoot
$Reports=Join-Path $Root 'reports'
New-Item -ItemType Directory -Force -Path $Reports | Out-Null

$env:OMNIPARSER_REPO=$OmniParserRepo
$env:OMNIPARSER_WEIGHTS=Join-Path $OmniParserRepo 'weights'
$env:OMNIPARSER_USE_PADDLEOCR='0'
$env:OMNIPARSER_USE_LOCAL_SEMANTICS='0'
$env:OMNIPARSER_ENDPOINT='http://127.0.0.1:7860/parse'

npm.cmd install
powershell -ExecutionPolicy Bypass -File (Join-Path $Root 'run-engine-pipeline-audit.ps1') -TargetUrl $TargetUrl

Write-Host "`n===== TRANSLATEIT FINAL SUMMARY =====" -ForegroundColor Yellow
if(Test-Path (Join-Path $Reports 'self-audit-exit-codes.txt')){Get-Content (Join-Path $Reports 'self-audit-exit-codes.txt')}
if(Test-Path (Join-Path $Reports 'translateit-figma-engine-maturity.json')){
  $m=Get-Content (Join-Path $Reports 'translateit-figma-engine-maturity.json') | ConvertFrom-Json
  "maturityStatus=$($m.status)"
  "manualFigmaTestAllowed=$($m.manualFigmaTestAllowed)"
  "readyStages=$($m.summary.readyStages)/$($m.summary.totalStages)"
  "blockers=$($m.summary.blockers)"
  "failures=$($m.failures.message -join ' | ')"
}
