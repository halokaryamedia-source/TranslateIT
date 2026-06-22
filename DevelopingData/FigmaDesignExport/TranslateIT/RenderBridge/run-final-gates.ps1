$Root=$PSScriptRoot
$Reports=Join-Path $Root 'reports'
New-Item -ItemType Directory -Force -Path $Reports | Out-Null
node (Join-Path $Root 'tests\test-figma-render-quality.mjs')
node (Join-Path $Root 'tests\test-section-layer-quality.mjs')
node (Join-Path $Root 'tests\test-layout-strategy-score.mjs')
node (Join-Path $Root 'tests\test-visual-compare-readiness.mjs')
node (Join-Path $Root 'src\write-master-engine-summary.mjs') $Reports
node (Join-Path $Root 'tests\test-controlled-readiness.mjs')
Write-Host "`n===== FINAL GATES =====" -ForegroundColor Yellow
if(Test-Path (Join-Path $Reports 'translateit-controlled-readiness.json')){
  $r=Get-Content (Join-Path $Reports 'translateit-controlled-readiness.json') | ConvertFrom-Json
  "status=$($r.status)"
  "manualFigmaTestAllowed=$($r.manualFigmaTestAllowed)"
  "failures=$($r.failures -join ' | ')"
}
if(Test-Path (Join-Path $Reports 'translateit-master-engine-summary.json')){
  $m=Get-Content (Join-Path $Reports 'translateit-master-engine-summary.json') | ConvertFrom-Json
  "masterStatus=$($m.status)"
  "blockers=$($m.blockers -join ' | ')"
}
