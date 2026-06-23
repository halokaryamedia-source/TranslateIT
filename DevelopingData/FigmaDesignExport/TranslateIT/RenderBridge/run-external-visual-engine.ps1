param([int]$Port = 7860)
$ErrorActionPreference = 'Stop'
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$OmniScript = Join-Path $ProjectRoot 'scripts\start-omni-wsl.ps1'
powershell -ExecutionPolicy Bypass -File $OmniScript -Port $Port
