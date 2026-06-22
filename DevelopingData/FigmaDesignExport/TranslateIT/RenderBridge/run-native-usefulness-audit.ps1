param(
  [string]$TargetUrl = 'https://www.mivubi.com/'
)

$ErrorActionPreference = 'Continue'
$BridgeRoot = $PSScriptRoot
$Reports = Join-Path $BridgeRoot 'reports'
$PackRoot = Join-Path $BridgeRoot 'self-audit-pack'
$ZipPath = Join-Path $BridgeRoot 'TranslateIT-SelfAudit-Pack.zip'
$ExitCodes = Join-Path $Reports 'self-audit-exit-codes.txt'
$Stdout = Join-Path $Reports 'renderbridge-stdout-latest.log'
$Stderr = Join-Path $Reports 'renderbridge-stderr-latest.log'
function Step { param([string]$Name,[scriptblock]$Command) Write-Host "`n=== $Name ===" -ForegroundColor Cyan; try { & $Command; $code = $LASTEXITCODE; if ($null -eq $code) { $code = 0 } } catch { Write-Host $_.Exception.Message -ForegroundColor Red; $code = 1 }; Add-Content -Path $ExitCodes -Value "$Name=$code"; Write-Host "$Name exit code: $code" }
function Stop-Port8844 { Get-NetTCPConnection -LocalPort 8844 -ErrorAction SilentlyContinue | ForEach-Object { try { if ($_.OwningProcess) { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } catch {} } }
cd $BridgeRoot
New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Remove-Item $ExitCodes,$ZipPath,$Stdout,$Stderr -Force -ErrorAction SilentlyContinue
Remove-Item $PackRoot -Recurse -Force -ErrorAction SilentlyContinue
Step 'npm-install' { if (!(Test-Path 'node_modules')) { npm.cmd install } }
Step 'playwright-install' { npx.cmd playwright install chromium }
Stop-Port8844
Start-Sleep -Milliseconds 600
$server = Start-Process -FilePath 'node' -ArgumentList 'server.mjs' -WorkingDirectory $BridgeRoot -RedirectStandardOutput $Stdout -RedirectStandardError $Stderr -PassThru -WindowStyle Hidden
try {
  $healthOk = $false
  for ($i = 0; $i -lt 35; $i++) {
    try { $health = Invoke-RestMethod 'http://127.0.0.1:8844/health' -TimeoutSec 2; $health | ConvertTo-Json -Depth 20 | Set-Content -Path (Join-Path $Reports 'self-audit-health.json') -Encoding UTF8; if ($health.activeRenderer -eq 'plugin/code-native-editable.js') { $healthOk = $true; break } } catch {}
    Start-Sleep -Seconds 1
  }
  Add-Content -Path $ExitCodes -Value ('health=' + ($(if ($healthOk) {0} else {1})))
  Step 'imports' { npm.cmd run test:imports }
  Step 'contract' { npm.cmd run test:contract }
  Step 'v2-markers' { npm.cmd run test:v2 }
  Step 'native-usefulness' { node .\tests\test-native-usefulness.mjs $TargetUrl }
  Step 'professional-layer-tree' { node .\tests\test-professional-layer-tree.mjs $TargetUrl }
  Step 'figma-dry-run' { node .\tests\test-figma-renderer-dry-run.mjs $TargetUrl }
  Step 'figma-sim-preview' { node .\tests\test-figma-sim-preview.mjs $TargetUrl }
}
finally { if ($server -and !$server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue } }
New-Item -ItemType Directory -Force -Path $PackRoot | Out-Null
if (Test-Path $Reports) { Copy-Item -Path $Reports -Destination (Join-Path $PackRoot 'reports') -Recurse -Force }
$meta = [ordered]@{ generatedAt = (Get-Date).ToString('o'); targetUrl = $TargetUrl; mode = 'native-editable-usefulness'; nativeUsefulnessFile = 'reports/translateit-native-usefulness.json'; professionalLayerTreeFile = 'reports/translateit-professional-layer-tree.json'; primaryVisualFile = 'reports/translateit-figma-sim-main-latest.png'; uploadThisZipToChat = (Split-Path $ZipPath -Leaf) }
$meta | ConvertTo-Json -Depth 20 | Set-Content -Path (Join-Path $PackRoot 'self-audit-meta.json') -Encoding UTF8
Compress-Archive -Path (Join-Path $PackRoot '*') -DestinationPath $ZipPath -Force
Write-Host "`nNATIVE USEFULNESS AUDIT DONE" -ForegroundColor Green
Write-Host $ZipPath -ForegroundColor Yellow
if (Test-Path $ExitCodes) { Get-Content $ExitCodes }
