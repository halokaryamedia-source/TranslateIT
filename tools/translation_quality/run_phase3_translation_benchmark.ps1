$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $RepoRoot

$Branch = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $Branch -ne "Local") {
    throw "Phase 3 must run from the TranslateIT Local branch. Current branch: '$Branch'"
}

$Phase2Root = Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\Phase2"
$Phase3Root = Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\Phase3"
$Phase2Report = Join-Path $Phase2Root "phase2_lmt_compatibility_report.json"
$Runner = Join-Path $RepoRoot "tools\translation_quality\phase3_translation_benchmark.py"
$Summary = Join-Path $Phase3Root "phase3_automatic_comparison.json"
New-Item -ItemType Directory -Path $Phase3Root -Force | Out-Null

if (-not (Test-Path $Phase2Report)) {
    throw "Phase 2 PASS report is missing. Run/review Phase 2 before Phase 3."
}
$Phase2 = Get-Content $Phase2Report -Raw | ConvertFrom-Json
if (-not $Phase2.ok) {
    throw "Phase 2 report is not PASS. Phase 3 is blocked."
}

$BaselinePython = $null
if ($env:TRANSLATEIT_WORKER_PYTHON -and (Test-Path $env:TRANSLATEIT_WORKER_PYTHON)) {
    $BaselinePython = (Resolve-Path $env:TRANSLATEIT_WORKER_PYTHON).Path
}
if (-not $BaselinePython) {
    $Candidate = Join-Path $RepoRoot "EngineData\Backend\LocalWorker\WorkerRuntime\.venv\Scripts\python.exe"
    if (Test-Path $Candidate) {
        $BaselinePython = (Resolve-Path $Candidate).Path
    }
}
if (-not $BaselinePython) {
    $Candidate = Join-Path $RepoRoot "EngineData\Backend\LocalWorker\PythonRuntime\python.exe"
    if (Test-Path $Candidate) {
        $BaselinePython = (Resolve-Path $Candidate).Path
    }
}
if (-not $BaselinePython) {
    throw "Current canonical M2M WorkerRuntime Python was not found. Do not build a replacement baseline environment; return this blocker for review."
}

$LmtPython = Join-Path $Phase2Root ".venv\Scripts\python.exe"
if (-not (Test-Path $LmtPython)) {
    throw "Phase 2 LMT isolated Python environment is missing."
}

$MetricsVenv = Join-Path $Phase3Root ".metrics-venv"
$MetricsPython = Join-Path $MetricsVenv "Scripts\python.exe"
$MetricsStamp = Join-Path $MetricsVenv ".translateit-phase3-metrics-v1"

if (-not (Test-Path $MetricsPython)) {
    $Py = Get-Command py -ErrorAction SilentlyContinue
    if ($null -ne $Py) {
        & py -3.12 -m venv $MetricsVenv
    } else {
        & $LmtPython -m venv $MetricsVenv
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create Phase 3 metrics environment."
    }
}

if (-not (Test-Path $MetricsStamp)) {
    Write-Host "[1/3] Installing SacreBLEU 2.6.0 in the evaluation-only metrics environment..."
    & $MetricsPython -m pip install --disable-pip-version-check "sacrebleu==2.6.0"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install SacreBLEU 2.6.0."
    }
    & $MetricsPython -c "import sacrebleu; assert sacrebleu.__version__ == '2.6.0'"
    if ($LASTEXITCODE -ne 0) {
        throw "SacreBLEU version verification failed."
    }
    New-Item -ItemType File -Path $MetricsStamp -Force | Out-Null
} else {
    Write-Host "[1/3] Reusing verified Phase 3 metrics environment."
}

# Evaluation-only transport contract. The canonical Windows worker can otherwise
# encode redirected stdout with the active Windows code page while the benchmark
# correctly expects UTF-8 JSON. This changes only subprocess I/O encoding, not
# translation/model/runtime behavior.
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"

Write-Host "[2/3] Running current M2M100 baseline, then terminating it before LMT..."
Write-Host "       This benchmark is intentionally long. Do not start a second TranslateIT AI worker while it runs."
Write-Host "[3/3] LMT will run only after M2M100 has exited; automatic metrics follow afterward."

& $MetricsPython $Runner `
    --repo-root $RepoRoot `
    --phase2-root $Phase2Root `
    --phase3-root $Phase3Root `
    --baseline-python $BaselinePython `
    --lmt-python $LmtPython

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Phase 3 stopped."
    if (Test-Path $Summary) {
        try {
            $Result = Get-Content $Summary -Raw | ConvertFrom-Json
            if ($null -ne $Result.error) {
                Write-Host "=== PHASE 3 ROOT CAUSE ==="
                Write-Host ("Type: {0}" -f $Result.error.type)
                Write-Host ("Message: {0}" -f $Result.error.message)
                Write-Host ""
            }
        } catch {
            Write-Host "Could not parse the Phase 3 summary."
        }
        Write-Host ("Review: {0}" -f $Summary)
    }
    throw "Phase 3 automatic benchmark did not complete. Production was not modified."
}

Write-Host ""
Write-Host "Phase 3 automatic benchmark completed."
Write-Host ("Summary: {0}" -f $Summary)
Write-Host ("M2M results: {0}" -f (Join-Path $Phase3Root "phase3_m2m100_results.json"))
Write-Host ("LMT results: {0}" -f (Join-Path $Phase3Root "phase3_lmt_results.json"))
Write-Host ("Semantic review pack: {0}" -f (Join-Path $Phase3Root "phase3_semantic_review_pack.jsonl"))
Write-Host ""
Write-Host "STOP here. Do not migrate the production translator yet; return the Phase 3 summary for semantic review."
