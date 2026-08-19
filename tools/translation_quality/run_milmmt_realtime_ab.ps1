$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $RepoRoot

$Branch = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $Branch -ne "Local") {
    throw "MiLMMT 1B/4B comparison must run from TranslateIT Local. Current branch: '$Branch'"
}

$MiLMMTRoot = Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\MiLMMTRealtimeAB"
$MiLMMTVenv = Join-Path $MiLMMTRoot ".venv"
$MiLMMTPython = Join-Path $MiLMMTVenv "Scripts\python.exe"
New-Item -ItemType Directory -Path $MiLMMTRoot -Force | Out-Null

$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"

if (-not (Test-Path -LiteralPath $MiLMMTPython)) {
    Write-Host "[1/4] Creating isolated MiLMMT Python environment..."

    $Bootstrap = $null
    $BootstrapArgs = @()

    $PythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($null -ne $PythonCommand) {
        $Version = (& $PythonCommand.Source -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')").Trim()
        if ($LASTEXITCODE -eq 0 -and $Version -eq "3.12") {
            $Bootstrap = $PythonCommand.Source
        }
    }

    if (-not $Bootstrap) {
        $PyCommand = Get-Command py -ErrorAction SilentlyContinue
        if ($null -ne $PyCommand) {
            $Version = (& $PyCommand.Source -3.12 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')").Trim()
            if ($LASTEXITCODE -eq 0 -and $Version -eq "3.12") {
                $Bootstrap = $PyCommand.Source
                $BootstrapArgs = @("-3.12")
            }
        }
    }

    if (-not $Bootstrap) {
        throw "Python 3.12 was not found. MiLMMT evaluation does not use any old model-specific environment as a bootstrap."
    }

    & $Bootstrap @BootstrapArgs -m venv $MiLMMTVenv
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create isolated MiLMMT evaluation environment."
    }
} else {
    Write-Host "[1/4] Reusing isolated MiLMMT Python environment."
}

Write-Host "[2/4] Ensuring MiLMMT-only evaluation dependencies..."
& $MiLMMTPython -m pip install --disable-pip-version-check --quiet `
    --index-url https://download.pytorch.org/whl/cu126 `
    torch==2.11.0
if ($LASTEXITCODE -ne 0) { throw "Failed to ensure PyTorch 2.11.0+cu126." }

& $MiLMMTPython -m pip install --disable-pip-version-check --quiet `
    transformers==4.57.6 `
    accelerate==1.14.0 `
    bitsandbytes==0.50.0 `
    huggingface-hub==0.36.2 `
    safetensors==0.8.0 `
    sentencepiece==0.2.2 `
    sacrebleu==2.6.0
if ($LASTEXITCODE -ne 0) { throw "Failed to ensure MiLMMT evaluation dependencies." }

Write-Host "[3/4] Verifying RTX CUDA/BF16/INT8 prerequisites..."
& $MiLMMTPython -c "import torch, bitsandbytes as bnb; assert torch.cuda.is_available(); assert torch.cuda.is_bf16_supported(); assert hasattr(bnb.nn, 'Linear8bitLt'); print('CUDA:', torch.cuda.get_device_name(0), '| torch', torch.__version__, '| CUDA', torch.version.cuda, '| BF16 OK | INT8 module OK')"
if ($LASTEXITCODE -ne 0) {
    throw "CUDA/BF16/bitsandbytes INT8 prerequisites are not ready for MiLMMT evaluation."
}

Write-Host "[4/4] Running the two requested MiLMMT scenarios..."
Write-Host "      Scenario A: MiLMMT-46-1B-v1.0 / BF16"
Write-Host "      Scenario B: MiLMMT-46-4B-v1.0 / LLM.int8 + BF16 non-quantized compute"
Write-Host "      Both run the same 24 realistic Meeting/Text utterances."
Write-Host "      No M2M100. No TranslateGemma. No short-circuit. No single-error rejection."
Write-Host "      First run downloads only the two official Xiaomi v1.0 checkpoints and pins exact revisions."

$Runner = Join-Path $RepoRoot "tools\translation_quality\realtime_translation_ab.py"
& $MiLMMTPython $Runner `
    --repo-root $RepoRoot `
    --candidate-python $MiLMMTPython
if ($LASTEXITCODE -ne 0) {
    throw "MiLMMT 1B/4B realtime comparison failed. Production was not modified."
}

$Report = Join-Path $MiLMMTRoot "milmmt_realtime_ab_report.json"
$Review = Join-Path $MiLMMTRoot "milmmt_realtime_ab_review.md"

Write-Host ""
Write-Host "=== COMPLETE ==="
Write-Host "Only MiLMMT-1B and MiLMMT-4B were evaluated."
Write-Host "No candidate was automatically rejected and production was not changed."
Write-Host ("Report : {0}" -f $Report)
Write-Host ("Review : {0}" -f $Review)
Write-Host "Return/upload the review file for the 1B vs 4B decision."
