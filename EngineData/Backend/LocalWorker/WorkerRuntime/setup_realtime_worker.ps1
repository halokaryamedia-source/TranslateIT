$ErrorActionPreference = "Stop"

$WorkerRoot = $PSScriptRoot
$ProjectFile = Join-Path $WorkerRoot "pyproject.toml"
$LockFile = Join-Path $WorkerRoot "uv.lock"
$Worker = Join-Path $WorkerRoot "realtime_local_worker.py"
$Uv = Get-Command uv -ErrorAction SilentlyContinue

Write-Host "TranslateIT WorkerRuntime developer setup"
Write-Host "WorkerRoot: $WorkerRoot"

if (-not (Test-Path $ProjectFile)) {
    throw "Missing canonical Python project: $ProjectFile"
}
if (-not (Test-Path $Worker)) {
    throw "Missing local worker script: $Worker"
}
if ($null -eq $Uv) {
    throw "uv is required for WorkerRuntime developer environment setup. Install uv, then rerun this script. End users must not depend on uv."
}

if (-not (Test-Path $LockFile)) {
    Write-Warning "uv.lock is not committed yet. This run will resolve pyproject.toml locally. Treat the resulting lock as LOCAL PROOF REQUIRED and do not claim reproducibility until that lock has been reviewed and committed."
}

Push-Location $WorkerRoot
try {
    Write-Host "Synchronizing canonical WorkerRuntime environment"
    uv sync --no-dev
    if ($LASTEXITCODE -ne 0) {
        throw "uv sync failed."
    }

    Write-Host "Checking worker dependency/model capability status"
    '{"command":"status"}' | uv run --no-dev python $Worker
    if ($LASTEXITCODE -ne 0) {
        throw "Worker status command failed."
    }
}
finally {
    Pop-Location
}

Write-Host "WorkerRuntime developer setup completed. This is environment setup only; model quality, CUDA behavior, and product readiness require separate proof."
