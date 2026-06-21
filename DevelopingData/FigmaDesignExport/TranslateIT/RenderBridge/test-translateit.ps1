param(
  [string]$Url = "https://www.mivubi.com/"
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "TranslateIT Clean Engine Preflight" -ForegroundColor Cyan
Write-Host "Target: $Url"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is required but was not found in PATH."
}

if (-not (Test-Path "$Root\node_modules")) {
  Write-Host "Installing dependencies..." -ForegroundColor Yellow
  npm install
}

Write-Host "Ensuring Playwright Chromium is installed..." -ForegroundColor Yellow
npm run install-browser

Write-Host "Running clean contract audit..." -ForegroundColor Yellow
node .\tests\test-clean-contract.mjs

Write-Host "Clearing port 8844 before clean bridge start..." -ForegroundColor Yellow
$portProcessIds = @()
try {
  $portProcessIds = Get-NetTCPConnection -LocalPort 8844 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
} catch {}
foreach ($ownerPid in $portProcessIds) {
  if ($ownerPid -eq $PID) { continue }
  try {
    $procInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$ownerPid" -ErrorAction SilentlyContinue
    $name = if ($procInfo) { $procInfo.Name } else { 'unknown' }
    Write-Host "Stopping process on port 8844: $ownerPid ($name)" -ForegroundColor Yellow
    Stop-Process -Id $ownerPid -Force -ErrorAction SilentlyContinue
  } catch {}
}
Start-Sleep -Milliseconds 750

$outLog = Join-Path $Root 'reports\translateit-clean-bridge.out.log'
$errLog = Join-Path $Root 'reports\translateit-clean-bridge.err.log'
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'reports') | Out-Null
if (Test-Path $outLog) { Remove-Item $outLog -Force }
if (Test-Path $errLog) { Remove-Item $errLog -Force }

Write-Host "Starting clean RenderBridge..." -ForegroundColor Yellow
$bridgeProcess = Start-Process -FilePath 'node' -ArgumentList 'server.mjs' -WorkingDirectory $Root -WindowStyle Hidden -PassThru -RedirectStandardOutput $outLog -RedirectStandardError $errLog
Start-Sleep -Seconds 2

$health = $null
for ($i = 0; $i -lt 20; $i++) {
  try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8844/health' -TimeoutSec 3
    if ($health.ok -eq $true) { break }
  } catch {
    Start-Sleep -Milliseconds 750
  }
}

if (-not $health -or $health.ok -ne $true) {
  Write-Host "Bridge failed to start. Logs:" -ForegroundColor Red
  if (Test-Path $outLog) { Get-Content $outLog }
  if (Test-Path $errLog) { Get-Content $errLog }
  throw "Clean RenderBridge did not respond on /health."
}

if ($health.engine -ne 'translateit-core' -or $health.engineBuild -ne 'alpha-clean-1' -or $health.legacyActive -ne $false) {
  Write-Host "Unexpected health response:" -ForegroundColor Red
  $health | ConvertTo-Json -Depth 8
  Write-Host "Bridge stdout log:" -ForegroundColor Yellow
  if (Test-Path $outLog) { Get-Content $outLog }
  Write-Host "Bridge stderr log:" -ForegroundColor Yellow
  if (Test-Path $errLog) { Get-Content $errLog }
  throw "Wrong bridge contract. Expected translateit-core / alpha-clean-1 with legacyActive=false."
}

Write-Host "Running visual audit..." -ForegroundColor Yellow
node .\tests\test-sample-sites.mjs $Url

Write-Host "Report saved to:" -ForegroundColor Green
Write-Host "$Root\reports\translateit-clean-latest.json"
