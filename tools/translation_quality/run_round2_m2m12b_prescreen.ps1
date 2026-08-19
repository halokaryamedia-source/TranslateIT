$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $RepoRoot

$Branch = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $Branch -ne "Local") {
    throw "Round 2 prescreen must run from the TranslateIT Local branch. Current branch: '$Branch'"
}

$Round2Root = Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\Round2"
$ModelDir = Join-Path $Round2Root "m2m100_1_2b_model"
$ReportPath = Join-Path $Round2Root "m2m12b_prescreen_report.json"
$Runner = Join-Path $RepoRoot "tools\translation_quality\round2_m2m12b_prescreen.py"
New-Item -ItemType Directory -Path $Round2Root -Force | Out-Null

$Phase2Python = Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\Phase2\.venv\Scripts\python.exe"
if (-not (Test-Path $Phase2Python)) {
    throw "The existing Phase 2 evaluation environment is missing. Do not create another evaluation environment automatically."
}

$CandidatePython = $null
if ($env:TRANSLATEIT_WORKER_PYTHON -and (Test-Path $env:TRANSLATEIT_WORKER_PYTHON)) {
    $CandidatePython = (Resolve-Path $env:TRANSLATEIT_WORKER_PYTHON).Path
}
if (-not $CandidatePython) {
    $Candidate = Join-Path $RepoRoot "EngineData\Backend\LocalWorker\WorkerRuntime\.venv\Scripts\python.exe"
    if (Test-Path $Candidate) {
        $CandidatePython = (Resolve-Path $Candidate).Path
    }
}
if (-not $CandidatePython) {
    $Candidate = Join-Path $RepoRoot "EngineData\Backend\LocalWorker\PythonRuntime\python.exe"
    if (Test-Path $Candidate) {
        $CandidatePython = (Resolve-Path $Candidate).Path
    }
}
if (-not $CandidatePython) {
    throw "Canonical WorkerRuntime Python was not found. Do not build a replacement candidate environment."
}

$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"

Write-Host "[1/2] Verifying canonical Python/CUDA/BF16 runtime..."
& $CandidatePython -c "import sys, torch, transformers, sentencepiece; assert sys.version_info[:2] == (3,12); assert torch.cuda.is_available(); assert torch.cuda.is_bf16_supported(); assert int(transformers.__version__.split('.')[0]) == 4; print('Python', sys.version.split()[0], '| torch', torch.__version__, '| transformers', transformers.__version__, '| CUDA', torch.version.cuda, '| BF16', torch.cuda.is_bf16_supported())"
if ($LASTEXITCODE -ne 0) {
    throw "Canonical Python/CUDA/BF16 runtime is not ready for the rejection prescreen."
}

Write-Host "[2/2] Acquiring/verifying M2M100-1.2B, then running ONLY the 32-direction semantic prescreen..."
Write-Host "      Acquisition is handled inside the Python prescreen owner to avoid PowerShell/native quoting drift."
Write-Host "      Runtime: CUDA BF16, beam 5, deterministic generation."
Write-Host "      No FLORES sweep, repeated benchmark, MADLAD download, or production change will run."
& $Phase2Python $Runner `
    --repo-root $RepoRoot `
    --round2-root $Round2Root `
    --candidate-python $CandidatePython `
    --model-dir $ModelDir

if ($LASTEXITCODE -ne 0) {
    if (Test-Path $ReportPath) {
        try {
            $Report = Get-Content $ReportPath -Raw | ConvertFrom-Json
            if ($null -ne $Report.error) {
                Write-Host ""
                Write-Host "=== ROUND 2 ROOT CAUSE ==="
                Write-Host ("Type: {0}" -f $Report.error.type)
                Write-Host ("Message: {0}" -f $Report.error.message)
            }
        } catch {
            Write-Host "Could not parse the Round 2 report. Report: $ReportPath"
        }
    }
    throw "Round 2 M2M100-1.2B prescreen did not complete. Production was not modified."
}

$Report = Get-Content $ReportPath -Raw | ConvertFrom-Json
Write-Host ""
if ($Report.prescreen_state -eq "REJECTED_AUTOMATIC") {
    Write-Host "M2M100-1.2B was rejected by automatic hard prescreen diagnostics."
    Write-Host ("Report: {0}" -f $ReportPath)
    Write-Host "STOP. Do not run MADLAD or the full benchmark; return this report for review."
    exit 0
}
if ($Report.prescreen_state -eq "AWAITING_MANUAL_SEMANTIC_REVIEW") {
    Write-Host "M2M100-1.2B completed the automatic semantic prescreen."
    Write-Host ("Report: {0}" -f $ReportPath)
    Write-Host ("Semantic review pack: {0}" -f $Report.semantic_review_pack)
    Write-Host "STOP. Return the report for manual semantic review before any further model work."
    exit 0
}

throw "Unexpected Round 2 prescreen state: $($Report.prescreen_state)"
