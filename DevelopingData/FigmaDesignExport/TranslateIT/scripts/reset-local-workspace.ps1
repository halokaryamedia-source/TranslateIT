param(
  [string]$WorkspaceRoot,
  [switch]$RemoveScattered
)

$ErrorActionPreference = 'Stop'

function Step($Text) {
  Write-Host "`n==> $Text" -ForegroundColor Cyan
}

function Info($Text) {
  Write-Host $Text -ForegroundColor Gray
}

function Warn($Text) {
  Write-Host $Text -ForegroundColor Yellow
}

function ToWslPath($WindowsPath) {
  $resolved = [System.IO.Path]::GetFullPath($WindowsPath)
  $escaped = $resolved -replace '\\', '\\'
  $result = wsl.exe wslpath -a "$escaped"
  return ($result | Select-Object -First 1).Trim()
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TranslateItRoot = Resolve-Path (Join-Path $ScriptDir '..')
if (-not $WorkspaceRoot) {
  $WorkspaceRoot = Resolve-Path (Join-Path $TranslateItRoot '..')
}
$WorkspaceRoot = [System.IO.Path]::GetFullPath($WorkspaceRoot)
$TranslateItRoot = [System.IO.Path]::GetFullPath($TranslateItRoot)

$ExternalRoot = Join-Path $WorkspaceRoot '_external'
$RuntimeRoot = Join-Path $WorkspaceRoot '_runtime'
$ReportsRoot = Join-Path $WorkspaceRoot '_reports'
$OmniTarget = Join-Path $ExternalRoot 'OmniParser'
$OldOmniWindows = 'D:\Tools\OmniParser'

Step 'Workspace target'
Info "WorkspaceRoot : $WorkspaceRoot"
Info "TranslateIT    : $TranslateItRoot"
Info "ExternalRoot   : $ExternalRoot"
Info "RuntimeRoot    : $RuntimeRoot"
Info "ReportsRoot    : $ReportsRoot"

Step 'Create clean workspace folders'
New-Item -ItemType Directory -Force -Path $ExternalRoot, $RuntimeRoot, $ReportsRoot | Out-Null

Step 'Move Windows OmniParser folder into workspace when possible'
if ((Test-Path $OldOmniWindows) -and -not (Test-Path $OmniTarget)) {
  New-Item -ItemType Directory -Force -Path $ExternalRoot | Out-Null
  Move-Item -Path $OldOmniWindows -Destination $OmniTarget
  Info "Moved $OldOmniWindows -> $OmniTarget"
} elseif (Test-Path $OmniTarget) {
  Info "OmniParser already exists in workspace: $OmniTarget"
  if ((Test-Path $OldOmniWindows) -and $RemoveScattered) {
    Remove-Item -Recurse -Force $OldOmniWindows
    Info "Removed scattered folder: $OldOmniWindows"
  } elseif (Test-Path $OldOmniWindows) {
    Warn "Scattered folder still exists: $OldOmniWindows. Re-run with -RemoveScattered to delete it after verifying workspace copy."
  }
} else {
  Warn "No Windows OmniParser folder found yet. start-omni-wsl.ps1 will clone into workspace when needed."
}

Step 'Check WSL project path'
try {
  $WorkspaceWsl = ToWslPath $WorkspaceRoot
  Info "WSL workspace : $WorkspaceWsl"
  if ($RemoveScattered) {
    $cleanScript = @"
set -e
TARGET='$WorkspaceWsl/_external/OmniParser'
if [ -d "`$HOME/OmniParser" ] && [ -d "`$TARGET" ]; then
  rm -rf "`$HOME/OmniParser"
  echo "Removed scattered WSL OmniParser clone: `$HOME/OmniParser"
fi
"@
    $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($cleanScript -replace "`r", '')))
    wsl.exe bash -lc "printf '%s' '$encoded' | base64 -d | bash"
  } else {
    Warn 'WSL scattered clone cleanup not executed. Use -RemoveScattered after verifying workspace copy.'
  }
} catch {
  Warn "WSL check skipped: $($_.Exception.Message)"
}

Step 'Done'
Info 'Clean workspace policy:'
Info '- All TranslateIT work files stay under DevelopingData\FigmaDesignExport.'
Info '- External engine clone goes to _external\OmniParser.'
Info '- Runtime reports go to _reports or RenderBridge\reports.'
Info '- Old scattered folders are only removed when -RemoveScattered is used.'
