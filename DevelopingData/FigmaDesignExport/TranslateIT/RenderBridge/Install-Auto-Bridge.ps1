$ErrorActionPreference = 'Stop'

$BridgeDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Launcher = Join-Path $BridgeDir 'Start-Render-Bridge-Background.ps1'
$TaskName = 'TranslateIT Render Bridge'

if (!(Test-Path $Launcher)) {
  Write-Host "[ERROR] Missing launcher: $Launcher" -ForegroundColor Red
  exit 1
}

if (!(Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host '[ERROR] Node.js is not installed or not available in PATH.' -ForegroundColor Red
  Write-Host 'Install Node.js LTS, then run Install-Auto-Bridge.cmd again.' -ForegroundColor Yellow
  exit 1
}

Write-Host '[INFO] Preparing TranslateIT clean RenderBridge dependencies...' -ForegroundColor Cyan
Set-Location $BridgeDir

if (!(Test-Path (Join-Path $BridgeDir 'node_modules'))) {
  npm install
}

npx playwright install chromium

Write-Host '[INFO] Creating Windows startup task...' -ForegroundColor Cyan

$Action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Launcher`""
$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 12) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

try {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
} catch {}

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description 'Starts the TranslateIT clean local RenderBridge for Figma plugin website imports.' | Out-Null

Write-Host '[INFO] Starting TranslateIT clean RenderBridge now...' -ForegroundColor Cyan
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 4

try {
  $health = Invoke-RestMethod 'http://127.0.0.1:8844/health' -TimeoutSec 3
  if (($health.publicVersion -eq 'Version 0.1 - Alpha') -and ($health.engine -eq 'translateit-core') -and ($health.engineBuild -eq 'alpha-clean-1') -and ($health.legacyActive -eq $false)) {
    Write-Host '[DONE] TranslateIT clean Auto Bridge is installed and running.' -ForegroundColor Green
    Write-Host 'The Figma plugin can now import by website address automatically.' -ForegroundColor Green
    exit 0
  }
  Write-Host "[ERROR] Bridge responded but is not clean engine. Engine: $($health.engine)" -ForegroundColor Red
  exit 1
} catch {
  Write-Host '[WARNING] Startup task installed, but clean RenderBridge health check did not respond yet.' -ForegroundColor Yellow
  Write-Host 'It may still be installing Chromium. Try again in a minute.' -ForegroundColor Yellow
  exit 0
}
