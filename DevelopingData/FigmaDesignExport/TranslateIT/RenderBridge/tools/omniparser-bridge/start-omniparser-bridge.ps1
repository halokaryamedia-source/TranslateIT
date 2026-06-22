param(
  [string]$OmniParserRepo = 'D:\Tools\OmniParser',
  [string]$HostName = '127.0.0.1',
  [int]$Port = 7860,
  [switch]$NoPaddleOcr
)

$ErrorActionPreference = 'Stop'
$BridgeRoot = $PSScriptRoot
$BridgeServer = Join-Path $BridgeRoot 'omniparser_bridge_server.py'

if (!(Test-Path $BridgeServer)) {
  throw "Bridge server not found: $BridgeServer"
}

if (!(Test-Path $OmniParserRepo)) {
  throw "OmniParser repo not found: $OmniParserRepo. Clone https://github.com/microsoft/OmniParser.git first."
}

$env:OMNIPARSER_REPO = $OmniParserRepo
$env:OMNIPARSER_WEIGHTS = Join-Path $OmniParserRepo 'weights'
$env:OMNIPARSER_HOST = $HostName
$env:OMNIPARSER_PORT = [string]$Port
$env:OMNIPARSER_USE_PADDLEOCR = if ($NoPaddleOcr) { '0' } else { '1' }

Write-Host 'Starting TranslateIT OmniParser Bridge...' -ForegroundColor Cyan
Write-Host "Bridge: http://$HostName`:$Port/parse"
Write-Host "OMNIPARSER_REPO=$env:OMNIPARSER_REPO"
Write-Host "OMNIPARSER_WEIGHTS=$env:OMNIPARSER_WEIGHTS"
Write-Host ''
Write-Host 'After this is running, use this in the RenderBridge terminal:' -ForegroundColor Yellow
Write-Host "`$env:OMNIPARSER_ENDPOINT='http://$HostName`:$Port/parse'"
Write-Host ''

python $BridgeServer
