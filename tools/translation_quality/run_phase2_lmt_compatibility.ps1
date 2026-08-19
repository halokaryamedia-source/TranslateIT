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
$ReportPath = Join-Path $CacheRoot "phase2_lmt_compatibility_report.json"
$FloresUrl = "https://huggingface.co/datasets/openlanguagedata/flores_plus"
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

Write-Host "[3/4] Checking Hugging Face account..."
& $VenvPython -c "from huggingface_hub import get_token; import sys; sys.exit(0 if get_token() else 3)" | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Hugging Face is not connected on this PC yet."
    Write-Host "Tell ChatGPT this exact message and it will guide the one-time connection step."
    throw "Stopped before model inference because no Hugging Face account token is available."
}

function Read-Phase2Report {
    if (-not (Test-Path $ReportPath)) { return $null }
    try {
        return (Get-Content $ReportPath -Raw | ConvertFrom-Json)
    } catch {
        return $null
    }
}

function Test-FloresAccessBlocker($Report) {
    if ($null -eq $Report -or $null -eq $Report.error) { return $false }
    return (
        $Report.error.type -eq "GatedRepoError" -or
        $Report.error.message -match "gated repo|authorized list|ask for access|restricted"
    )
}

Write-Host "[4/4] Running isolated LMT CUDA/BF16 compatibility proof..."
& $VenvPython $ProbeScript $CacheRoot
$ProbeExitCode = $LASTEXITCODE

if ($ProbeExitCode -ne 0) {
    $Report = Read-Phase2Report

    if (Test-FloresAccessBlocker $Report) {
        Write-Host ""
        Write-Host "============================================================"
        Write-Host "FLORES+ ACCESS IS NOT ENABLED YET"
        Write-Host "============================================================"
        Write-Host ""
        Write-Host "No terminal login is needed right now. Your Hugging Face account token already exists."
        Write-Host "I will open the official FLORES+ page in your browser."
        Write-Host ""
        Write-Host "In the browser:"
        Write-Host "  1. Sign in to Hugging Face if the browser asks."
        Write-Host "  2. Click 'Agree and send request to access repo' / 'Request access'."
        Write-Host "  3. Wait until the page says access is granted."
        Write-Host ""
        Start-Process $FloresUrl
        [void](Read-Host "When the page says access is granted, press ENTER here to retry once")

        Write-Host ""
        Write-Host "Retrying FLORES+ access and Phase 2..."
        & $VenvPython $ProbeScript $CacheRoot
        $ProbeExitCode = $LASTEXITCODE
    }
}

if ($ProbeExitCode -ne 0) {
    $Report = Read-Phase2Report
    if ($null -ne $Report -and $null -ne $Report.error) {
        Write-Host ""
        Write-Host "=== PHASE 2 ROOT CAUSE ==="
        Write-Host ("Type: {0}" -f $Report.error.type)
        Write-Host ("Message: {0}" -f $Report.error.message)

        if (Test-FloresAccessBlocker $Report) {
            Write-Host ""
            Write-Host "FLORES+ access is still not granted."
            Write-Host "If the request is pending, wait for approval and later run this same command again."
            throw "Phase 2 is waiting only for official FLORES+ access. Production was not modified."
        }
    }
    throw "Phase 2 compatibility proof failed. Review $ReportPath. Production was not modified."
}

Write-Host ""
Write-Host "Phase 2 compatibility proof completed."
Write-Host ("Report: {0}" -f $ReportPath)
Write-Host "Do not run the full benchmark yet; return the Phase 2 report for review."
