param(
  [string]$TaskName = "TranslateIT V1 Local Sync Test"
)

$ErrorActionPreference = "Stop"
$Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($null -eq $Task) {
  Write-Host "Scheduled task not found: $TaskName" -ForegroundColor Yellow
  exit 0
}
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Host "Removed scheduled task: $TaskName" -ForegroundColor Green
