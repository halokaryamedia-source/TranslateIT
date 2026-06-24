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

function Start-DesignItService($Name, $Command, $StdOut, $StdErr) {
  $windowStyle = if ($VisibleServiceWindows) { 'Minimized' } else { 'Hidden' }
  $arguments = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-Command',
    $Command
  )
  Start-Process powershell -WindowStyle $windowStyle -ArgumentList $arguments -RedirectStandardOutput $StdOut -RedirectStandardError $StdErr | Out-Null
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TranslateItRoot = Resolve-Path (Join-Path $ScriptDir '..')
$WorkspaceRoot = Resolve-Path (Join-Path $TranslateItRoot '..')
$RepoRoot = Resolve-Path (Join-Path $TranslateItRoot '..\..\..')
$RenderBridgeDir = Join-Path $TranslateItRoot 'RenderBridge'
$OmniStart = Join-Path $ScriptDir 'start-omni-wsl.ps1'
$OmniHealth = $OmniEndpoint -replace '/parse$', '/health'
$LogDir = Join-Path $RepoRoot 'UserData\LogData\DesignIT\local-engine'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$OmniOut = Join-Path $LogDir 'omniparser.stdout.log'
$OmniErr = Join-Path $LogDir 'omniparser.stderr.log'
$BridgeOut = Join-Path $LogDir 'renderbridge.stdout.log'
$BridgeErr = Join-Path $LogDir 'renderbridge.stderr.log'

Step 'DesignIT one-click local engine launcher'
Info "DesignIT root:    $TranslateItRoot"
Info "Workspace root:   $WorkspaceRoot"
Info "Repo root:        $RepoRoot"
Info "RenderBridge:     $RenderBridgeDir"
Info "Omni endpoint:    $OmniEndpoint"
Info "Logs:             $LogDir"

if (-not (Test-Path $RenderBridgeDir)) {
  throw "RenderBridge folder not found: $RenderBridgeDir"
}

if (-not (Test-Path $OmniStart)) {
  throw "OmniParser start script not found: $OmniStart"
}

$omniReady = $false
if ($SkipOmniStart) {
  Step 'Skipping OmniParser startup by request'
} else {
  Step 'Checking external visual engine'
  $omni = Test-JsonEndpoint $OmniHealth
  if ($omni -and $omni.ok -eq $true) {
    $omniReady = $true
    Info 'OmniParser is already running.'
  } else {
    Step 'Starting OmniParser in the background'
    $omniCommand = "Set-Location -LiteralPath '$ScriptDir'; powershell.exe -NoProfile -ExecutionPolicy Bypass -File '$OmniStart'"
    Start-DesignItService 'DesignIT OmniParser' $omniCommand $OmniOut $OmniErr

    Step 'Waiting for OmniParser health'
    $omni = Wait-JsonEndpoint $OmniHealth 240 'OmniParser'
    if ($omni -and $omni.ok -eq $true) {
      $omniReady = $true
      Info 'OmniParser is ready.'
    } else {
      Write-Host "   OmniParser is not ready yet. RenderBridge can start, but imports may fail until the visual engine is ready." -ForegroundColor Yellow
      Info "OmniParser stdout: $OmniOut"
      Info "OmniParser stderr: $OmniErr"
    }
  }
}

Step 'Checking RenderBridge'
$bridge = Test-JsonEndpoint 'http://127.0.0.1:8844/health'
if ($bridge -and $bridge.ok -eq $true) {
  Info 'RenderBridge is already running.'
} else {
  Step 'Starting RenderBridge in the background'
  $renderCommand = "`$env:OMNIPARSER_ENDPOINT='$OmniEndpoint'; Set-Location -LiteralPath '$RenderBridgeDir'; if (-not (Test-Path 'node_modules')) { npm.cmd install }; npm.cmd start"
  Start-DesignItService 'DesignIT RenderBridge' $renderCommand $BridgeOut $BridgeErr
}

Step 'Waiting for RenderBridge health'
$bridge = Wait-JsonEndpoint 'http://127.0.0.1:8844/health' 90 'RenderBridge'
if (-not ($bridge -and $bridge.ok -eq $true)) {
  throw "RenderBridge did not become ready. Check logs: $BridgeOut and $BridgeErr"
}

Step 'DesignIT local engine status'
Info 'RenderBridge: READY at http://127.0.0.1:8844/health'
if ($omniReady) {
  Info "Visual engine: READY at $OmniHealth"
  Show-DesignItMessage 'DesignIT Ready' "DesignIT local engine is ready.`n`nYou can now open the Figma plugin and import by website URL.`n`nLogs:`n$LogDir"
} else {
  Info "Visual engine: NOT READY at $OmniHealth"
  Show-DesignItMessage 'DesignIT Partially Ready' "RenderBridge is running, but the external visual engine is not ready yet.`n`nImports will work after http://127.0.0.1:7860/health returns ok=true.`n`nLogs:`n$LogDir"
}

Write-Host "`nDesignIT launcher finished. Local engine services are running in the background." -ForegroundColor Green
Write-Host "Logs: $LogDir" -ForegroundColor Green
