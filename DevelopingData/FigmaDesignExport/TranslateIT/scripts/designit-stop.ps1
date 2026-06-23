$ErrorActionPreference = 'Continue'

function Stop-Port($Port) {
  Write-Host "Stopping processes on port $Port..." -ForegroundColor Cyan
  $pids = @()
  try {
    $lines = netstat -ano | Select-String ":$Port"
    foreach ($line in $lines) {
      $parts = ($line.Line -split '\s+') | Where-Object { $_ }
      $pid = $parts[-1]
      if ($pid -match '^\d+$') { $pids += [int]$pid }
    }
  } catch {}
  $pids = $pids | Sort-Object -Unique
  foreach ($pid in $pids) {
    if ($pid -eq $PID) { continue }
    try {
      Write-Host "Killing PID $pid" -ForegroundColor Yellow
      taskkill /PID $pid /F /T | Out-Null
    } catch {}
  }
}

Stop-Port 8844
Stop-Port 7860

Write-Host 'DesignIT local engine stop command finished.' -ForegroundColor Green
