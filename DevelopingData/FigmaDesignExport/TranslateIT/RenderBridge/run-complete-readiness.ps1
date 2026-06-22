param([string]$TargetUrl='https://www.mivubi.com/')
$Root=$PSScriptRoot
$Reports=Join-Path $Root 'reports'
New-Item -ItemType Directory -Force -Path $Reports | Out-Null
powershell -ExecutionPolicy Bypass -File (Join-Path $Root 'run-full-engine-prep.ps1') -TargetUrl $TargetUrl
powershell -ExecutionPolicy Bypass -File (Join-Path $Root 'run-quality-summary.ps1')
powershell -ExecutionPolicy Bypass -File (Join-Path $Root 'run-final-gates.ps1')
powershell -ExecutionPolicy Bypass -File (Join-Path $Root 'run-controlled-readiness.ps1')
Write-Host "`n===== COMPLETE READINESS RESULT =====" -ForegroundColor Yellow
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
