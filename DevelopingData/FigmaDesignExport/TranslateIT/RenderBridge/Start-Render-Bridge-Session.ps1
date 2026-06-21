$ErrorActionPreference = 'Stop'

$BridgeDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $BridgeDir 'logs'
$LogFile = Join-Path $LogDir 'render-bridge-session.log'
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
    return ($response.publicVersion -eq 'Version 0.1 - Alpha') -and ($response.adapter -match 'v5|enhanced|structured')
  } catch {
    return $false
  }
}

try {
  if (Test-BridgeHealth) {
    Write-BridgeLog "Strict V5 Render Bridge already running on port $Port."
    exit 0
  }

  if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-BridgeLog 'Node.js not found in PATH.'
    exit 1
  }

  if (!(Test-Path (Join-Path $BridgeDir 'node_modules'))) {
    Write-BridgeLog 'node_modules not found. Run Install-Session-Bridge.cmd first.'
    exit 1
  }

  Write-BridgeLog "Starting strict V5 Render Bridge on port $Port."
  Start-Process -FilePath 'node' -ArgumentList 'start-alpha-v5.mjs' -WorkingDirectory $BridgeDir -WindowStyle Hidden -RedirectStandardOutput $LogFile -RedirectStandardError $LogFile
  exit 0
} catch {
  Write-BridgeLog "Error: $($_.Exception.Message)"
  exit 1
}
