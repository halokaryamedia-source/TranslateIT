param(
  [string]$TargetUrl = 'https://www.mivubi.com/',
  [string]$OmniEndpoint = 'http://127.0.0.1:7860/parse',
  [switch]$SkipOmniStart
)

$ErrorActionPreference = 'Stop'

function Step($Text) {
  Write-Host "`n==> $Text" -ForegroundColor Cyan
}

function Wait-Http($Url, $Seconds = 90) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $Url -TimeoutSec 3
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { return $true }
    } catch {}
    Start-Sleep -Seconds 2
  }
  return $false
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TranslateItRoot = Resolve-Path (Join-Path $ScriptDir '..')
$RenderBridgeDir = Join-Path $TranslateItRoot 'RenderBridge'
$OmniStart = Join-Path $ScriptDir 'start-omni-wsl.ps1'

if (-not (Test-Path $RenderBridgeDir)) {
  throw "RenderBridge folder not found: $RenderBridgeDir"
}

if (-not $SkipOmniStart) {
  Step 'Starting OmniParser parse server in a separate PowerShell window'
  Start-Process powershell -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-File', $OmniStart)

  Step 'Waiting for OmniParser /parse health'
  $health = $OmniEndpoint -replace '/parse$', '/health'
  if (-not (Wait-Http $health 120)) {
    throw "OmniParser health endpoint is not ready: $health"
  }
}

Step 'Starting RenderBridge'
Set-Location $RenderBridgeDir
$env:OMNIPARSER_ENDPOINT = $OmniEndpoint
$env:TRANSLATEIT_TARGET_URL = $TargetUrl

if (-not (Test-Path (Join-Path $RenderBridgeDir 'node_modules'))) {
  npm.cmd install
}

Write-Host "`nREADY TARGET URL: $TargetUrl" -ForegroundColor Green
Write-Host "OMNIPARSER_ENDPOINT: $env:OMNIPARSER_ENDPOINT" -ForegroundColor Green
Write-Host "Figma manifest: $TranslateItRoot\plugin\manifest.json" -ForegroundColor Green

npm.cmd start
