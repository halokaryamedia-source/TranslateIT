param(
    [switch]$SkipTauriBuild,
    [switch]$SkipNpmInstall
)

$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppRoot = Resolve-Path (Join-Path $ScriptRoot "..")
$ReportPath = Join-Path $AppRoot "LOCAL_HARDENING_VALIDATION_RESULT.md"
$StartedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss K"
$Results = New-Object System.Collections.Generic.List[string]

function Add-Result {
    param(
        [string]$Name,
        [string]$Status,
        [string]$Detail
    )
    $Results.Add("| $Name | $Status | $Detail |") | Out-Null
}

function Run-Step {
    param(
        [string]$Name,
        [scriptblock]$Command
    )
    Write-Host "[TranslateIT validation] $Name" -ForegroundColor Cyan
    try {
        Push-Location $AppRoot
        & $Command
        Add-Result $Name "PASS" "Completed successfully."
    } catch {
        Add-Result $Name "FAIL" ($_.Exception.Message.Replace("`r", " ").Replace("`n", " "))
        throw
    } finally {
        Pop-Location
    }
}

try {
    if (-not $SkipNpmInstall) {
        Run-Step "npm install" { npm.cmd install }
    } else {
        Add-Result "npm install" "SKIP" "Skipped by -SkipNpmInstall."
    }

    Run-Step "security hardening validator" { npm.cmd run validate:security-hardening }
    Run-Step "dependency audit" { npm.cmd run audit:deps }
    Run-Step "TypeScript typecheck" { npm.cmd run typecheck }
    Run-Step "Rust cargo check" { npm.cmd run check:rust }
    Run-Step "frontend build" { npm.cmd run build:frontend }

    if (-not $SkipTauriBuild) {
        Run-Step "Tauri build" { npm.cmd run build }
    } else {
        Add-Result "Tauri build" "SKIP" "Skipped by -SkipTauriBuild."
    }

    $Overall = "PASS"
} catch {
    $Overall = "FAIL"
} finally {
    $FinishedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss K"
    $Body = @()
    $Body += "# TranslateIT Local Hardening Validation Result"
    $Body += ""
    $Body += "Started: $StartedAt"
    $Body += "Finished: $FinishedAt"
    $Body += "Overall: **$Overall**"
    $Body += ""
    $Body += "| Step | Status | Detail |"
    $Body += "|---|---:|---|"
    $Body += $Results
    $Body += ""
    $Body += "## Notes"
    $Body += ""
    $Body += "- Run from `EngineData/Frontend/RustApp` or execute this script directly."
    $Body += "- Do not mark production-ready unless dependency audit, typecheck, Rust check, frontend build, and Tauri build all pass."
    $Body += "- If `npm install` updates `package-lock.json`, commit that lockfile update with the validation result."
    Set-Content -Path $ReportPath -Value ($Body -join "`n") -Encoding UTF8
    Write-Host "[TranslateIT validation] report: $ReportPath"
}

if ($Overall -ne "PASS") {
    exit 1
}
