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

$portProcessIds = @()
try {
  $portProcessIds = Get-NetTCPConnection -LocalPort 8844 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
} catch {}
foreach ($ownerPid in $portProcessIds) {
  try {
    $procInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$ownerPid" -ErrorAction SilentlyContinue
    if ($procInfo -and ($procInfo.CommandLine -match 'TranslateIT' -or $procInfo.CommandLine -match 'RenderBridge' -or $procInfo.CommandLine -match 'server\.mjs')) {
      Write-Host "Stopping existing TranslateIT bridge process $ownerPid" -ForegroundColor Yellow
      Stop-Process -Id $ownerPid -Force -ErrorAction SilentlyContinue
    }
  } catch {}
}

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
  $health | ConvertTo-Json -Depth 8
  throw "Wrong bridge contract. Expected translateit-core / alpha-clean-1 with legacyActive=false."
}

Write-Host "Running visual audit..." -ForegroundColor Yellow
node .\tests\test-sample-sites.mjs $Url

Write-Host "Report saved to:" -ForegroundColor Green
Write-Host "$Root\reports\translateit-clean-latest.json"
