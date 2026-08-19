$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $RepoRoot

$Branch = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $Branch -ne "Local") {
    throw "TranslateGemma prescreen must run from the TranslateIT Local branch. Current branch: '$Branch'"
}

$Round2Root = Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\Round2\TranslateGemma"
$EvalVenv = Join-Path $Round2Root ".venv"
$EvalPython = Join-Path $EvalVenv "Scripts\python.exe"
$ReportPath = Join-Path $Round2Root "translategemma_prescreen_report.json"
$Runner = Join-Path $RepoRoot "tools\translation_quality\round2_translategemma_prescreen.py"
New-Item -ItemType Directory -Path $Round2Root -Force | Out-Null

$BootstrapPython = Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\Phase2\.venv\Scripts\python.exe"
if (-not (Test-Path $BootstrapPython)) {
    throw "The existing Python 3.12 evaluation bootstrap is missing. Do not modify the production WorkerRuntime to compensate."
}

$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"

Write-Host "[1/4] Preparing isolated TranslateGemma evaluation environment..."
if (-not (Test-Path $EvalPython)) {
    & $BootstrapPython -m venv $EvalVenv
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create isolated TranslateGemma evaluation environment."
    }
}

$ExpectedPackages = @{
    "torch" = "2.11.0+cu126"
    "transformers" = "4.57.6"
    "accelerate" = "1.14.0"
    "bitsandbytes" = "0.50.0"
    "huggingface-hub" = "0.36.2"
}
$Installed = @{}
try {
    $PackageList = (& $EvalPython -m pip list --format=json | ConvertFrom-Json)
    foreach ($Package in $PackageList) {
        $Installed[$Package.name.ToLowerInvariant()] = [string]$Package.version
    }
} catch {
    $Installed = @{}
}
$NeedsInstall = $false
foreach ($Name in $ExpectedPackages.Keys) {
    if (-not $Installed.ContainsKey($Name) -or $Installed[$Name] -ne $ExpectedPackages[$Name]) {
        $NeedsInstall = $true
        break
    }
}

if ($NeedsInstall) {
    Write-Host "Installing exact evaluation-only dependencies..."
    & $EvalPython -m pip install --disable-pip-version-check --index-url https://download.pytorch.org/whl/cu126 torch==2.11.0
    if ($LASTEXITCODE -ne 0) { throw "Failed to install evaluation PyTorch 2.11.0+cu126." }
    & $EvalPython -m pip install --disable-pip-version-check `
        transformers==4.57.6 `
        accelerate==1.14.0 `
        bitsandbytes==0.50.0 `
        huggingface-hub==0.36.2 `
        safetensors `
        sentencepiece
    if ($LASTEXITCODE -ne 0) { throw "Failed to install TranslateGemma evaluation dependencies." }
}

Write-Host "[2/4] Verifying Windows CUDA + LLM.int8 dependencies..."
$Worker = Join-Path $RepoRoot "tools\translation_quality\round2_translategemma_worker.py"
& $EvalPython $Worker --environment-probe
if ($LASTEXITCODE -ne 0) {
    throw "TranslateGemma isolated CUDA/LLM.int8 environment is not ready."
}

Write-Host "[3/4] Resolving exact gated TranslateGemma revision and loading official weights with LLM.int8..."
Write-Host "      If access is blocked, accept the Gemma terms for google/translategemma-4b-it on Hugging Face and rerun."
Write-Host "      The first successful metadata resolution is pinned in evaluation cache for subsequent reruns."

Write-Host "[4/4] Running compatibility smoke + rejection-only semantic prescreen..."
Write-Host "      Hard failures short-circuit immediately; the run does not force all 32 cases after an automatic reject."
Write-Host "      No FLORES sweep, repeated performance benchmark, MADLAD, or production migration will run."
& $EvalPython $Runner `
    --repo-root $RepoRoot `
    --round2-root $Round2Root `
    --candidate-python $EvalPython

if ($LASTEXITCODE -ne 0) {
    if (Test-Path $ReportPath) {
        try {
            $Report = Get-Content $ReportPath -Raw | ConvertFrom-Json
            if ($null -ne $Report.error) {
                Write-Host ""
                Write-Host "=== TRANSLATEGEMMA ROOT CAUSE ==="
                Write-Host ("Type: {0}" -f $Report.error.type)
                Write-Host ("Message: {0}" -f $Report.error.message)
            }
        } catch {
            Write-Host "Could not parse TranslateGemma report: $ReportPath"
        }
    }
    throw "TranslateGemma prescreen harness did not complete. Production was not modified."
}

$Report = Get-Content $ReportPath -Raw | ConvertFrom-Json
Write-Host ""
switch ($Report.prescreen_state) {
    "BLOCKED_GEMMA_ACCESS" {
        Write-Host "TranslateGemma access is blocked by the gated Gemma terms/authentication prerequisite."
        Write-Host ("Report: {0}" -f $ReportPath)
        Write-Host "Accept access for google/translategemma-4b-it in Hugging Face, then rerun this same command."
        exit 0
    }
    "REJECTED_RUNTIME" {
        Write-Host "TranslateGemma was rejected by the Windows INT8 compatibility/runtime gate."
        Write-Host ("Report: {0}" -f $ReportPath)
        Write-Host "STOP. Do not add a second quantization/backend profile. Return this report for review."
        exit 0
    }
    "REJECTED_AUTOMATIC" {
        Write-Host "TranslateGemma was rejected by the kill-fast automatic semantic diagnostics."
        Write-Host ("Completed semantic cases: {0}/{1}" -f $Report.semantic_completed_cases, $Report.semantic_planned_cases)
        Write-Host ("Report: {0}" -f $ReportPath)
        Write-Host "STOP. Do not run external sampling or the full benchmark. Return this report for review."
        exit 0
    }
    "AWAITING_MANUAL_SEMANTIC_REVIEW" {
        Write-Host "TranslateGemma completed all 32 automatic prescreen cases."
        Write-Host ("Report: {0}" -f $ReportPath)
        Write-Host ("Semantic review pack: {0}" -f $Report.semantic_review_pack)
        Write-Host "STOP. Return the report for semantic review before any further model work."
        exit 0
    }
    default {
        throw "Unexpected TranslateGemma prescreen state: $($Report.prescreen_state)"
    }
}
