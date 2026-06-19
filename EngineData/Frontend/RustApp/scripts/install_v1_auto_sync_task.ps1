param(
  [int]$EveryMinutes = 60,
  [string]$TaskName = "TranslateIT V1 Local Sync Test"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SyncScript = Join-Path $ScriptDir "run_v1_local_sync_and_test.ps1"
if (-not (Test-Path $SyncScript)) {
  throw "Sync script not found: $SyncScript"
}

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$SyncScript`" -SkipInstall -SkipRuntimeReport"
$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes)
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "TranslateIT V1 optional local sync and quick validation task." -Force | Out-Null
Write-Host "Installed scheduled task: $TaskName" -ForegroundColor Green
Write-Host "Interval minutes: $EveryMinutes" -ForegroundColor Green
Write-Host "This task stashes local changes before pulling V1." -ForegroundColor Yellow
