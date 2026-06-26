param(
  [string]$OmniEndpoint = 'http://127.0.0.1:7860/parse',
  [switch]$SkipOmniStart,
  [switch]$NoMessageBox,
  [switch]$VisibleServiceWindows
)

$ErrorActionPreference = 'Stop'

function Step($Text) {
  Write-Host "`n==> $Text" -ForegroundColor Cyan
}

function Info($Text) {
  Write-Host "   $Text" -ForegroundColor Gray
}

function Show-DesignItMessage($Title, $Message) {
  if ($NoMessageBox) { return }
  try {
    Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
    [System.Windows.Forms.MessageBox]::Show($Message, $Title, 'OK', 'Information') | Out-Null
  } catch {
    Write-Host $Message -ForegroundColor Yellow
  }
}

function Test-JsonEndpoint($Url) {
  try {
    $response = Invoke-RestMethod -Uri $Url -TimeoutSec 3
    return $response
  } catch {
    return $null
  }
}

function Wait-JsonEndpoint($Url, $Seconds, $Name) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  $attempt = 0

  while ((Get-Date) -lt $deadline) {
    $attempt += 1
    $payload = Test-JsonEndpoint $Url

    if ($payload -and $payload.ok -eq $true) {
      return $payload
    }

    Write-Host "   Waiting for $Name... attempt $attempt" -ForegroundColor DarkGray
    Start-Sleep -Seconds 2
  }

  return $null
}

function Start-DesignItService($Command, $StdOut, $StdErr) {
  $windowStyle = if ($VisibleServiceWindows) { 'Minimized' } else { 'Hidden' }

  $arguments = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-Command',
    $Command
  )

  Start-Process powershell.exe `
    -WindowStyle $windowStyle `
    -ArgumentList $arguments `
    -RedirectStandardOutput $StdOut `
    -RedirectStandardError $StdErr | Out-Null
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DesignItRoot = Resolve-Path (Join-Path $ScriptDir '..')
$RenderBridgeDir = Join-Path $DesignItRoot 'RenderBridge'
$OmniStart = Join-Path $ScriptDir 'start-omni-wsl.ps1'
$OmniHealth = $OmniEndpoint -replace '/parse$', '/health'

$RuntimeData = Join-Path $DesignItRoot 'RuntimeData'
$LogDir = Join-Path $RuntimeData 'logs'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $RuntimeData '_external') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $RuntimeData '_runtime') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $RuntimeData '_reports') | Out-Null

$OmniOut = Join-Path $LogDir 'omniparser.stdout.log'
$OmniErr = Join-Path $LogDir 'omniparser.stderr.log'
$BridgeOut = Join-Path $LogDir 'renderbridge.stdout.log'
$BridgeErr = Join-Path $LogDir 'renderbridge.stderr.log'

Step 'DesignIT local engine launcher'
Info "DesignIT root: $DesignItRoot"
Info "RenderBridge:   $RenderBridgeDir"
Info "RuntimeData:    $RuntimeData"
Info "Logs:           $LogDir"
Info "Omni endpoint:  $OmniEndpoint"

if (-not (Test-Path -LiteralPath $RenderBridgeDir)) {
  throw "RenderBridge folder not found: $RenderBridgeDir"
}

if (-not (Test-Path -LiteralPath $OmniStart)) {
  throw "OmniParser start script not found: $OmniStart"
}

Step 'Checking RenderBridge'
$bridge = Test-JsonEndpoint 'http://127.0.0.1:8844/health'

if ($bridge -and $bridge.ok -eq $true) {
  Info 'RenderBridge is already running.'
} else {
  Step 'Starting RenderBridge first'
  $renderCommand = "`$env:OMNIPARSER_ENDPOINT='$OmniEndpoint'; Set-Location -LiteralPath '$RenderBridgeDir'; if (-not (Test-Path 'node_modules')) { npm.cmd install }; npm.cmd start"
  Start-DesignItService $renderCommand $BridgeOut $BridgeErr
}

Step 'Waiting for RenderBridge health'
$bridge = Wait-JsonEndpoint 'http://127.0.0.1:8844/health' 45 'RenderBridge'

if (-not ($bridge -and $bridge.ok -eq $true)) {
  throw "RenderBridge did not become ready. Check logs: $BridgeOut and $BridgeErr"
}

Step 'Checking external visual engine'
$omni = Test-JsonEndpoint $OmniHealth
$omniReady = $false

if ($omni -and $omni.ok -eq $true) {
  $omniReady = $true
  Info 'Visual engine is already running.'
} elseif ($SkipOmniStart) {
  Info 'Skipping visual engine startup by request.'
} else {
  Step 'Starting visual engine in background'
  $omniCommand = "Set-Location -LiteralPath '$ScriptDir'; powershell.exe -NoProfile -ExecutionPolicy Bypass -File '$OmniStart'"
  Start-DesignItService $omniCommand $OmniOut $OmniErr

  Step 'Quick visual engine check'
  $omni = Wait-JsonEndpoint $OmniHealth 10 'Visual Engine'

  if ($omni -and $omni.ok -eq $true) {
    $omniReady = $true
    Info 'Visual engine server is reachable.'
  } else {
    Info 'Visual engine is still warming up in background.'
    Info "OmniParser stdout: $OmniOut"
    Info "OmniParser stderr: $OmniErr"
  }
}

Step 'DesignIT local engine status'
Info 'RenderBridge: READY at http://127.0.0.1:8844/health'

if ($omniReady) {
  Info "Visual engine: READY at $OmniHealth"
  Show-DesignItMessage 'DesignIT Ready' "DesignIT local engine is ready.`n`nYou can now open the Figma plugin and import by website URL.`n`nLogs:`n$LogDir"
} else {
  Info "Visual engine: STARTING/BACKGROUND at $OmniHealth"
  Show-DesignItMessage 'DesignIT Partially Ready' "RenderBridge is ready. Visual engine is starting in background.`n`nImports will be highest quality after http://127.0.0.1:7860/health returns ok=true.`n`nLogs:`n$LogDir"
}

Write-Host "`nDesignIT startup finished. Local services are running in the background." -ForegroundColor Green
Write-Host "Logs: $LogDir" -ForegroundColor Green
