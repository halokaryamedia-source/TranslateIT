$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $RepoRoot

$Branch = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $Branch -ne "Local") {
    throw "Round 2 prescreen must run from the TranslateIT Local branch. Current branch: '$Branch'"
}

$Round2Root = Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\Round2"
$ModelDir = Join-Path $Round2Root "small100_model"
$ReportPath = Join-Path $Round2Root "small100_prescreen_report.json"
$Runner = Join-Path $RepoRoot "tools\translation_quality\round2_small100_prescreen.py"
New-Item -ItemType Directory -Path $Round2Root -Force | Out-Null

$Phase2Python = Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\Phase2\.venv\Scripts\python.exe"
if (-not (Test-Path $Phase2Python)) {
    throw "The already-proven Phase 2 evaluation environment is missing. Do not create another runtime automatically."
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

Write-Host "[1/3] Verifying the existing canonical Python/CUDA runtime..."
& $CandidatePython -c "import sys, torch, transformers, sentencepiece; assert sys.version_info[:2] == (3,12); assert torch.cuda.is_available(); assert int(transformers.__version__.split('.')[0]) == 4; print('Python', sys.version.split()[0], '| torch', torch.__version__, '| transformers', transformers.__version__, '| CUDA', torch.version.cuda)"
if ($LASTEXITCODE -ne 0) {
    throw "Canonical Python/CUDA runtime is not ready for the rejection prescreen."
}

Write-Host "[2/3] Acquiring the exact SMaLL-100 evaluation candidate (one-time, outside RuntimeAssets)..."
$DownloadCode = @'
from huggingface_hub import snapshot_download
import sys

repo_id = "alirezamsh/small100"
revision = "8ab680e26a596d2e3d2d2d17ae0f68df1037328c"
local_dir = sys.argv[1]
snapshot_download(
    repo_id=repo_id,
    revision=revision,
    local_dir=local_dir,
    allow_patterns=[
        "README.md",
        "config.json",
        "model.safetensors",
        "sentencepiece.bpe.model",
        "special_tokens_map.json",
        "tokenization_small100.py",
        "tokenizer_config.json",
        "vocab.json",
    ],
)
'@
& $Phase2Python -c $DownloadCode $ModelDir
if ($LASTEXITCODE -ne 0) {
    throw "SMaLL-100 acquisition failed. Production was not modified."
}

$Weights = Join-Path $ModelDir "model.safetensors"
if (-not (Test-Path $Weights)) {
    throw "SMaLL-100 safetensors weights are missing after acquisition."
}
$ExpectedSha = "dd3b845a36ea4ed90437fd0b9b477e30c21f144d3658679fd5c945e3c96b0fbc"
$ObservedSha = (Get-FileHash -Algorithm SHA256 $Weights).Hash.ToLowerInvariant()
if ($ObservedSha -ne $ExpectedSha) {
    throw "SMaLL-100 weights SHA256 mismatch. Expected $ExpectedSha but got $ObservedSha."
}

Write-Host "[3/3] Running ONLY the 32-case kill-fast semantic prescreen..."
Write-Host "      No FLORES sweep, repeated latency benchmark, M2M100-1.2B download, or production change will run."
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
    throw "Round 2 SMaLL-100 prescreen harness failed. Production was not modified."
}

$Report = Get-Content $ReportPath -Raw | ConvertFrom-Json
Write-Host ""
if ($Report.prescreen_state -eq "REJECTED_AUTOMATIC") {
    Write-Host "SMaLL-100 was rejected by automatic hard prescreen diagnostics."
    Write-Host ("Report: {0}" -f $ReportPath)
    Write-Host "STOP. Do not download M2M100-1.2B or run the full benchmark yet; return this report for review."
    exit 0
}
if ($Report.prescreen_state -eq "AWAITING_MANUAL_SEMANTIC_REVIEW") {
    Write-Host "SMaLL-100 completed the automatic semantic prescreen."
    Write-Host ("Report: {0}" -f $ReportPath)
    Write-Host ("Semantic review pack: {0}" -f $Report.semantic_review_pack)
    Write-Host "STOP. Return the report for manual semantic review before any further model work."
    exit 0
}

throw "Unexpected Round 2 prescreen state: $($Report.prescreen_state)"
