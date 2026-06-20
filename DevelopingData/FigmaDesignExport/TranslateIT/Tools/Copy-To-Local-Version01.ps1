#requires -Version 5.1
<#
TranslateIT - One Click Local Copy

Copies the Figma Design Export workflow files from this repo into the local TranslateIT Rust development folder.

Default target:
D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1

Recommended use:
1. Pull latest V1 branch.
2. Right-click this script.
3. Run with PowerShell.

Optional:
- Dry run only:
  powershell -ExecutionPolicy Bypass -File .\Copy-To-Local-Version01.ps1 -DryRun

- Skip backup:
  powershell -ExecutionPolicy Bypass -File .\Copy-To-Local-Version01.ps1 -NoBackup
#>

param(
  [string]$TargetRoot = "D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1",
  [switch]$DryRun,
  [switch]$NoBackup
)

$ErrorActionPreference = "Stop"

function Write-Title($Text) {
  Write-Host ""
  Write-Host "============================================================" -ForegroundColor DarkGray
  Write-Host $Text -ForegroundColor Cyan
  Write-Host "============================================================" -ForegroundColor DarkGray
}

function Write-Step($Text) {
  Write-Host "[TranslateIT] $Text" -ForegroundColor Green
}

function Write-Warn($Text) {
  Write-Host "[Warning] $Text" -ForegroundColor Yellow
}

function Write-Fail($Text) {
  Write-Host "[Error] $Text" -ForegroundColor Red
}

function Resolve-RepoRoot {
  $current = Split-Path -Parent $PSCommandPath

  try {
    $gitRoot = git -C $current rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -eq 0 -and $gitRoot) {
      return (Resolve-Path $gitRoot).Path
    }
  } catch {
    # Git might not be available. Fall back to manual search.
  }

  while ($current) {
    if (Test-Path (Join-Path $current ".git")) {
      return $current
    }

    $parent = Split-Path -Parent $current
    if ($parent -eq $current) { break }
    $current = $parent
  }

  throw "Cannot resolve repo root. Run this script from inside the TranslateIT repository."
}

function Copy-DirectorySafe($Source, $Destination) {
  if (!(Test-Path $Source)) {
    Write-Warn "Source missing, skipped: $Source"
    return
  }

  if ($DryRun) {
    Write-Host "[DryRun] Copy directory:" -ForegroundColor DarkCyan
    Write-Host "  From: $Source"
    Write-Host "  To:   $Destination"
    return
  }

  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  robocopy $Source $Destination /MIR /R:2 /W:1 /NFL /NDL /NP /NJH /NJS | Out-Null
  $code = $LASTEXITCODE

  if ($code -gt 7) {
    throw "Robocopy failed with exit code $code while copying $Source"
  }
}

function Copy-FileSafe($Source, $Destination) {
  if (!(Test-Path $Source)) {
    Write-Warn "Source missing, skipped: $Source"
    return
  }

  if ($DryRun) {
    Write-Host "[DryRun] Copy file:" -ForegroundColor DarkCyan
    Write-Host "  From: $Source"
    Write-Host "  To:   $Destination"
    return
  }

  $parent = Split-Path -Parent $Destination
  New-Item -ItemType Directory -Force -Path $parent | Out-Null
  Copy-Item -Force $Source $Destination
}

Write-Title "TranslateIT One Click Copy to Local Version 0.1"

$RepoRoot = Resolve-RepoRoot
Write-Step "Repo root: $RepoRoot"
Write-Step "Target root: $TargetRoot"

if (!(Test-Path $TargetRoot)) {
  if ($DryRun) {
    Write-Warn "Target folder does not exist yet. DryRun will not create it."
  } else {
    Write-Step "Creating target folder..."
    New-Item -ItemType Directory -Force -Path $TargetRoot | Out-Null
  }
}

$SourceFigmaExport = Join-Path $RepoRoot "DevelopingData\FigmaDesignExport\TranslateIT"
$TargetFigmaExport = Join-Path $TargetRoot "DevelopingData\FigmaDesignExport\TranslateIT"

$BackupRoot = Join-Path $TargetRoot "_backup_before_figma_export_copy"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupPath = Join-Path $BackupRoot $Stamp

if (!$NoBackup -and (Test-Path $TargetFigmaExport)) {
  if ($DryRun) {
    Write-Host "[DryRun] Backup existing target:" -ForegroundColor DarkCyan
    Write-Host "  From: $TargetFigmaExport"
    Write-Host "  To:   $BackupPath"
  } else {
    Write-Step "Backing up existing Figma export folder..."
    New-Item -ItemType Directory -Force -Path $BackupPath | Out-Null
    robocopy $TargetFigmaExport $BackupPath /MIR /R:2 /W:1 /NFL /NDL /NP /NJH /NJS | Out-Null
    if ($LASTEXITCODE -gt 7) {
      throw "Backup failed with robocopy exit code $LASTEXITCODE"
    }
  }
} elseif ($NoBackup) {
  Write-Warn "Backup skipped because -NoBackup was used."
}

Write-Step "Copying Figma Design Export workflow..."
Copy-DirectorySafe $SourceFigmaExport $TargetFigmaExport

$RootDocs = @(
  "README.md",
  "package.json",
  "bun.lockb",
  "pnpm-lock.yaml"
)

foreach ($relative in $RootDocs) {
  $source = Join-Path $RepoRoot $relative
  $destination = Join-Path $TargetRoot $relative
  if (Test-Path $source) {
    Copy-FileSafe $source $destination
  }
}

$LocalReadme = Join-Path $TargetFigmaExport "LOCAL_COPY_STATUS.md"
$StatusText = @"
# Local Copy Status

Copied from repo root:

```txt
$RepoRoot
```

Copied to local target:

```txt
$TargetRoot
```

Copied at:

```txt
$(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
```

Main copied folder:

```txt
DevelopingData/FigmaDesignExport/TranslateIT
```

Recommended local commands:

```powershell
cd "$TargetFigmaExport\BuildPackage"
node .\tools\validate-single-html-package.mjs ..\Samples\single-html-ready-sample.html
```

If you export a Figma UI Build Package later:

```powershell
node .\tools\validate-ui-build-package.mjs .\ui-build-package.json
node .\tools\check-component-contract.mjs .\ui-build-package.json
node .\tools\check-roundtrip-risk.mjs .\ui-build-package.json
node .\tools\create-ui-package-snapshot.mjs .\ui-build-package.json .\Snapshots
node .\tools\run-ui-sync-gate.mjs .\ui-build-package.json
node .\tools\build-ui-package-to-frontend.mjs .\ui-build-package.json .\GeneratedFrontend
```
"@

if ($DryRun) {
  Write-Host "[DryRun] Write status file: $LocalReadme" -ForegroundColor DarkCyan
} else {
  $StatusText | Set-Content -Encoding UTF8 $LocalReadme
}

Write-Title "Copy Complete"

if ($DryRun) {
  Write-Warn "DryRun only. No files were copied."
} else {
  Write-Step "Copied to: $TargetFigmaExport"
  if (!$NoBackup -and (Test-Path $BackupPath)) {
    Write-Step "Backup created: $BackupPath"
  }
  Write-Step "Status file: $LocalReadme"
}

Write-Host ""
Write-Host "Press Enter to close..." -ForegroundColor DarkGray
[void][System.Console]::ReadLine()
