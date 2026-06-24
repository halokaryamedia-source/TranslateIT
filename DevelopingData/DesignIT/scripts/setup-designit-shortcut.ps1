$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildScript = Join-Path $ScriptDir 'build-designit-launcher.ps1'
$TargetRoot = Resolve-Path (Join-Path $ScriptDir '..\..\..\..')
$NativeLauncher = Join-Path $TargetRoot 'DesignIT.exe'
$Desktop = [Environment]::GetFolderPath('Desktop')

$oldShortcuts = @(
  (Join-Path $Desktop 'DesignIT Start.lnk'),
  (Join-Path $Desktop 'DesignIT Stop.lnk')
)

foreach ($shortcut in $oldShortcuts) {
  if (Test-Path $shortcut) {
    Remove-Item -LiteralPath $shortcut -Force
    Write-Host "Removed old desktop shortcut: $shortcut" -ForegroundColor Yellow
  }
}

if (-not (Test-Path $BuildScript)) {
  throw "Build script not found: $BuildScript"
}

Write-Host 'Building native launcher in target root...' -ForegroundColor Cyan
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $BuildScript

if (-not (Test-Path $NativeLauncher)) {
  throw "DesignIT.exe was not created: $NativeLauncher"
}

Write-Host ''
Write-Host 'DesignIT launcher is ready in target root:' -ForegroundColor Green
Write-Host $NativeLauncher -ForegroundColor Green
Write-Host ''
Write-Host 'No Desktop shortcut was created.' -ForegroundColor Green
Write-Host 'Use this single launcher file from the target root:' -ForegroundColor Cyan
Write-Host 'DesignIT.exe' -ForegroundColor Green
