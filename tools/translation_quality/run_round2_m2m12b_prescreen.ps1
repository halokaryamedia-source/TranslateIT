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

Write-Host "[1/3] Verifying canonical Python/CUDA/BF16 runtime..."
& $CandidatePython -c "import sys, torch, transformers, sentencepiece; assert sys.version_info[:2] == (3,12); assert torch.cuda.is_available(); assert torch.cuda.is_bf16_supported(); assert int(transformers.__version__.split('.')[0]) == 4; print('Python', sys.version.split()[0], '| torch', torch.__version__, '| transformers', transformers.__version__, '| CUDA', torch.version.cuda, '| BF16', torch.cuda.is_bf16_supported())"
if ($LASTEXITCODE -ne 0) {
    throw "Canonical Python/CUDA/BF16 runtime is not ready for the rejection prescreen."
}

Write-Host "[2/3] Acquiring exact M2M100-1.2B candidate outside RuntimeAssets..."
$DownloadCode = @'
from huggingface_hub import snapshot_download
import sys

snapshot_download(
    repo_id="facebook/m2m100_1.2B",
    revision="7b36184180524c1a1bbfa37f120a608046250b98",
    local_dir=sys.argv[1],
    allow_patterns=[
        "README.md",
        "config.json",
        "generation_config.json",
        "pytorch_model.bin",
        "sentencepiece.bpe.model",
        "special_tokens_map.json",
        "tokenizer_config.json",
        "vocab.json",
    ],
)
'@
& $Phase2Python -c $DownloadCode $ModelDir
if ($LASTEXITCODE -ne 0) {
    throw "M2M100-1.2B acquisition failed. Production was not modified."
}

$Weights = Join-Path $ModelDir "pytorch_model.bin"
if (-not (Test-Path $Weights)) {
    throw "M2M100-1.2B weights are missing after acquisition."
}
$ExpectedSha = "a58ef8f42362ef12adeddc600b3425f1e2bbd019cfa6aae6b0051e2e3e055cd4"
$ObservedSha = (Get-FileHash -Algorithm SHA256 $Weights).Hash.ToLowerInvariant()
if ($ObservedSha -ne $ExpectedSha) {
    throw "M2M100-1.2B weights SHA256 mismatch. Expected $ExpectedSha but got $ObservedSha."
}

Write-Host "[3/3] Running ONLY the 32-direction kill-fast semantic prescreen..."
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
    throw "Round 2 M2M100-1.2B prescreen harness failed. Production was not modified."
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
