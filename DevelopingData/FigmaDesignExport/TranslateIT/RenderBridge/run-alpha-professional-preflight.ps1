$ErrorActionPreference = 'Stop'
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$StartScript = Join-Path $ProjectRoot 'scripts\start-dev.ps1'
powershell -ExecutionPolicy Bypass -File $StartScript
