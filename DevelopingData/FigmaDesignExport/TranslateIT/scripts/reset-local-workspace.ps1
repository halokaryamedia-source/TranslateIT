param(
  [string]$WorkspaceRoot,
  [switch]$RemoveScattered,
  [switch]$CleanGenerated
)

$ErrorActionPreference = 'Stop'

function Step($Text) { Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Info($Text) { Write-Host $Text -ForegroundColor Gray }
function Warn($Text) { Write-Host $Text -ForegroundColor Yellow }

function ToWslPath($WindowsPath) {
  $resolved = [System.IO.Path]::GetFullPath($WindowsPath)
  $result = wsl.exe wslpath -a "$resolved"
  return ($result | Select-Object -First 1).Trim()
}

function Remove-IfExists($Path) {
  if (Test-Path $Path) {
    Remove-Item -Recurse -Force $Path
    Info "Removed: $Path"
  }
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TranslateItRoot = Resolve-Path (Join-Path $ScriptDir '..')
if (-not $WorkspaceRoot) { $WorkspaceRoot = Resolve-Path (Join-Path $TranslateItRoot '..') }
$WorkspaceRoot = [System.IO.Path]::GetFullPath($WorkspaceRoot)
$TranslateItRoot = [System.IO.Path]::GetFullPath($TranslateItRoot)

$ExternalRoot = Join-Path $WorkspaceRoot '_external'
$RuntimeRoot = Join-Path $WorkspaceRoot '_runtime'
$ReportsRoot = Join-Path $WorkspaceRoot '_reports'
$OmniTarget = Join-Path $ExternalRoot 'OmniParser'
$OldOmniWindows = 'D:\Tools\OmniParser'
$RenderBridgeReports = Join-Path $TranslateItRoot 'RenderBridge\reports'

Step 'Workspace target'
Info "WorkspaceRoot : $WorkspaceRoot"
Info "TranslateIT    : $TranslateItRoot"
Info "ExternalRoot   : $ExternalRoot"
Info "RuntimeRoot    : $RuntimeRoot"
Info "ReportsRoot    : $ReportsRoot"

Step 'Create clean workspace folders'
New-Item -ItemType Directory -Force -Path $ExternalRoot, $RuntimeRoot, $ReportsRoot | Out-Null

Step 'Consolidate Windows OmniParser folder'
if ((Test-Path $OldOmniWindows) -and -not (Test-Path $OmniTarget)) {
  Move-Item -Path $OldOmniWindows -Destination $OmniTarget
  Info "Moved $OldOmniWindows -> $OmniTarget"
} elseif ((Test-Path $OldOmniWindows) -and (Test-Path $OmniTarget) -and $RemoveScattered) {
  Remove-IfExists $OldOmniWindows
} elseif (Test-Path $OldOmniWindows) {
  Warn "Scattered folder exists: $OldOmniWindows. Use -RemoveScattered to delete it after workspace copy is verified."
} elseif (Test-Path $OmniTarget) {
  Info "OmniParser is already inside workspace: $OmniTarget"
} else {
  Warn "OmniParser is not present yet. start-omni-wsl.ps1 will clone it into _external when needed."
}

Step 'Consolidate WSL OmniParser folder'
try {
  $WorkspaceWsl = ToWslPath $WorkspaceRoot
  Info "WSL workspace : $WorkspaceWsl"
  $mode = if ($RemoveScattered) { 'remove' } else { 'check' }
  $cleanScript = @"
set -e
WORKSPACE='$WorkspaceWsl'
TARGET="`$WORKSPACE/_external/OmniParser"
SCATTERED="`$HOME/OmniParser"
mkdir -p "`$WORKSPACE/_external" "`$WORKSPACE/_runtime" "`$WORKSPACE/_reports"
if [ -d "`$SCATTERED/.git" ] && [ ! -d "`$TARGET/.git" ]; then
  mv "`$SCATTERED" "`$TARGET"
  echo "Moved WSL OmniParser clone into workspace: `$TARGET"
elif [ -d "`$SCATTERED" ] && [ -d "`$TARGET" ] && [ '$mode' = 'remove' ]; then
  rm -rf "`$SCATTERED"
  echo "Removed scattered WSL OmniParser folder: `$SCATTERED"
elif [ -d "`$SCATTERED" ]; then
  echo "Scattered WSL folder still exists: `$SCATTERED"
fi
"@
  $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($cleanScript -replace "`r", '')))
  wsl.exe bash -lc "printf '%s' '$encoded' | base64 -d | bash"
} catch {
  Warn "WSL check skipped: $($_.Exception.Message)"
}

if ($CleanGenerated) {
  Step 'Clean generated reports and runtime scratch files'
  Remove-IfExists $RenderBridgeReports
  Remove-IfExists $ReportsRoot
  Remove-IfExists $RuntimeRoot
  New-Item -ItemType Directory -Force -Path $ReportsRoot, $RuntimeRoot | Out-Null
}

Step 'Workspace cleanliness check'
$remaining = @()
if (Test-Path $OldOmniWindows) { $remaining += $OldOmniWindows }
try {
  $WorkspaceWsl = ToWslPath $WorkspaceRoot
  $checkScript = @"
if [ -d "`$HOME/OmniParser" ]; then echo "`$HOME/OmniParser"; fi
"@
  $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($checkScript -replace "`r", '')))
  $wslRemaining = wsl.exe bash -lc "printf '%s' '$encoded' | base64 -d | bash"
  foreach ($line in $wslRemaining) { if (-not [string]::IsNullOrWhiteSpace($line)) { $remaining += $line.Trim() } }
} catch {}

if ($remaining.Count) {
  Warn 'Workspace is not fully clean yet. Remaining scattered paths:'
  foreach ($item in $remaining) { Warn "- $item" }
  if (-not $RemoveScattered) { Warn 'Run again with -RemoveScattered to remove scattered folders.' }
} else {
  Write-Host 'Workspace scattered-engine check: CLEAN' -ForegroundColor Green
}

Step 'Done'
Info 'Clean workspace policy:'
Info '- All TranslateIT work files stay under DevelopingData\FigmaDesignExport.'
Info '- External engine clone goes to _external\OmniParser.'
Info '- Runtime scratch files go to _runtime.'
Info '- Report exports go to _reports or RenderBridge\reports.'
