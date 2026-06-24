param(
  [string]$InstallRoot = 'D:\Tools\TranslateIT-Engines',
  [string]$EnvName = 'translateit-omni'
)

$ErrorActionPreference = 'Stop'
$RepoUrl = 'https://github.com/microsoft/OmniParser.git'
$OmniDir = Join-Path $InstallRoot 'OmniParser'
$AdapterSource = Join-Path $PSScriptRoot 'translateit_omniparser_api.py'

Write-Host 'Installing TranslateIT OmniParser V2 Adapter' -ForegroundColor Green
New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null

if (!(Test-Path $OmniDir)) {
  git clone $RepoUrl $OmniDir
} else {
  cd $OmniDir
  git pull --ff-only
}

cd $OmniDir
conda create -n $EnvName python=3.12 -y
conda run -n $EnvName python -m pip install --upgrade pip
conda run -n $EnvName python -m pip install -r requirements.txt
conda run -n $EnvName python -m pip install fastapi uvicorn pydantic python-multipart huggingface_hub

Write-Host 'Downloading OmniParser V2 weights from Hugging Face...' -ForegroundColor Cyan
conda run -n $EnvName huggingface-cli download microsoft/OmniParser-v2.0 icon_detect/train_args.yaml --local-dir weights
conda run -n $EnvName huggingface-cli download microsoft/OmniParser-v2.0 icon_detect/model.pt --local-dir weights
conda run -n $EnvName huggingface-cli download microsoft/OmniParser-v2.0 icon_detect/model.yaml --local-dir weights
conda run -n $EnvName huggingface-cli download microsoft/OmniParser-v2.0 icon_caption/config.json --local-dir weights
conda run -n $EnvName huggingface-cli download microsoft/OmniParser-v2.0 icon_caption/generation_config.json --local-dir weights
conda run -n $EnvName huggingface-cli download microsoft/OmniParser-v2.0 icon_caption/model.safetensors --local-dir weights

$Caption = Join-Path $OmniDir 'weights\icon_caption'
$Florence = Join-Path $OmniDir 'weights\icon_caption_florence'
if ((Test-Path $Caption) -and !(Test-Path $Florence)) {
  Move-Item $Caption $Florence
}

Copy-Item $AdapterSource (Join-Path $OmniDir 'translateit_omniparser_api.py') -Force

Write-Host ''
Write-Host 'DONE. Start endpoint with:' -ForegroundColor Green
Write-Host "powershell -ExecutionPolicy Bypass -File `"$PSScriptRoot\Start-OmniParser-V2.ps1`" -InstallRoot `"$InstallRoot`" -EnvName `"$EnvName`"" -ForegroundColor Yellow
Write-Host ''
Write-Host 'Then set:' -ForegroundColor Green
Write-Host '$env:OMNIPARSER_ENDPOINT=''http://127.0.0.1:7860/parse''' -ForegroundColor Yellow
