$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $RepoRoot

$Branch = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $Branch -ne "Local") {
    throw "MiLMMT clean performance rerun must run from TranslateIT Local. Current branch: '$Branch'"
}

$Root = Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\MiLMMTRealtimeAB"
$Python = Join-Path $Root ".venv\Scripts\python.exe"
$Model1B = Join-Path $Root "models\milmmt_1b_model"
$Model4B = Join-Path $Root "models\milmmt_4b_model"
$Runner = Join-Path $RepoRoot "tools\translation_quality\milmmt_clean_perf_rerun.py"
$Report = Join-Path $Root "milmmt_clean_perf_rerun_report.json"

if (-not (Test-Path -LiteralPath $Python)) {
    throw "Existing MiLMMT evaluation environment is missing: $Python"
}
if (-not (Test-Path -LiteralPath $Model1B) -or -not (Test-Path -LiteralPath $Model4B)) {
    throw "MiLMMT model cache is incomplete. This rerun does not download models."
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

Write-Host "=== MiLMMT CLEAN PERFORMANCE RERUN ==="
Write-Host "This rerun uses cached MiLMMT 1B + 4B only."
Write-Host "No model download. No 24-case quality rerun. No production change."
Write-Host ""
Write-Host "Close GPU-heavy applications before continuing (AI apps, games, renderers, video tools, etc.)."

$Ready = $false
for ($Attempt = 1; $Attempt -le 6; $Attempt++) {
    $Gpu = Get-GpuSnapshot
    Write-Host ("GPU baseline: {0} MiB used | {1}% utilization" -f $Gpu.MemoryMiB, $Gpu.UtilPct)
    if ($Gpu.MemoryMiB -le 2048 -and $Gpu.UtilPct -le 10) {
        $Ready = $true
        break
    }

    if ($Attempt -lt 6) {
        Write-Host "GPU is still too busy for a clean comparison. Close GPU-heavy apps."
        Read-Host "After closing them, press ENTER to check again"
    }
}

if (-not $Ready) {
    throw "GPU did not reach the clean-test gate (<= 2048 MiB used and <= 10% utilization). No benchmark was run."
}

$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"
$env:HF_HUB_OFFLINE = "1"
$env:TRANSFORMERS_OFFLINE = "1"

Write-Host ""
Write-Host "Running clean performance/VRAM proof..."
Write-Host "6 representative utterances x 3 measured repeats per model, after warmup."
Write-Host "Models run sequentially so VRAM is released between scenarios."
Write-Host ""

& $Python $Runner --repo-root $RepoRoot --python $Python
if ($LASTEXITCODE -ne 0) {
    throw "MiLMMT clean performance rerun failed. See report: $Report"
}

Write-Host ""
Write-Host "=== COMPLETE ==="
Write-Host ("Report: {0}" -f $Report)
Write-Host "Return/upload this report. The previous 24-case quality review remains valid and is not replaced by this performance rerun."
