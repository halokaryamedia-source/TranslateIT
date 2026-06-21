param(
  [string]$TargetUrl = 'https://www.mivubi.com/'
)

$ErrorActionPreference = 'Stop'
$BridgeRoot = $PSScriptRoot
$Reports = Join-Path $BridgeRoot 'reports'
$Stdout = Join-Path $Reports 'renderbridge-stdout-latest.log'
$Stderr = Join-Path $Reports 'renderbridge-stderr-latest.log'

function Stop-Port8844 {
  Get-NetTCPConnection -LocalPort 8844 -ErrorAction SilentlyContinue | ForEach-Object {
    try {
      if ($_.OwningProcess) { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    } catch {}
  }
}

function Print-Server-Logs {
  Write-Host "`n--- RenderBridge STDOUT ---"
  if (Test-Path $Stdout) { Get-Content $Stdout -Tail 120 } else { Write-Host 'No stdout log.' }
  Write-Host "`n--- RenderBridge STDERR ---"
  if (Test-Path $Stderr) { Get-Content $Stderr -Tail 120 } else { Write-Host 'No stderr log.' }
}

cd $BridgeRoot
New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Remove-Item $Stdout,$Stderr -Force -ErrorAction SilentlyContinue

Write-Host 'TranslateIT full regression + report opener'
Write-Host "BridgeRoot: $BridgeRoot"
Write-Host "TargetUrl:  $TargetUrl"

if (!(Test-Path 'node_modules')) { npm.cmd install }
npx.cmd playwright install chromium

Stop-Port8844
Start-Sleep -Milliseconds 600

$server = Start-Process -FilePath 'node' -ArgumentList 'server.mjs' -WorkingDirectory $BridgeRoot -RedirectStandardOutput $Stdout -RedirectStandardError $Stderr -PassThru -WindowStyle Hidden
try {
  $health = $null
  $ok = $false
  for ($i = 0; $i -lt 35; $i++) {
    if ($server.HasExited) { throw "RenderBridge exited early with code $($server.ExitCode)." }
    try {
      $health = Invoke-RestMethod 'http://127.0.0.1:8844/health' -TimeoutSec 2
      if ($health.engine -eq 'translateit-core' -and $health.engineBuild -eq 'alpha-clean-1' -and $health.contract -eq 'cloneModel') { $ok = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
  }
  if (!$ok) {
    if ($health) { $health | ConvertTo-Json -Depth 20 | Write-Host } else { Write-Host 'No health response.' }
    throw 'RenderBridge health check failed.'
  }

  Write-Host "`nHealth OK"
  $health | ConvertTo-Json -Depth 20

  npm.cmd run test:imports
  npm.cmd run test:contract
  node .\tests\test-sample-sites.mjs $TargetUrl
  npm.cmd run test:regression

  & (Join-Path $BridgeRoot 'open-latest-reports.ps1')

  Write-Host "`nDONE. Main files:"
  Write-Host (Join-Path $Reports 'translateit-regression-site-mivubi-sample.json')
  Write-Host (Join-Path $Reports 'translateit-regression-site-mivubi-sample.png')
  Write-Host (Join-Path $Reports 'translateit-regression-site-mivubi-sample-diff.png')
  Write-Host (Join-Path $Reports 'translateit-regression-latest.json')
}
catch {
  Write-Host "`nFAILED: $($_.Exception.Message)" -ForegroundColor Red
  Print-Server-Logs
  throw
}
finally {
  if ($server -and !$server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
}
