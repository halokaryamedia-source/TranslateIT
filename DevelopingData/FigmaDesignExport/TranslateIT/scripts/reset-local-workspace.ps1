param(
  [string]$WorkspaceRoot,
  [switch]$RemoveScattered,
  [switch]$CleanGenerated
)

$ErrorActionPreference = 'Stop'
function Step($Text) { Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Info($Text) { Write-Host $Text -ForegroundColor Gray }
function Warn($Text) { Write-Host $Text -ForegroundColor Yellow }
function Remove-IfExists($Path) { if (Test-Path $Path) { Remove-Item -Recurse -Force $Path; Info "Removed: $Path" } }

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TranslateItRoot = Resolve-Path (Join-Path $ScriptDir '..')
if (-not $WorkspaceRoot) { $WorkspaceRoot = Resolve-Path (Join-Path $TranslateItRoot '..') }
$WorkspaceRoot = [System.IO.Path]::GetFullPath($WorkspaceRoot)
$TranslateItRoot = [System.IO.Path]::GetFullPath($TranslateItRoot)

$ExternalRoot = Join-Path $WorkspaceRoot '_external'
$RuntimeRoot = Join-Path $WorkspaceRoot '_runtime'
$ReportsRoot = Join-Path $WorkspaceRoot '_reports'
$OmniTarget = Join-Path $ExternalRoot 'OmniParser'
$OldOmniWindows = 'D:' + '\Tools' + '\OmniParser'
$RenderBridgeReports = Join-Path $TranslateItRoot 'RenderBridge\reports'

Step 'Workspace target'
Info "WorkspaceRoot : $WorkspaceRoot"
Info "TranslateIT    : $TranslateItRoot"
Info "ExternalRoot   : $ExternalRoot"
Info "RuntimeRoot    : $RuntimeRoot"
Info "ReportsRoot    : $ReportsRoot"

Step 'Create workspace folders'
New-Item -ItemType Directory -Force -Path $ExternalRoot, $RuntimeRoot, $ReportsRoot | Out-Null

Step 'Consolidate Windows OmniParser folder'
if ((Test-Path $OldOmniWindows) -and -not (Test-Path $OmniTarget)) {
  Move-Item -Path $OldOmniWindows -Destination $OmniTarget
  Info "Moved external parser folder into workspace."
} elseif ((Test-Path $OldOmniWindows) -and (Test-Path $OmniTarget) -and $RemoveScattered) {
  Remove-IfExists $OldOmniWindows
} elseif (Test-Path $OldOmniWindows) {
  Warn 'A scattered parser folder still exists outside the workspace. Use -RemoveScattered after verifying the workspace copy.'
} elseif (Test-Path $OmniTarget) {
  Info "Parser folder is already inside workspace: $OmniTarget"
} else {
  Warn 'Parser folder is not present yet. start-omni-wsl.ps1 will prepare it when needed.'
}

if ($CleanGenerated) {
  Step 'Clean generated reports and runtime scratch files'
  Remove-IfExists $RenderBridgeReports
  Remove-IfExists $ReportsRoot
  Remove-IfExists $RuntimeRoot
  New-Item -ItemType Directory -Force -Path $ReportsRoot, $RuntimeRoot | Out-Null
}

Step 'Done'
Info 'All TranslateIT work files should stay under DevelopingData\FigmaDesignExport.'
