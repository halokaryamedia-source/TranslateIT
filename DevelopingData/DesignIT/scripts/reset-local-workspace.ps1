param(
  [string]$WorkspaceRoot,
  [switch]$RemoveScattered,
  [switch]$CleanGenerated,
  [switch]$CleanDesignITWorkspace
)

$ErrorActionPreference = 'Stop'
function Step($Text) { Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Info($Text) { Write-Host $Text -ForegroundColor Gray }
function Warn($Text) { Write-Host $Text -ForegroundColor Yellow }
function Remove-IfExists($Path) { if (Test-Path $Path) { Remove-Item -Recurse -Force $Path; Info "Removed: $Path" } }
function Move-IfExists($Source, $Destination) {
  if (-not (Test-Path $Source)) { return }
  if (Test-Path $Destination) {
    Warn "Destination already exists, removing old source instead: $Source"
    Remove-IfExists $Source
    return
  }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destination) | Out-Null
  Move-Item -Path $Source -Destination $Destination
  Info "Moved: $Source -> $Destination"
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TranslateItRoot = Resolve-Path (Join-Path $ScriptDir '..')
if (-not $WorkspaceRoot) { $WorkspaceRoot = Resolve-Path (Join-Path $TranslateItRoot '..') }
$WorkspaceRoot = [System.IO.Path]::GetFullPath($WorkspaceRoot)
$TranslateItRoot = [System.IO.Path]::GetFullPath($TranslateItRoot)
$RepoRoot = Resolve-Path (Join-Path $TranslateItRoot '..\..\..')
$RepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)

$OldExternalRoot = Join-Path $WorkspaceRoot '_external'
$OldRuntimeRoot = Join-Path $WorkspaceRoot '_runtime'
$OldReportsRoot = Join-Path $WorkspaceRoot '_reports'
$DataRoot = Join-Path $RepoRoot 'UserData\CacheData\DesignIT'
$LogRoot = Join-Path $RepoRoot 'UserData\LogData\DesignIT'
$ExternalRoot = Join-Path $DataRoot '_external'
$RuntimeRoot = Join-Path $DataRoot '_runtime'
$ReportsRoot = Join-Path $DataRoot '_reports'
$OmniTarget = Join-Path $ExternalRoot 'OmniParser'
$OldOmniWindows = 'D:' + '\Tools' + '\OmniParser'
$RenderBridgeReports = Join-Path $TranslateItRoot 'RenderBridge\reports'

Step 'Workspace target'
Info "RepoRoot        : $RepoRoot"
Info "Visible root    : $WorkspaceRoot"
Info "DesignIT root   : $TranslateItRoot"
Info "DataRoot        : $DataRoot"
Info "LogRoot         : $LogRoot"
Info "ExternalRoot    : $ExternalRoot"
Info "RuntimeRoot     : $RuntimeRoot"
Info "ReportsRoot     : $ReportsRoot"

Step 'Prepare UserData runtime location'
New-Item -ItemType Directory -Force -Path $DataRoot, $LogRoot | Out-Null

Step 'Relocate old visible runtime folders'
Move-IfExists $OldExternalRoot $ExternalRoot
if ($CleanGenerated) {
  Remove-IfExists $OldRuntimeRoot
  Remove-IfExists $OldReportsRoot
  Remove-IfExists $RenderBridgeReports
  Remove-IfExists $RuntimeRoot
  Remove-IfExists $ReportsRoot
} else {
  Move-IfExists $OldRuntimeRoot $RuntimeRoot
  Move-IfExists $OldReportsRoot $ReportsRoot
}

Step 'Consolidate Windows OmniParser folder'
if ((Test-Path $OldOmniWindows) -and -not (Test-Path $OmniTarget)) {
  New-Item -ItemType Directory -Force -Path $ExternalRoot | Out-Null
  Move-Item -Path $OldOmniWindows -Destination $OmniTarget
  Info 'Moved external parser folder into UserData cache.'
} elseif ((Test-Path $OldOmniWindows) -and (Test-Path $OmniTarget) -and $RemoveScattered) {
  Remove-IfExists $OldOmniWindows
} elseif (Test-Path $OldOmniWindows) {
  Warn 'A scattered parser folder still exists outside the workspace. Use -RemoveScattered after verifying the UserData copy.'
} elseif (Test-Path $OmniTarget) {
  Info "Parser folder is already inside UserData cache: $OmniTarget"
} else {
  Warn 'Parser folder is not present yet. start-omni-wsl.ps1 will prepare it when needed.'
}

if ($CleanDesignITWorkspace) {
  Step 'Clean obsolete visible workspace files and folders'
  $obsoletePaths = @(
    (Join-Path $TranslateItRoot 'BuildPackage'),
    (Join-Path $TranslateItRoot 'Samples'),
    (Join-Path $TranslateItRoot 'Tools'),
    (Join-Path $TranslateItRoot 'Start-TranslateIT-OneTerminal.ps1'),
    (Join-Path $TranslateItRoot 'WORKFLOW.md'),
    (Join-Path $TranslateItRoot 'README.md'),
    (Join-Path $TranslateItRoot 'figma-component-map.json'),
    (Join-Path $TranslateItRoot 'figma-export.manifest.json'),
    (Join-Path $TranslateItRoot 'figma-icon-map.json'),
    (Join-Path $TranslateItRoot 'figma-page-map.json'),
    (Join-Path $TranslateItRoot 'figma-tokens.json'),
    (Join-Path $TranslateItRoot 'DesignIT_PHASE_1_PROFESSIONAL_PLAN.md'),
    (Join-Path $TranslateItRoot 'DesignIT_PHASE_2_CONTROLLED_DEVELOPMENT_REPORT.md'),
    (Join-Path $WorkspaceRoot '_reports'),
    (Join-Path $WorkspaceRoot '_runtime'),
    (Join-Path $WorkspaceRoot '_external')
  )

  foreach ($path in $obsoletePaths) {
    Remove-IfExists $path
  }

  $oldDesktopShortcuts = @(
    (Join-Path ([Environment]::GetFolderPath('Desktop')) 'DesignIT Start.lnk'),
    (Join-Path ([Environment]::GetFolderPath('Desktop')) 'DesignIT Stop.lnk')
  )
  foreach ($shortcut in $oldDesktopShortcuts) {
    Remove-IfExists $shortcut
  }
}

Step 'Done'
Info 'Visible DesignIT workspace should now focus on docs, plugin, RenderBridge, and scripts.'
