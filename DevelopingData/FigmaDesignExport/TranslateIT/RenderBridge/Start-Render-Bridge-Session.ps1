$ErrorActionPreference = 'Stop'

$BridgeDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $BridgeDir 'logs'
$OutLog = Join-Path $LogDir 'render-bridge-session.out.log'
$ErrLog = Join-Path $LogDir 'render-bridge-session.err.log'
$Port = if ($env:TRANSLATEIT_RENDER_PORT) { $env:TRANSLATEIT_RENDER_PORT } else { '8844' }

if (!(Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir | Out-Null
}

Set-Location $BridgeDir

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
    exit 0
  }

  if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    exit 1
  }

  if (!(Test-Path (Join-Path $BridgeDir 'node_modules'))) {
    exit 1
  }

  Start-Process -FilePath 'node' -ArgumentList 'server.mjs' -WorkingDirectory $BridgeDir -WindowStyle Hidden -RedirectStandardOutput $OutLog -RedirectStandardError $ErrLog
  exit 0
} catch {
  exit 1
}
