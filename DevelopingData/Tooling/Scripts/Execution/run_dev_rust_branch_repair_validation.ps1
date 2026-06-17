param(
    [switch]$Full,
    [switch]$SkipWorkerSmoke
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../../../")).Path
$RustApp = Join-Path $RepoRoot "EngineData/LauncherApp/RustApp"
$Worker = Join-Path $RepoRoot "EngineData/Backend/LocalWorker/WorkerRuntime"
$StatusReport = Join-Path $RepoRoot "DevelopingData/Reports/Engineering/BRANCH_REPAIR_DEV_RUST_STATUS.md"

Write-Host "TranslateIT Dev-Rust Branch Repair Validation"
Write-Host "Repo root: $RepoRoot"
Write-Host "RustApp: $RustApp"
Write-Host "WorkerRuntime: $Worker"

if (-not (Test-Path $RustApp)) {
    throw "RustApp path not found: $RustApp"
}

if (-not (Test-Path $Worker)) {
    throw "WorkerRuntime path not found: $Worker"
}

Push-Location $RustApp
try {
    Write-Host "Running npm install dependency check..."
    npm install

    Write-Host "Running internal validation..."
    npm run validate:internal

    if ($Full) {
        Write-Host "Running full validation..."
        npm run validate:full
    }

    if (-not $SkipWorkerSmoke) {
        Write-Host "Running worker smoke test..."
        npm run smoke:worker
    }
}
finally {
    Pop-Location
}

Write-Host "Validation completed. Update this report manually with local results:"
Write-Host $StatusReport
