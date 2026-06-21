param(
  [string]$Url = 'https://www.mivubi.com/'
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host 'TranslateIT Clean Engine Preflight' -ForegroundColor Cyan
Write-Host "Target: $Url"
Write-Host 'Routing to run-full-regression-and-open.ps1 so reports are consistent.' -ForegroundColor Yellow

$runner = Join-Path $Root 'run-full-regression-and-open.ps1'
if (!(Test-Path $runner)) {
  throw "Missing runner: $runner"
}

& $runner -TargetUrl $Url
