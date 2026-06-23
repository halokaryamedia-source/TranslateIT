$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Launcher = Join-Path $ScriptDir 'DesignIT-Start.vbs'
$Stopper = Join-Path $ScriptDir 'DesignIT-Stop.cmd'
$Desktop = [Environment]::GetFolderPath('Desktop')

if (-not (Test-Path $Launcher)) {
  throw "Launcher not found: $Launcher"
}

$shell = New-Object -ComObject WScript.Shell

$startShortcut = $shell.CreateShortcut((Join-Path $Desktop 'DesignIT Start.lnk'))
$startShortcut.TargetPath = $Launcher
$startShortcut.WorkingDirectory = $ScriptDir
$startShortcut.Description = 'Start DesignIT local engine for Figma import'
$startShortcut.IconLocation = 'shell32.dll,167'
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
