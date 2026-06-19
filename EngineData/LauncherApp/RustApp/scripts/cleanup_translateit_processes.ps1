param()

$processes = Get-CimInstance Win32_Process | Where-Object {
  ($_.Name -match "node|npm|pnpm|yarn|cargo|tauri|translateit|python|esbuild" -and $_.CommandLine -match "TranslateIT|tauri|vite|src-tauri|RustApp|LocalWorker|translateit.exe") -or
  ($_.Name -match "msedgewebview2" -and $_.CommandLine -match "TranslateIT|tauri|vite|src-tauri|RustApp|LocalWorker|translateit.exe")
}

foreach ($process in $processes) {
  try {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
    Write-Host "Stopped process $($process.ProcessId) $($process.Name)"
  } catch {
    Write-Host "Skipped process $($process.ProcessId) $($process.Name): $($_.Exception.Message)"
  }
}
