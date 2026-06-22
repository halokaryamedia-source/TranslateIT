$Root=$PSScriptRoot
$Reports=Join-Path $Root 'reports'
New-Item -ItemType Directory -Force -Path $Reports | Out-Null
node (Join-Path $Root 'tests\test-figma-render-quality.mjs')
node (Join-Path $Root 'src\write-master-engine-summary.mjs') $Reports
Write-Host "`n===== QUALITY SUMMARY =====" -ForegroundColor Yellow
if(Test-Path (Join-Path $Reports 'translateit-master-engine-summary.json')){
  $s=Get-Content (Join-Path $Reports 'translateit-master-engine-summary.json') | ConvertFrom-Json
  "status=$($s.status)"
  "manualFigmaTestAllowed=$($s.manualFigmaTestAllowed)"
  "failedSteps=$($s.failedSteps -join ' | ')"
  "blockers=$($s.blockers -join ' | ')"
}
if(Test-Path (Join-Path $Reports 'translateit-figma-render-quality.json')){
  $q=Get-Content (Join-Path $Reports 'translateit-figma-render-quality.json') | ConvertFrom-Json
  "renderQuality=$($q.status)"
  "score=$($q.score)/$($q.threshold)"
  "qualityFailures=$($q.failures -join ' | ')"
}
