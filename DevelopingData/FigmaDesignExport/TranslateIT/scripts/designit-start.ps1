param(
  [string]$OmniEndpoint = 'http://127.0.0.1:7860/parse',
  [switch]$SkipOmniStart,
  [switch]$NoMessageBox
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

function Start-ProcessWindow($Title, $Command) {
  Start-Process powershell -WindowStyle Minimized -ArgumentList @(
    '-NoExit',
    '-ExecutionPolicy', 'Bypass',
    '-Command',
    "`$host.UI.RawUI.WindowTitle = '$Title'; $Command"
  ) | Out-Null
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TranslateItRoot = Resolve-Path (Join-Path $ScriptDir '..')
$WorkspaceRoot = Resolve-Path (Join-Path $TranslateItRoot '..')
$RenderBridgeDir = Join-Path $TranslateItRoot 'RenderBridge'
$OmniStart = Join-Path $ScriptDir 'start-omni-wsl.ps1'
$OmniHealth = $OmniEndpoint -replace '/parse$', '/health'

Step 'DesignIT one-click local engine launcher'
Info "TranslateIT root: $TranslateItRoot"
Info "Workspace root:   $WorkspaceRoot"
Info "RenderBridge:     $RenderBridgeDir"
Info "Omni endpoint:    $OmniEndpoint"

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
    Step 'Starting OmniParser in a minimized PowerShell window'
    Start-Process powershell -WindowStyle Minimized -ArgumentList @(
      '-NoExit',
      '-ExecutionPolicy', 'Bypass',
      '-File', $OmniStart
    ) | Out-Null

    Step 'Waiting for OmniParser health'
    $omni = Wait-JsonEndpoint $OmniHealth 240 'OmniParser'
    if ($omni -and $omni.ok -eq $true) {
      $omniReady = $true
      Info 'OmniParser is ready.'
    } else {
      Write-Host "   OmniParser is not ready yet. RenderBridge can start, but imports may fail until the visual engine is ready." -ForegroundColor Yellow
    }
  }
}

Step 'Checking RenderBridge'
$bridge = Test-JsonEndpoint 'http://127.0.0.1:8844/health'
if ($bridge -and $bridge.ok -eq $true) {
  Info 'RenderBridge is already running.'
} else {
  Step 'Starting RenderBridge in a minimized PowerShell window'
  $renderCommand = "`$env:OMNIPARSER_ENDPOINT='$OmniEndpoint'; Set-Location -LiteralPath '$RenderBridgeDir'; if (-not (Test-Path 'node_modules')) { npm.cmd install }; npm.cmd start"
  Start-ProcessWindow 'DesignIT RenderBridge' $renderCommand
}

Step 'Waiting for RenderBridge health'
$bridge = Wait-JsonEndpoint 'http://127.0.0.1:8844/health' 90 'RenderBridge'
if (-not ($bridge -and $bridge.ok -eq $true)) {
  throw 'RenderBridge did not become ready. Check the DesignIT RenderBridge PowerShell window.'
}

Step 'DesignIT local engine status'
Info 'RenderBridge: READY at http://127.0.0.1:8844/health'
if ($omniReady) {
  Info "Visual engine: READY at $OmniHealth"
  Show-DesignItMessage 'DesignIT Ready' "DesignIT local engine is ready.`n`nYou can now open the Figma plugin and import by website URL."
} else {
  Info "Visual engine: NOT READY at $OmniHealth"
  Show-DesignItMessage 'DesignIT Partially Ready' "RenderBridge is running, but the external visual engine is not ready yet.`n`nKeep the OmniParser window open. Imports will work after http://127.0.0.1:7860/health returns ok=true."
}

Write-Host "`nDesignIT launcher finished. Keep the started service windows open while using the Figma plugin." -ForegroundColor Green
