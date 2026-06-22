param(
  [string]$TargetUrl = "https://www.mivubi.com/",
  [string]$OmniParserDir = "D:\Tools\OmniParser",
  [string]$OmniParserRepo = "https://github.com/microsoft/OmniParser.git",
  [string]$OmniParserEndpoint = "http://127.0.0.1:7860/parse",
  [switch]$SkipOmniParserDownload,
  [switch]$SkipBrowserInstall,
  [switch]$SkipOmniParserPythonSetup
)

$ErrorActionPreference = "Stop"
$RenderBridgeDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RenderBridgeDir

function Step($Text) {
  Write-Host "`n==> $Text" -ForegroundColor Cyan
}

function NeedCommand($Name, $InstallHint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is not available. $InstallHint"
  }
}

Step "Checking required local tools"
NeedCommand "node" "Install Node.js LTS, then reopen PowerShell."
NeedCommand "npm.cmd" "Install Node.js LTS, then reopen PowerShell."
NeedCommand "git" "Install Git for Windows, then reopen PowerShell."

Step "Preparing npm dependencies"
if (-not (Test-Path (Join-Path $RenderBridgeDir "node_modules"))) {
  npm.cmd install
} else {
  Write-Host "node_modules already exists. Skipping npm install."
}

if (-not $SkipBrowserInstall) {
  Step "Preparing Playwright browser engine"
  npm.cmd run install-browser
}

Step "Preparing OmniParser folder if missing"
if (-not (Test-Path $OmniParserDir)) {
  if ($SkipOmniParserDownload) {
    Write-Host "OmniParser folder missing, but download skipped: $OmniParserDir" -ForegroundColor Yellow
  } else {
    New-Item -ItemType Directory -Path (Split-Path -Parent $OmniParserDir) -Force | Out-Null
    git clone $OmniParserRepo $OmniParserDir
  }
} else {
  Write-Host "OmniParser folder exists: $OmniParserDir"
}

if (-not $SkipOmniParserPythonSetup -and (Test-Path $OmniParserDir)) {
  Step "Preparing OmniParser Python environment if requirements exist"
  $requirements = Join-Path $OmniParserDir "requirements.txt"
  $venvPython = Join-Path $OmniParserDir ".venv\Scripts\python.exe"
  if (Test-Path $requirements) {
    if (-not (Test-Path $venvPython)) {
      NeedCommand "python" "Install Python 3.10+ and add it to PATH, then reopen PowerShell."
      python -m venv (Join-Path $OmniParserDir ".venv")
    }
    & $venvPython -m pip install --upgrade pip
    & $venvPython -m pip install -r $requirements
  } else {
    Write-Host "No OmniParser requirements.txt found. Skipping Python package setup." -ForegroundColor Yellow
  }
}

$env:OMNIPARSER_REPO = $OmniParserDir
$env:OMNIPARSER_WEIGHTS = Join-Path $OmniParserDir "weights"
$env:OMNIPARSER_USE_PADDLEOCR = "0"
$env:OMNIPARSER_USE_LOCAL_SEMANTICS = "0"
$env:OMNIPARSER_ENDPOINT = $OmniParserEndpoint
$env:TRANSLATEIT_TARGET_URL = $TargetUrl

Step "Running final payload v2"
node ./src/write-final-payload-report-v2.mjs $TargetUrl ./reports/translateit-final-payload-v2.json

Step "Running final pretest bundle from final payload v2"
node ./src/run-pretest-quality-bundle.mjs ./reports/translateit-final-payload-v2.json ./reports

Step "Running responsive plan report from final payload v2"
node ./src/write-responsive-render-report.mjs ./reports/translateit-final-payload-v2.json ./reports/translateit-responsive-render-plan.json

Step "Done"
Write-Host "Reports generated in: $RenderBridgeDir\reports" -ForegroundColor Green
Write-Host "Important files:" -ForegroundColor Green
Write-Host "- reports\translateit-final-payload-v2.json"
Write-Host "- reports\translateit-final-payload-health.json"
Write-Host "- reports\translateit-asset-reliability.json"
Write-Host "- reports\translateit-figma-import-safety.json"
Write-Host "- reports\translateit-visual-fidelity-precheck.json"
Write-Host "- reports\translateit-plugin-render-contract.json"
Write-Host "- reports\translateit-pretest-decision.json"
Write-Host "`nNext Figma step:" -ForegroundColor Yellow
Write-Host "Use plugin\manifest.production.json, then import reports\translateit-final-payload-v2.json."
