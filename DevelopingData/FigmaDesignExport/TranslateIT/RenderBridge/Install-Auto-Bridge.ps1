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

Write-Host '[INFO] Preparing Render Bridge dependencies...' -ForegroundColor Cyan
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

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description 'Starts the TranslateIT local Render Bridge for Figma plugin website imports.' | Out-Null

Write-Host '[INFO] Starting Render Bridge now...' -ForegroundColor Cyan
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 4

try {
  $health = Invoke-WebRequest 'http://127.0.0.1:8844/health' -UseBasicParsing -TimeoutSec 3
  if ($health.StatusCode -eq 200) {
    Write-Host '[DONE] Auto Bridge is installed and running.' -ForegroundColor Green
    Write-Host 'The Figma plugin can now import by website address automatically.' -ForegroundColor Green
    exit 0
  }
} catch {
  Write-Host '[WARNING] Startup task installed, but health check did not respond yet.' -ForegroundColor Yellow
  Write-Host 'It may still be installing Chromium. Try the Figma plugin again in a minute.' -ForegroundColor Yellow
  exit 0
}
