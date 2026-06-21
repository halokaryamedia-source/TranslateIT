$ErrorActionPreference = 'Stop'

$BridgeDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $BridgeDir 'logs'
$LogFile = Join-Path $LogDir 'render-bridge.log'
$Port = if ($env:TRANSLATEIT_RENDER_PORT) { $env:TRANSLATEIT_RENDER_PORT } else { '8844' }

if (!(Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir | Out-Null
}

Set-Location $BridgeDir

function Write-BridgeLog($Message) {
  $time = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Add-Content -Path $LogFile -Value "[$time] $Message"
}

function Test-BridgeHealth {
  try {
    $response = Invoke-RestMethod "http://127.0.0.1:$Port/health" -TimeoutSec 2
    return ($response.publicVersion -eq 'Version 0.1 - Alpha') -and ($response.adapter -match 'v5') -and ($response.adapter -match 'enhanced')
  } catch {
    return $false
  }
}

try {
  if (Test-BridgeHealth) {
    Write-BridgeLog "Strict V5 enhanced Render Bridge already running on port $Port."
    exit 0
  }

  if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-BridgeLog 'Node.js not found in PATH.'
    exit 1
  }

  if (!(Test-Path (Join-Path $BridgeDir 'node_modules'))) {
    Write-BridgeLog 'Installing npm dependencies...'
    cmd /c npm install >> $LogFile 2>&1
  }

  Write-BridgeLog 'Installing Playwright Chromium if needed...'
  cmd /c npx playwright install chromium >> $LogFile 2>&1

  Write-BridgeLog "Starting strict V5 enhanced Render Bridge on port $Port..."
  Start-Process -FilePath 'node' -ArgumentList 'start-alpha-v5.mjs' -WorkingDirectory $BridgeDir -WindowStyle Hidden -RedirectStandardOutput $LogFile -RedirectStandardError $LogFile

  Start-Sleep -Seconds 4

  if (Test-BridgeHealth) {
    Write-BridgeLog 'Strict V5 enhanced Render Bridge started successfully.'
    exit 0
  }

  Write-BridgeLog 'Strict V5 enhanced Render Bridge start attempted, but health check failed.'
  exit 1
} catch {
  Write-BridgeLog "Error: $($_.Exception.Message)"
  exit 1
}
