param(
  [switch]$SkipInstall,
  [switch]$SkipRuntimeReport,
  [switch]$OpenReport
)

$ErrorActionPreference = "Stop"

function Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppRoot = Resolve-Path (Join-Path $ScriptDir "..")
$RepoRoot = Resolve-Path (Join-Path $AppRoot "..\..\..")
$ReportPath = Join-Path $RepoRoot "UserData\LogData\RuntimeTestReports\latest-runtime-test.md"
$LogDir = Join-Path $RepoRoot "UserData\LogData\Automation"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$LogPath = Join-Path $LogDir "v1-local-sync-test-$Stamp.log"

Start-Transcript -Path $LogPath -Force | Out-Null
try {
  Step "Repository sync"
  Set-Location $RepoRoot
  $Changes = git status --porcelain
  if ($Changes) {
    git stash push -u -m "automation-backup-before-v1-sync-$Stamp"
  }
  git fetch origin
  git checkout V1
  git pull --ff-only origin V1

  Step "RustApp dependency check"
  Set-Location $AppRoot
  if (-not $SkipInstall) {
    npm.cmd install
  }

  Step "Quick validation"
  npm.cmd run validate:quick

  if (-not $SkipRuntimeReport) {
    Step "Runtime report"
    npm.cmd run test:runtime-report
  }

  Step "Done"
  Write-Host "Automation log: $LogPath" -ForegroundColor Green
  if (Test-Path $ReportPath) {
    Write-Host "Runtime report: $ReportPath" -ForegroundColor Green
    if ($OpenReport) {
      notepad $ReportPath
    }
  }
} catch {
  Write-Host ""
  Write-Host "AUTOMATION FAILED" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host "Log: $LogPath" -ForegroundColor Yellow
  throw
} finally {
  Stop-Transcript | Out-Null
}
