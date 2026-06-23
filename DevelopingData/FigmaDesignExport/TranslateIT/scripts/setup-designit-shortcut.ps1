$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildScript = Join-Path $ScriptDir 'build-designit-launcher.ps1'
$NativeLauncher = Join-Path $ScriptDir 'DesignIT.exe'
$FallbackLauncher = Join-Path $ScriptDir 'DesignIT-Start.vbs'
$Stopper = Join-Path $ScriptDir 'DesignIT-Stop.cmd'
$Desktop = [Environment]::GetFolderPath('Desktop')

if ((Test-Path $BuildScript) -and -not (Test-Path $NativeLauncher)) {
  Write-Host 'Native launcher is missing. Building DesignIT.exe first...' -ForegroundColor Cyan
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File $BuildScript
}

$Launcher = if (Test-Path $NativeLauncher) { $NativeLauncher } else { $FallbackLauncher }

if (-not (Test-Path $Launcher)) {
  throw "Launcher not found: $Launcher"
}

$shell = New-Object -ComObject WScript.Shell

$startShortcut = $shell.CreateShortcut((Join-Path $Desktop 'DesignIT Start.lnk'))
$startShortcut.TargetPath = $Launcher
$startShortcut.WorkingDirectory = $ScriptDir
$startShortcut.Description = 'Start DesignIT local engine for Figma import'
$startShortcut.IconLocation = if (Test-Path $NativeLauncher) { $NativeLauncher } else { 'shell32.dll,167' }
$startShortcut.Save()

if (Test-Path $Stopper) {
  $stopShortcut = $shell.CreateShortcut((Join-Path $Desktop 'DesignIT Stop.lnk'))
  $stopShortcut.TargetPath = $Stopper
  $stopShortcut.WorkingDirectory = $ScriptDir
  $stopShortcut.Description = 'Stop DesignIT local engine'
  $stopShortcut.IconLocation = 'shell32.dll,131'
  $stopShortcut.Save()
}

Write-Host 'Desktop shortcuts created:' -ForegroundColor Green
Write-Host (Join-Path $Desktop 'DesignIT Start.lnk') -ForegroundColor Green
Write-Host (Join-Path $Desktop 'DesignIT Stop.lnk') -ForegroundColor Green
Write-Host "Launcher target: $Launcher" -ForegroundColor Green
