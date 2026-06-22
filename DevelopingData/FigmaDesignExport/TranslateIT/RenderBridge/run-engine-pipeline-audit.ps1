param([string]$TargetUrl='https://www.mivubi.com/')
$ErrorActionPreference='Continue'
$Root=$PSScriptRoot
$Reports=Join-Path $Root 'reports'
$ExitCodes=Join-Path $Reports 'self-audit-exit-codes.txt'
$Out=Join-Path $Reports 'renderbridge-stdout-latest.log'
$Err=Join-Path $Reports 'renderbridge-stderr-latest.log'
New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Remove-Item $ExitCodes,$Out,$Err -Force -ErrorAction SilentlyContinue
cd $Root
function Step($Name,[scriptblock]$Command){Write-Host "`n=== $Name ===" -ForegroundColor Cyan; try{& $Command; $code=$LASTEXITCODE; if($null -eq $code){$code=0}}catch{Write-Host $_.Exception.Message -ForegroundColor Red; $code=1}; Add-Content -Path $ExitCodes -Value "$Name=$code"; Write-Host "$Name exit code: $code"}
Step 'imports' { npm.cmd run test:imports }
Step 'external-engine-readiness' { node .\src\external-engine-readiness.mjs .\reports }
Get-NetTCPConnection -LocalPort 8844 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
$server=Start-Process -FilePath 'node' -ArgumentList 'server.mjs' -WorkingDirectory $Root -RedirectStandardOutput $Out -RedirectStandardError $Err -PassThru -WindowStyle Hidden
try{Start-Sleep -Seconds 3; Step 'framework-contract' { node .\tests\test-framework-output-contract.mjs }; Step 'blueprint-framework-output' { node .\tests\test-blueprint-framework-output.mjs $TargetUrl }; Step 'engine-pipeline-readiness' { node .\tests\test-engine-pipeline-readiness.mjs $TargetUrl }; Step 'engine-preview-page' { node .\src\write-engine-preview-page.mjs .\reports }}finally{if($server -and !$server.HasExited){Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue}}
Write-Host "`nENGINE PIPELINE AUDIT DONE" -ForegroundColor Green
Write-Host 'reports/translateit-external-engine-readiness.json'
Write-Host 'reports/translateit-engine-pipeline-readiness.json'
Write-Host 'reports/translateit-engine-preview.html'
if(Test-Path $ExitCodes){Get-Content $ExitCodes}
