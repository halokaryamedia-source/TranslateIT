$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $RepoRoot

$Branch = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $Branch -ne "Local") {
    throw "MiLMMT-1B latency optimization must run from TranslateIT Local. Current branch: '$Branch'"
}

$Root = Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\MiLMMTRealtimeAB"
$Python = Join-Path $Root ".venv\Scripts\python.exe"
$Model = Join-Path $Root "models\milmmt_1b_model"
$QualityReport = Join-Path $Root "milmmt_realtime_ab_report.json"
$CleanReport = Join-Path $Root "milmmt_clean_perf_rerun_report.json"
$Runner = Join-Path $RepoRoot "tools\translation_quality\milmmt_1b_latency_optimization.py"
$Report = Join-Path $Root "milmmt_1b_latency_optimization_report.json"

foreach ($Required in @($Python, $Model, $QualityReport, $CleanReport, $Runner)) {
    if (-not (Test-Path -LiteralPath $Required)) {
        throw "Required MiLMMT optimization input is missing: $Required"
    }
}

function Get-GpuSnapshot {
    $Raw = (& nvidia-smi --query-gpu=memory.used,utilization.gpu --format=csv,noheader,nounits --id=0).Trim()
    if ($LASTEXITCODE -ne 0) { throw "nvidia-smi GPU probe failed." }

    $Parts = $Raw -split ","
    if ($Parts.Count -ne 2) { throw "Unexpected nvidia-smi output: $Raw" }

    return [PSCustomObject]@{
        MemoryMiB = [int]$Parts[0].Trim()
        UtilPct = [int]$Parts[1].Trim()
    }
}

Write-Host "=== MiLMMT-1B SAME-QUALITY LATENCY OPTIMIZATION ==="
Write-Host "Selected model: MiLMMT-46-1B-v1.0 / BF16"
Write-Host "No model download. No production mutation. No quantization. No alternate translator."
Write-Host ""
Write-Host "Close avoidable GPU-heavy applications before continuing."

$Ready = $false
for ($Attempt = 1; $Attempt -le 6; $Attempt++) {
    $Gpu = Get-GpuSnapshot
    Write-Host ("GPU baseline: {0} MiB used | {1}% utilization" -f $Gpu.MemoryMiB, $Gpu.UtilPct)

    if ($Gpu.MemoryMiB -le 2048 -and $Gpu.UtilPct -le 10) {
        $Ready = $true
        break
    }

    if ($Attempt -lt 6) {
        Write-Host "GPU is still too busy for a clean optimization comparison."
        Read-Host "Close GPU-heavy apps, then press ENTER to check again"
    }
}

if (-not $Ready) {
    throw "GPU did not reach the clean-test gate (<= 2048 MiB used and <= 10% utilization). No benchmark was run."
}

$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"
$env:HF_HUB_OFFLINE = "1"
$env:TRANSFORMERS_OFFLINE = "1"
$env:TOKENIZERS_PARALLELISM = "false"

Write-Host ""
Write-Host "Running bounded same-model optimization proof..."
Write-Host "1. Production-like baseline without per-request nvidia-smi/synchronize instrumentation"
Write-Host "2. Verify whether baseline already uses PyTorch SDPA"
Write-Host "3. StaticCache without compile"
Write-Host "4. StaticCache + reduce-overhead compile only if the cache path is valid"
Write-Host ""
Write-Host "Candidate runtime paths must preserve the existing deterministic MiLMMT-1B outputs."
Write-Host ""

& $Python $Runner --repo-root $RepoRoot --python $Python
if ($LASTEXITCODE -ne 0) {
    throw "MiLMMT-1B latency optimization harness failed. See report: $Report"
}

Write-Host ""
Write-Host "=== COMPLETE ==="
Write-Host ("Report: {0}" -f $Report)
Write-Host "Production was not modified."
Write-Host "Upload this report for review before any runtime configuration is adopted."
