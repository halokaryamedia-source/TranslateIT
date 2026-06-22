$Root=$PSScriptRoot
$Reports=Join-Path $Root 'reports'
New-Item -ItemType Directory -Force -Path $Reports | Out-Null
node (Join-Path $Root 'src\write-master-engine-summary.mjs') $Reports
node (Join-Path $Root 'tests\test-controlled-readiness.mjs')
Write-Host "`n===== CONTROLLED READINESS =====" -ForegroundColor Yellow
if(Test-Path (Join-Path $Reports 'translateit-controlled-readiness.json')){
  $r=Get-Content (Join-Path $Reports 'translateit-controlled-readiness.json') | ConvertFrom-Json
  "status=$($r.status)"
  "manualFigmaTestAllowed=$($r.manualFigmaTestAllowed)"
  "failures=$($r.failures -join ' | ')"
}
