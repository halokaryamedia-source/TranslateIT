param(
  [string]$TargetUrl = 'https://www.mivubi.com/'
)

$ErrorActionPreference = 'Continue'
$BridgeRoot = $PSScriptRoot
$Reports = Join-Path $BridgeRoot 'reports'
$PackRoot = Join-Path $BridgeRoot 'self-audit-pack'
$ZipPath = Join-Path $BridgeRoot 'TranslateIT-SelfAudit-Pack.zip'
$Stdout = Join-Path $Reports 'renderbridge-stdout-latest.log'
$Stderr = Join-Path $Reports 'renderbridge-stderr-latest.log'
$ExitCodes = Join-Path $Reports 'self-audit-exit-codes.txt'

function Stop-Port8844 {
  Get-NetTCPConnection -LocalPort 8844 -ErrorAction SilentlyContinue | ForEach-Object {
    try { if ($_.OwningProcess) { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } catch {}
  }
}
function Step {
  param([string]$Name,[scriptblock]$Command)
  Write-Host "`n=== $Name ===" -ForegroundColor Cyan
  try { & $Command; $code = $LASTEXITCODE; if ($null -eq $code) { $code = 0 } }
  catch { Write-Host $_.Exception.Message -ForegroundColor Red; $code = 1 }
  Add-Content -Path $ExitCodes -Value "$Name=$code"
  Write-Host "$Name exit code: $code"
}

cd $BridgeRoot
New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Remove-Item $Stdout,$Stderr,$ExitCodes,$ZipPath -Force -ErrorAction SilentlyContinue
Remove-Item $PackRoot -Recurse -Force -ErrorAction SilentlyContinue

$releaseManifest = [ordered]@{
  generatedAt = (Get-Date).ToString('o')
  targetUrl = $TargetUrl
  branch = (git rev-parse --abbrev-ref HEAD 2>$null)
  commit = (git rev-parse HEAD 2>$null)
  node = (node --version 2>$null)
  npm = (npm --version 2>$null)
  mode = 'visual-backed-editable-clone'
  publicVersion = 'Version 0.1 - Alpha'
}
$releaseManifest | ConvertTo-Json -Depth 20 | Set-Content -Path (Join-Path $Reports 'translateit-release-manifest.json') -Encoding UTF8

Step 'npm-install' { if (!(Test-Path 'node_modules')) { npm.cmd install } }
Step 'playwright-install' { npx.cmd playwright install chromium }
Stop-Port8844
Start-Sleep -Milliseconds 600
$server = Start-Process -FilePath 'node' -ArgumentList 'server.mjs' -WorkingDirectory $BridgeRoot -RedirectStandardOutput $Stdout -RedirectStandardError $Stderr -PassThru -WindowStyle Hidden
try {
  $healthOk = $false
  for ($i = 0; $i -lt 35; $i++) {
    try {
      $health = Invoke-RestMethod 'http://127.0.0.1:8844/health' -TimeoutSec 2
      $health | ConvertTo-Json -Depth 20 | Set-Content -Path (Join-Path $Reports 'self-audit-health.json') -Encoding UTF8
      if ($health.engine -eq 'translateit-core' -and $health.engineBuild -eq 'alpha-clean-1' -and $health.contract -eq 'cloneModel') { $healthOk = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
  }
  if (!$healthOk) { Add-Content -Path $ExitCodes -Value 'health=1'; Write-Host 'Health failed.' -ForegroundColor Red } else { Add-Content -Path $ExitCodes -Value 'health=0'; Write-Host 'Health OK' -ForegroundColor Green }
  Step 'imports' { npm.cmd run test:imports }
  Step 'contract' { npm.cmd run test:contract }
  Step 'v2-markers' { npm.cmd run test:v2 }
  Step 'professional-gate-report' { node .\tests\write-professional-gate-report.mjs }
  Step 'mivubi-sample' { node .\tests\test-sample-sites.mjs $TargetUrl }
  Step 'figma-dry-run' { node .\tests\test-figma-renderer-dry-run.mjs $TargetUrl }
  Step 'figma-sim-preview' { node .\tests\test-figma-sim-preview.mjs $TargetUrl }
  Step 'source-size-parity' { node .\tests\test-source-size-frame-parity.mjs $TargetUrl }
  Step 'professional-layer-tree' { node .\tests\test-professional-layer-tree.mjs $TargetUrl }
  Step 'regression' { npm.cmd run test:regression }
  Step 'review-dashboard' { node .\src\write-self-audit-review-page.mjs $Reports }
  Step 'production-readiness' { node .\src\evaluate-production-readiness.mjs $Reports }
  Step 'production-readiness-page' { node .\src\write-production-readiness-page.mjs $Reports }
}
finally {
  if ($server -and !$server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
}

New-Item -ItemType Directory -Force -Path $PackRoot | Out-Null
if (Test-Path $Reports) { Copy-Item -Path $Reports -Destination (Join-Path $PackRoot 'reports') -Recurse -Force }
$meta = [ordered]@{
  generatedAt = (Get-Date).ToString('o')
  targetUrl = $TargetUrl
  productionReadinessFile = 'reports/translateit-production-readiness.json'
  productionReadinessPage = 'reports/translateit-production-readiness.html'
  releaseManifestFile = 'reports/translateit-release-manifest.json'
  primaryReviewFile = 'reports/translateit-self-audit-review.html'
  primaryVisualFile = 'reports/translateit-figma-sim-main-latest.png'
  uploadThisZipToChat = (Split-Path $ZipPath -Leaf)
}
$meta | ConvertTo-Json -Depth 20 | Set-Content -Path (Join-Path $PackRoot 'self-audit-meta.json') -Encoding UTF8
Compress-Archive -Path (Join-Path $PackRoot '*') -DestinationPath $ZipPath -Force
Write-Host "`nPRODUCTION READINESS V2 DONE" -ForegroundColor Green
Write-Host "Upload this file to chat:"
Write-Host $ZipPath -ForegroundColor Yellow
Write-Host "`nPrimary production report: reports/translateit-production-readiness.html"
Write-Host "`nExit codes:"
if (Test-Path $ExitCodes) { Get-Content $ExitCodes }
