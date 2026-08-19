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
$HfCli = Join-Path $EvalVenv "Scripts\hf.exe"
$ReportPath = Join-Path $Round2Root "translategemma_prescreen_report.json"
$Runner = Join-Path $RepoRoot "tools\translation_quality\round2_translategemma_prescreen.py"
New-Item -ItemType Directory -Path $Round2Root -Force | Out-Null

$BootstrapPython = Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\Phase2\.venv\Scripts\python.exe"
if (-not (Test-Path $BootstrapPython)) {
    throw "The existing Python 3.12 evaluation bootstrap is missing. Do not modify the production WorkerRuntime to compensate."
}

$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"

function Get-ReportTextField([string]$Path, [string]$Field) {
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    $Raw = Get-Content -LiteralPath $Path -Raw
    $Pattern = '"' + [regex]::Escape($Field) + '"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"'
    $Match = [regex]::Match($Raw, $Pattern)
    if (-not $Match.Success) { return $null }
    $Value = $Match.Groups[1].Value
    $Value = $Value -replace '\\n', "`n"
    $Value = $Value -replace '\\r', "`r"
    $Value = $Value -replace '\\t', "`t"
    $Value = $Value -replace '\\"', '"'
    $Value = $Value -replace '\\\\', '\'
    return $Value
}

function Get-ReportNumberField([string]$Path, [string]$Field) {
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    $Raw = Get-Content -LiteralPath $Path -Raw
    $Pattern = '"' + [regex]::Escape($Field) + '"\s*:\s*(-?\d+(?:\.\d+)?)'
    $Match = [regex]::Match($Raw, $Pattern)
    if (-not $Match.Success) { return $null }
    return $Match.Groups[1].Value
}

function Show-AutomaticRejectionSummary([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return }
    $Raw = Get-Content -LiteralPath $Path -Raw

    $CollapsePattern = '(?s)"semantic_contrast_collapses"\s*:\s*\[\s*\{\s*"group"\s*:\s*"([^"]+)"\s*,\s*"direction"\s*:\s*"([^"]+)"\s*,\s*"left_pair"\s*:\s*"([^"]+)"\s*,\s*"right_pair"\s*:\s*"([^"]+)"\s*,\s*"normalized_output"\s*:\s*"([^"]*)"'
    $Collapse = [regex]::Match($Raw, $CollapsePattern)
    if ($Collapse.Success) {
        Write-Host ""
        Write-Host "=== HARD REJECTION: SEMANTIC CONTRAST COLLAPSE ==="
        Write-Host ("Group     : {0}" -f $Collapse.Groups[1].Value)
        Write-Host ("Direction : {0}" -f $Collapse.Groups[2].Value)
        Write-Host ("Pair A    : {0}" -f $Collapse.Groups[3].Value)
        Write-Host ("Pair B    : {0}" -f $Collapse.Groups[4].Value)
        Write-Host ("Collapsed : {0}" -f $Collapse.Groups[5].Value)
        return
    }

    $FailurePattern = '(?s)"generation_or_completion_failures"\s*:\s*\[\s*\{\s*"case_id"\s*:\s*"([^"]+)"\s*,\s*"blocker"\s*:\s*"([^"]+)"\s*,\s*"note"\s*:\s*"([^"]*)"'
    $Failure = [regex]::Match($Raw, $FailurePattern)
    if ($Failure.Success) {
        Write-Host ""
        Write-Host "=== HARD REJECTION: GENERATION / COMPLETION ==="
        Write-Host ("Case    : {0}" -f $Failure.Groups[1].Value)
        Write-Host ("Blocker : {0}" -f $Failure.Groups[2].Value)
        Write-Host ("Note    : {0}" -f $Failure.Groups[3].Value)
        return
    }

    $LiteralPattern = '(?s)"protected_literal_failures"\s*:\s*\[\s*\{\s*"case_id"\s*:\s*"([^"]+)".*?"translated_text"\s*:\s*"([^"]*)"'
    $Literal = [regex]::Match($Raw, $LiteralPattern)
    if ($Literal.Success) {
        Write-Host ""
        Write-Host "=== HARD REJECTION: PROTECTED LITERAL LOSS ==="
        Write-Host ("Case   : {0}" -f $Literal.Groups[1].Value)
        Write-Host ("Output : {0}" -f $Literal.Groups[2].Value)
        return
    }

    Write-Host ""
    Write-Host "Hard rejection is recorded in the report, but the compact wrapper could not classify the first detail."
}

function Show-FinalState([string]$State) {
    Write-Host ""
    switch ($State) {
        "BLOCKED_GEMMA_ACCESS" {
            Write-Host "TranslateGemma access is blocked by the gated Gemma terms/authentication prerequisite."
            Write-Host ("Report: {0}" -f $ReportPath)
            return $false
        }
        "REJECTED_RUNTIME" {
            Write-Host "TranslateGemma was rejected by the Windows INT8 compatibility/runtime gate."
            Write-Host ("Report: {0}" -f $ReportPath)
            Write-Host "STOP. Do not add a second quantization/backend profile."
            return $true
        }
        "REJECTED_AUTOMATIC" {
            $Completed = Get-ReportNumberField -Path $ReportPath -Field "semantic_completed_cases"
            $Planned = Get-ReportNumberField -Path $ReportPath -Field "semantic_planned_cases"
            Write-Host "TranslateGemma was rejected by the kill-fast automatic diagnostics."
            if ($Completed -and $Planned) {
                Write-Host ("Completed semantic cases: {0}/{1}" -f $Completed, $Planned)
            }
            Show-AutomaticRejectionSummary -Path $ReportPath
            Write-Host ("Report: {0}" -f $ReportPath)
            Write-Host "STOP. Do not run external sampling or the full benchmark."
            return $true
        }
        "AWAITING_MANUAL_SEMANTIC_REVIEW" {
            Write-Host "TranslateGemma completed all automatic prescreen cases."
            Write-Host ("Report: {0}" -f $ReportPath)
            Write-Host "STOP. Return the report for semantic review before any further model work."
            return $true
        }
        "HARNESS_FAILED" {
            Write-Host "TranslateGemma harness failed before a model-quality decision."
            Write-Host ("Report: {0}" -f $ReportPath)
            return $true
        }
        default {
            return $false
        }
    }
}

function Invoke-TranslateGemmaPrescreen {
    & $EvalPython $Runner `
        --repo-root $RepoRoot `
        --round2-root $Round2Root `
        --candidate-python $EvalPython | ForEach-Object { Write-Host $_ }

    $ExitCode = $LASTEXITCODE
    if (-not (Test-Path -LiteralPath $ReportPath)) {
        throw "TranslateGemma report was not written. Runner exit code: $ExitCode"
    }

    $State = Get-ReportTextField -Path $ReportPath -Field "prescreen_state"
    if (-not $State) {
        throw "TranslateGemma report exists but prescreen_state could not be read: $ReportPath"
    }
    return $State
}

# A completed terminal report is authoritative. Do not rerun expensive model work merely
# to repair wrapper presentation/state handling.
$ExistingState = Get-ReportTextField -Path $ReportPath -Field "prescreen_state"
if ($ExistingState -in @("REJECTED_RUNTIME", "REJECTED_AUTOMATIC", "AWAITING_MANUAL_SEMANTIC_REVIEW")) {
    Write-Host "Existing terminal TranslateGemma report found; no inference will be repeated."
    [void](Show-FinalState -State $ExistingState)
    exit 0
}

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
Write-Host "      The first successful metadata resolution is pinned in evaluation cache."
Write-Host "[4/4] Running compatibility smoke + rejection-only semantic prescreen..."
Write-Host "      Hard failures short-circuit immediately. No FLORES/full benchmark/production migration will run."

$State = Invoke-TranslateGemmaPrescreen

if ($State -eq "BLOCKED_GEMMA_ACCESS") {
    Write-Host ""
    Write-Host "=== HUGGING FACE / GEMMA ACCESS REQUIRED ==="
    if (Test-Path -LiteralPath $HfCli) {
        Write-Host "Current Hugging Face account:"
        & $HfCli auth whoami
        if ($LASTEXITCODE -ne 0) {
            Write-Host "No usable Hugging Face login was found. Login will start now."
            Write-Host "Use a token from the SAME account that accepts the Gemma terms. Do not share the token."
            & $HfCli auth login
            if ($LASTEXITCODE -ne 0) {
                throw "Hugging Face login did not complete."
            }
        }
    }

    Write-Host ""
    Write-Host "A browser window will open to the official gated TranslateGemma page."
    Write-Host "Accept/Agree the Gemma terms using the same Hugging Face account."
    Start-Process "https://huggingface.co/google/translategemma-4b-it"
    Read-Host "After access is accepted in the browser, press ENTER here to retry automatically"

    Write-Host ""
    Write-Host "Retrying TranslateGemma access and prescreen once..."
    $State = Invoke-TranslateGemmaPrescreen
}

if ($State -eq "BLOCKED_GEMMA_ACCESS") {
    Write-Host ""
    Write-Host "TranslateGemma access is still blocked."
    Write-Host "Verify that the browser account and locally authenticated Hugging Face account are the same."
    Write-Host ("Report: {0}" -f $ReportPath)
    exit 0
}

if (Show-FinalState -State $State) {
    exit 0
}

throw "Unexpected TranslateGemma prescreen state: $State"
