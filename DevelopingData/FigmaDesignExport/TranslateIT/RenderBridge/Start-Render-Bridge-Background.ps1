$ErrorActionPreference = 'Stop'

$BridgeDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $BridgeDir 'logs'
$OutLog = Join-Path $LogDir 'render-bridge.out.log'
$ErrLog = Join-Path $LogDir 'render-bridge.err.log'
$Port = if ($env:TRANSLATEIT_RENDER_PORT) { $env:TRANSLATEIT_RENDER_PORT } else { '8844' }

if (!(Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir | Out-Null
}

Set-Location $BridgeDir

function Write-BridgeLog($Message) {
  $time = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Add-Content -Path (Join-Path $LogDir 'render-bridge.log') -Value "[$time] $Message"
}

function Test-BridgeHealth {
  try {
    $response = Invoke-RestMethod "http://127.0.0.1:$Port/health" -TimeoutSec 2
    return ($response.publicVersion -eq 'Version 0.1 - Alpha') -and ($response.engine -eq 'translateit-core') -and ($response.engineBuild -eq 'alpha-clean-1') -and ($response.legacyActive -eq $false)
  } catch {
    return $false
  }
}

try {
  if (Test-BridgeHealth) {
    Write-BridgeLog "Clean RenderBridge already running on port $Port."
    exit 0
  }

  if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-BridgeLog 'Node.js not found in PATH.'
    exit 1
  }

  if (!(Test-Path (Join-Path $BridgeDir 'node_modules'))) {
    Write-BridgeLog 'Installing npm dependencies...'
    cmd /c npm install >> (Join-Path $LogDir 'render-bridge.log') 2>&1
  }

  Write-BridgeLog 'Installing Playwright Chromium if needed...'
  cmd /c npx playwright install chromium >> (Join-Path $LogDir 'render-bridge.log') 2>&1

  Write-BridgeLog "Starting clean RenderBridge on port $Port..."
  Start-Process -FilePath 'node' -ArgumentList 'server.mjs' -WorkingDirectory $BridgeDir -WindowStyle Hidden -RedirectStandardOutput $OutLog -RedirectStandardError $ErrLog

  Start-Sleep -Seconds 4

  if (Test-BridgeHealth) {
    Write-BridgeLog 'Clean RenderBridge started successfully.'
    exit 0
  }

  Write-BridgeLog 'Clean RenderBridge start attempted, but health check failed.'
  exit 1
} catch {
  Write-BridgeLog "Error: $($_.Exception.Message)"
  exit 1
}
