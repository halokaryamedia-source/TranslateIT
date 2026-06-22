param(
  [string]$InstallRoot = 'D:\Tools\TranslateIT-Engines',
  [string]$EnvName = 'translateit-omni',
  [int]$Port = 7860
)

$ErrorActionPreference = 'Stop'
$OmniDir = Join-Path $InstallRoot 'OmniParser'
$AdapterSource = Join-Path $PSScriptRoot 'translateit_omniparser_api.py'
$AdapterTarget = Join-Path $OmniDir 'translateit_omniparser_api.py'

if (!(Test-Path $OmniDir)) {
  throw "OmniParser folder not found: $OmniDir. Run Install-OmniParser-V2.ps1 first."
}

Copy-Item $AdapterSource $AdapterTarget -Force
cd $OmniDir
$env:PYTHONUNBUFFERED = '1'
Write-Host "Starting TranslateIT OmniParser adapter on http://127.0.0.1:$Port/parse" -ForegroundColor Green
conda run -n $EnvName python translateit_omniparser_api.py
