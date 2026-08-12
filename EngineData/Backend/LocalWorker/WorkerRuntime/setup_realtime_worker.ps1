$ErrorActionPreference = "Stop"

$WorkerRoot = $PSScriptRoot
$ProjectFile = Join-Path $WorkerRoot "pyproject.toml"
$LockFile = Join-Path $WorkerRoot "uv.lock"
$PythonVersionFile = Join-Path $WorkerRoot ".python-version"
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
    throw "Missing canonical WorkerRuntime uv.lock: $LockFile. Restore the repository lock instead of resolving an unreviewed environment locally."
}
if (-not (Test-Path $PythonVersionFile)) {
    throw "Missing canonical WorkerRuntime Python pin: $PythonVersionFile."
}
$PinnedPython = (Get-Content $PythonVersionFile -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($PinnedPython)) {
    throw "WorkerRuntime Python pin is empty."
}
Write-Host "Pinned developer Python: $PinnedPython"

Push-Location $WorkerRoot
try {
    Write-Host "Synchronizing canonical WorkerRuntime environment"
    uv sync --frozen --no-dev
    if ($LASTEXITCODE -ne 0) {
        throw "uv sync failed."
    }

    $ResolvedPython = (uv run --frozen --no-dev python -c "import platform; print(platform.python_version())").Trim()
    if ($LASTEXITCODE -ne 0 -or $ResolvedPython -ne $PinnedPython) {
        throw "WorkerRuntime Python mismatch. Expected $PinnedPython, got $ResolvedPython."
    }

    Write-Host "Checking worker dependency/model capability status"
    '{"command":"status"}' | uv run --frozen --no-dev python $Worker
    if ($LASTEXITCODE -ne 0) {
        throw "Worker status command failed."
    }
}
finally {
    Pop-Location
}

Write-Host "WorkerRuntime developer setup completed. This is environment setup only; model quality, CUDA behavior, and product readiness require separate proof."
