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

$portProcessIds = @()
try {
  $portProcessIds = Get-NetTCPConnection -LocalPort 8844 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
} catch {}
foreach ($pid in $portProcessIds) {
  try {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$pid" -ErrorAction SilentlyContinue
    if ($proc -and ($proc.CommandLine -match 'TranslateIT' -or $proc.CommandLine -match 'RenderBridge' -or $proc.CommandLine -match 'server\.mjs')) {
      Write-Host "Stopping existing TranslateIT bridge process $pid" -ForegroundColor Yellow
      Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
  } catch {}
}

$log = Join-Path $Root 'reports\translateit-clean-bridge.log'
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'reports') | Out-Null
if (Test-Path $log) { Remove-Item $log -Force }

Write-Host "Starting clean RenderBridge..." -ForegroundColor Yellow
$proc = Start-Process -FilePath 'node' -ArgumentList 'server.mjs' -WorkingDirectory $Root -WindowStyle Hidden -PassThru -RedirectStandardOutput $log -RedirectStandardError $log
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
  Write-Host "Bridge failed to start. Log:" -ForegroundColor Red
  if (Test-Path $log) { Get-Content $log }
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
