$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $RepoRoot

$Branch = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $Branch -ne "Local") {
    throw "MiLMMT realtime A/B must run from TranslateIT Local. Current branch: '$Branch'"
}

$BaselinePython = Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\Phase2\.venv\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $BaselinePython)) {
    throw "Existing evaluation bootstrap/baseline Python is missing: $BaselinePython"
}

$TranslateGemmaPython = Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\Round2\TranslateGemma\.venv\Scripts\python.exe"
$MiLMMTRoot = Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\MiLMMTRealtimeAB"
$MiLMMTVenv = Join-Path $MiLMMTRoot ".venv"
$MiLMMTPython = Join-Path $MiLMMTVenv "Scripts\python.exe"
New-Item -ItemType Directory -Path $MiLMMTRoot -Force | Out-Null

if (Test-Path -LiteralPath $TranslateGemmaPython) {
    $CandidatePython = $TranslateGemmaPython
    Write-Host "Reusing the existing isolated Transformers/bitsandbytes evaluation environment."
} else {
    $CandidatePython = $MiLMMTPython
    if (-not (Test-Path -LiteralPath $CandidatePython)) {
        Write-Host "Creating isolated MiLMMT evaluation environment..."
        & $BaselinePython -m venv $MiLMMTVenv
        if ($LASTEXITCODE -ne 0) { throw "Failed to create MiLMMT evaluation environment." }
    }
}

$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"

Write-Host "[1/3] Ensuring evaluation-only dependencies..."
& $CandidatePython -m pip install --disable-pip-version-check --quiet `
    --index-url https://download.pytorch.org/whl/cu126 `
    torch==2.11.0
if ($LASTEXITCODE -ne 0) { throw "Failed to ensure PyTorch 2.11.0+cu126." }

& $CandidatePython -m pip install --disable-pip-version-check --quiet `
    transformers==4.57.6 `
    accelerate==1.14.0 `
    bitsandbytes==0.50.0 `
    huggingface-hub==0.36.2 `
    safetensors==0.8.0 `
    sentencepiece==0.2.2 `
    sacrebleu==2.6.0
if ($LASTEXITCODE -ne 0) { throw "Failed to ensure MiLMMT evaluation dependencies." }

Write-Host "[2/3] Verifying CUDA..."
& $CandidatePython -c "import torch; assert torch.cuda.is_available(); assert torch.cuda.is_bf16_supported(); print('CUDA:', torch.cuda.get_device_name(0), '| torch', torch.__version__, '| CUDA', torch.version.cuda)"
if ($LASTEXITCODE -ne 0) { throw "CUDA/BF16 is not ready for MiLMMT evaluation." }

Write-Host "[3/3] Running representative realtime comparison..."
Write-Host "      Current production M2M100-418M vs MiLMMT-46-1B-v1.0 BF16 vs MiLMMT-46-4B-v1.0 INT8"
Write-Host "      24 realistic Meeting/Text utterances. No short-circuit. No one-error automatic reject."
Write-Host "      First run downloads the two official Xiaomi v1.0 checkpoints and pins their exact revisions."

$Runner = Join-Path $RepoRoot "tools\translation_quality\realtime_translation_ab.py"
& $CandidatePython $Runner `
    --repo-root $RepoRoot `
    --baseline-python $BaselinePython `
    --candidate-python $CandidatePython
if ($LASTEXITCODE -ne 0) {
    throw "MiLMMT realtime A/B harness failed. Production was not modified."
}

$Report = Join-Path $MiLMMTRoot "milmmt_realtime_ab_report.json"
$Review = Join-Path $MiLMMTRoot "milmmt_realtime_ab_review.md"

Write-Host ""
Write-Host "=== COMPLETE ==="
Write-Host "No production model was changed. No candidate was automatically rejected."
Write-Host ("Report : {0}" -f $Report)
Write-Host ("Review : {0}" -f $Review)
Write-Host "Return/upload the report or review file before any migration decision."
