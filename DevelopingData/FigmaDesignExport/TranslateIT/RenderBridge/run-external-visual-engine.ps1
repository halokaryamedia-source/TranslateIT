param(
  [string]$OmniParserDir = "D:\Tools\OmniParser",
  [int]$Port = 7860
)

$ErrorActionPreference = "Stop"
$RenderBridgeDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EngineScript = Join-Path $RenderBridgeDir "tools\omniparser-detection-endpoint.py"
$VenvPython = Join-Path $OmniParserDir ".venv\Scripts\python.exe"

if (!(Test-Path $VenvPython)) {
  throw "OmniParser venv python not found: $VenvPython"
}
if (!(Test-Path $EngineScript)) {
  throw "External visual engine script not found: $EngineScript"
}

$env:OMNIPARSER_REPO = $OmniParserDir
$env:OMNIPARSER_WEIGHTS = Join-Path $OmniParserDir "weights"
$env:OMNIPARSER_USE_PADDLEOCR = "0"
$env:OMNIPARSER_PORT = "$Port"

Write-Host "Starting external visual engine detection-only endpoint..." -ForegroundColor Cyan
Write-Host "Endpoint: http://127.0.0.1:$Port/parse" -ForegroundColor Green
Write-Host "Caption model disabled. flash_attn is not required." -ForegroundColor Yellow
& $VenvPython $EngineScript
