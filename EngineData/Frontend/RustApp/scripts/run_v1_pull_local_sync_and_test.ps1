param(
  [switch]$SkipInstall,
  [switch]$SkipReports,
  [switch]$OpenReport
)

$ErrorActionPreference = "Stop"
$TargetBranch = "V1-Pull"

function Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppRoot = Resolve-Path (Join-Path $ScriptDir "..")
$RepoRoot = Resolve-Path (Join-Path $AppRoot "..\..\..")
$ReportRoot = Join-Path $RepoRoot "UserData\LogData\RuntimeTestReports"
$RuntimeReportPath = Join-Path $ReportRoot "latest-runtime-test.md"
$FrontendBackendContractPath = Join-Path $ReportRoot "latest-frontend-backend-contract.md"
$WorkerContractPath = Join-Path $ReportRoot "latest-worker-contract.md"
$RustLinkagePath = Join-Path $ReportRoot "latest-rust-module-linkage.md"
$VoiceReportPath = Join-Path $ReportRoot "latest-voice-preflight.md"
$VoiceCaptureEvidencePath = Join-Path $ReportRoot "latest-voice-capture-evidence.md"
$UiReportPath = Join-Path $ReportRoot "latest-ui-readiness.md"
$UiBindingReportPath = Join-Path $ReportRoot "latest-ui-binding-consistency.md"
$ActionBindingReportPath = Join-Path $ReportRoot "latest-action-binding.md"
$SettingsReportPath = Join-Path $ReportRoot "latest-settings-integrity.md"
$ProfessionalGatePath = Join-Path $ReportRoot "latest-professional-gate.md"
$LogDir = Join-Path $RepoRoot "UserData\LogData\Automation"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$LogPath = Join-Path $LogDir "v1-pull-local-sync-test-$Stamp.log"

Start-Transcript -Path $LogPath -Force | Out-Null
try {
  Step "Repository sync: V1-Pull"
  Set-Location $RepoRoot
  $Changes = git status --porcelain
  if ($Changes) {
    git stash push -u -m "automation-backup-before-v1-pull-sync-$Stamp"
  }
  git fetch origin
  git checkout $TargetBranch
  git pull --ff-only origin $TargetBranch

  Step "RustApp dependency check"
  Set-Location $AppRoot
  if (-not $SkipInstall) {
    npm.cmd install
  }

  if ($SkipReports) {
    Step "Quick validation"
    npm.cmd run validate:quick
  } else {
    Step "Professional local final reports"
    npm.cmd run test:local-final
  }

  Step "Done"
  Write-Host "Branch: $TargetBranch" -ForegroundColor Green
  Write-Host "Automation log: $LogPath" -ForegroundColor Green
  foreach ($ReportPath in @($FrontendBackendContractPath, $WorkerContractPath, $RustLinkagePath, $RuntimeReportPath, $VoiceReportPath, $VoiceCaptureEvidencePath, $UiReportPath, $UiBindingReportPath, $ActionBindingReportPath, $SettingsReportPath, $ProfessionalGatePath)) {
    if (Test-Path $ReportPath) {
      Write-Host "Report: $ReportPath" -ForegroundColor Green
    }
  }
  if ($OpenReport -and (Test-Path $ProfessionalGatePath)) {
    notepad $ProfessionalGatePath
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
