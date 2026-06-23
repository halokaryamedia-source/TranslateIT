param(
  [string]$WorkspaceRoot
)

$ErrorActionPreference = 'Stop'

function Step($Text) { Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Fail($Text) { Write-Host $Text -ForegroundColor Red }
function Pass($Text) { Write-Host $Text -ForegroundColor Green }
function Info($Text) { Write-Host $Text -ForegroundColor Gray }

function ToWslPath($WindowsPath) {
  $resolved = [System.IO.Path]::GetFullPath($WindowsPath)
  $result = wsl.exe wslpath -a "$resolved"
  return ($result | Select-Object -First 1).Trim()
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TranslateItRoot = Resolve-Path (Join-Path $ScriptDir '..')
if (-not $WorkspaceRoot) { $WorkspaceRoot = Resolve-Path (Join-Path $TranslateItRoot '..') }
$WorkspaceRoot = [System.IO.Path]::GetFullPath($WorkspaceRoot)
$TranslateItRoot = [System.IO.Path]::GetFullPath($TranslateItRoot)
$RenderBridge = Join-Path $TranslateItRoot 'RenderBridge'

$failures = New-Object System.Collections.Generic.List[string]

Step 'Audit target'
Info "WorkspaceRoot : $WorkspaceRoot"
Info "TranslateIT    : $TranslateItRoot"

Step 'Required active paths'
foreach ($path in @(
  (Join-Path $TranslateItRoot 'plugin\manifest.json'),
  (Join-Path $TranslateItRoot 'RenderBridge\server.mjs'),
  (Join-Path $TranslateItRoot 'scripts\start-dev.ps1'),
  (Join-Path $TranslateItRoot 'scripts\start-omni-wsl.ps1'),
  (Join-Path $TranslateItRoot 'scripts\reset-local-workspace.ps1')
)) {
  if (Test-Path $path) { Pass "OK $path" } else { $failures.Add("Missing active file: $path") | Out-Null; Fail "MISSING $path" }
}

Step 'Forbidden tracked/local paths'
$forbidden = @(
  (Join-Path $TranslateItRoot 'plugin\manifest.production.json'),
  (Join-Path $RenderBridge 'run-one-command-final-test.ps1'),
  (Join-Path $RenderBridge 'run-final-production-proof.ps1'),
  (Join-Path $RenderBridge 'run-complete-readiness.ps1'),
  (Join-Path $RenderBridge 'run-full-engine-prep.ps1'),
  (Join-Path $RenderBridge 'run-master-summary.ps1'),
  (Join-Path $RenderBridge 'run-quality-summary.ps1'),
  (Join-Path $RenderBridge 'run-final-gates.ps1'),
  (Join-Path $RenderBridge 'run-controlled-readiness.ps1'),
  (Join-Path $RenderBridge 'src\write-final-payload-report-v2.mjs'),
  'D:\Tools\OmniParser'
)
foreach ($path in $forbidden) {
  if (Test-Path $path) { $failures.Add("Forbidden path still exists: $path") | Out-Null; Fail "EXISTS $path" } else { Pass "Absent $path" }
}

Step 'Forbidden wording in docs and scripts'
$terms = @('legacy', 'manifest.production', 'final-payload-v2', 'proof:production', 'D:\Tools\OmniParser')
$scanRoots = @($TranslateItRoot)
$extensions = @('.md', '.ps1', '.json', '.mjs', '.js')
foreach ($root in $scanRoots) {
  Get-ChildItem -Path $root -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $extensions -contains $_.Extension -and $_.FullName -notmatch '\\node_modules\\|\\reports\\' } |
    ForEach-Object {
      $file = $_.FullName
      $text = Get-Content -Raw -ErrorAction SilentlyContinue $file
      foreach ($term in $terms) {
        if ($text -match [Regex]::Escape($term)) {
          $failures.Add("Forbidden term '$term' found in $file") | Out-Null
          Fail "TERM $term -> $file"
        }
      }
    }
}

Step 'WSL scattered folder check'
try {
  $WorkspaceWsl = ToWslPath $WorkspaceRoot
  $checkScript = @"
set -e
if [ -d "`$HOME/OmniParser" ]; then echo "`$HOME/OmniParser"; fi
"@
  $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($checkScript -replace "`r", '')))
  $items = wsl.exe bash -lc "printf '%s' '$encoded' | base64 -d | bash"
  foreach ($item in $items) {
    if (-not [string]::IsNullOrWhiteSpace($item)) {
      $failures.Add("Forbidden WSL scattered folder still exists: $item") | Out-Null
      Fail "EXISTS $item"
    }
  }
  if (-not $items) { Pass 'No scattered WSL OmniParser folder detected.' }
} catch {
  Info "WSL check skipped: $($_.Exception.Message)"
}

Step 'Result'
if ($failures.Count) {
  Fail "NOT CLEAN: $($failures.Count) issue(s) found."
  foreach ($failure in $failures) { Fail "- $failure" }
  exit 1
}

Pass 'CLEAN: workspace, docs, and removed engine paths passed the audit.'
