param([string]$TargetUrl = 'https://www.mivubi.com/')
$ErrorActionPreference = 'Continue'
$BridgeRoot = $PSScriptRoot
$Reports = Join-Path $BridgeRoot 'reports'
$ExitCodes = Join-Path $Reports 'self-audit-exit-codes.txt'
$Stdout = Join-Path $Reports 'renderbridge-stdout-latest.log'
$Stderr = Join-Path $Reports 'renderbridge-stderr-latest.log'
New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Remove-Item $ExitCodes,$Stdout,$Stderr -Force -ErrorAction SilentlyContinue
cd $BridgeRoot
function Step($Name, [scriptblock]$Command) {
  Write-Host "`n=== $Name ===" -ForegroundColor Cyan
  try { & $Command; $code = $LASTEXITCODE; if ($null -eq $code) { $code = 0 } } catch { Write-Host $_.Exception.Message -ForegroundColor Red; $code = 1 }
  Add-Content -Path $ExitCodes -Value "$Name=$code"
  Write-Host "$Name exit code: $code"
}
Step 'imports' { npm.cmd run test:imports }
Step 'framework-contract' { node .\tests\test-framework-output-contract.mjs }
Get-NetTCPConnection -LocalPort 8844 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
$server = Start-Process -FilePath 'node' -ArgumentList 'server.mjs' -WorkingDirectory $BridgeRoot -RedirectStandardOutput $Stdout -RedirectStandardError $Stderr -PassThru -WindowStyle Hidden
try {
  Start-Sleep -Seconds 3
  Step 'blueprint-framework-output' { node .\tests\test-blueprint-framework-output.mjs $TargetUrl }
  Step 'html-export-package' { node .\src\export-url-html-package.mjs $TargetUrl .\reports\html-export-package }
} finally {
  if ($server -and !$server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
}
Write-Host "`nBLUEPRINT FRAMEWORK AUDIT DONE" -ForegroundColor Green
Write-Host "Reports:"
Write-Host 'reports/translateit-blueprint-framework-output.json'
Write-Host 'reports/translateit-framework-output-contract.json'
Write-Host 'reports/html-export-package/index.html'
if (Test-Path $ExitCodes) { Get-Content $ExitCodes }
