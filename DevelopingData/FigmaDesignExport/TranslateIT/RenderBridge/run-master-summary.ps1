$Root=$PSScriptRoot
$Reports=Join-Path $Root 'reports'
node (Join-Path $Root 'src\write-master-engine-summary.mjs') $Reports
Write-Host "`n===== TRANSLATEIT MASTER SUMMARY =====" -ForegroundColor Yellow
if(Test-Path (Join-Path $Reports 'translateit-master-engine-summary.json')){
  $x=Get-Content (Join-Path $Reports 'translateit-master-engine-summary.json') | ConvertFrom-Json
  "masterStatus=$($x.status)"
  "manualFigmaTestAllowed=$($x.manualFigmaTestAllowed)"
  "failedSteps=$($x.failedSteps -join ' | ')"
  "blockers=$($x.blockers -join ' | ')"
}
