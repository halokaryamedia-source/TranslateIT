$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $RepoRoot

$Branch = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $Branch -ne "Local") {
    throw "Phase 2 must run from the TranslateIT Local branch. Current branch: '$Branch'"
}

$CacheRoot = Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\Phase2"
$VenvRoot = Join-Path $CacheRoot ".venv"
$ProbeScript = Join-Path $RepoRoot "tools\translation_quality\phase2_lmt_compatibility.py"
New-Item -ItemType Directory -Path $CacheRoot -Force | Out-Null

$UsePyLauncher = $false
$PyLauncher = Get-Command py -ErrorAction SilentlyContinue
if ($null -ne $PyLauncher) {
    & py -3.12 -c "import sys; assert sys.version_info[:2] == (3, 12)" | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $UsePyLauncher = $true
    }
}

if (-not $UsePyLauncher) {
    $Python = Get-Command python -ErrorAction SilentlyContinue
    if ($null -eq $Python) {
        throw "Python 3.12 is required for the isolated Phase 2 environment."
    }
    & python -c "import sys; assert sys.version_info[:2] == (3, 12)" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Python 3.12 is required for the isolated Phase 2 environment."
    }
}

if (-not (Test-Path (Join-Path $VenvRoot "Scripts\python.exe"))) {
    Write-Host "[1/4] Creating isolated Python 3.12 environment..."
    if ($UsePyLauncher) {
        & py -3.12 -m venv $VenvRoot
    } else {
        & python -m venv $VenvRoot
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create isolated Phase 2 virtual environment."
    }
}

$VenvPython = Join-Path $VenvRoot "Scripts\python.exe"
$DependencyStamp = Join-Path $VenvRoot ".translateit-phase2-deps-v1"

if (-not (Test-Path $DependencyStamp)) {
    Write-Host "[2/4] Installing isolated CUDA/BF16 compatibility dependencies..."
    & $VenvPython -m pip install --disable-pip-version-check --index-url "https://download.pytorch.org/whl/cu126" "torch==2.11.0"
    if ($LASTEXITCODE -ne 0) { throw "Failed to install torch==2.11.0 from the CUDA 12.6 index." }

    & $VenvPython -m pip install --disable-pip-version-check "transformers==4.51.3" "huggingface-hub>=0.30,<1.0" "safetensors>=0.4,<1.0"
    if ($LASTEXITCODE -ne 0) { throw "Failed to install isolated LMT compatibility dependencies." }

    & $VenvPython -c "import torch, transformers; assert torch.__version__.split('+')[0] == '2.11.0'; assert transformers.__version__ == '4.51.3'"
    if ($LASTEXITCODE -ne 0) { throw "Isolated dependency verification failed." }

    New-Item -ItemType File -Path $DependencyStamp -Force | Out-Null
} else {
    Write-Host "[2/4] Reusing verified isolated Phase 2 environment."
}

Write-Host "[3/4] Verifying Hugging Face access and pinned FLORES+/LMT revisions..."
& $VenvPython -c "from huggingface_hub import get_token; import sys; sys.exit(0 if get_token() else 3)" | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Hugging Face authentication is required before any LMT inference."
    Write-Host "1. Open the FLORES+ dataset page and accept its access conditions."
    Write-Host "2. Run this command once:"
    Write-Host ('   & "{0}" -c "from huggingface_hub import login; login()"' -f $VenvPython)
    Write-Host "3. Re-run this PowerShell script."
    throw "Stopped before model inference because no Hugging Face token is available."
}

Write-Host "[4/4] Running isolated LMT CUDA/BF16 compatibility proof..."
& $VenvPython $ProbeScript $CacheRoot
if ($LASTEXITCODE -ne 0) {
    throw "Phase 2 compatibility proof failed. Review the JSON report printed above. Production was not modified."
}

Write-Host ""
Write-Host "Phase 2 compatibility proof completed."
Write-Host ("Report: {0}" -f (Join-Path $CacheRoot "phase2_lmt_compatibility_report.json"))
Write-Host "Do not run the full benchmark yet; return the Phase 2 report for review."
