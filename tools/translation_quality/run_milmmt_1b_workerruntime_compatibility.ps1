$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $RepoRoot

$Branch = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $Branch -ne "Local") {
    throw "MiLMMT-1B WorkerRuntime compatibility proof must run from TranslateIT Local. Current branch: '$Branch'"
}

$EvidenceRoot = Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\MiLMMTRealtimeAB"
$Model = Join-Path $EvidenceRoot "models\milmmt_1b_model"
$QualityReport = Join-Path $EvidenceRoot "milmmt_realtime_ab_report.json"
$WorkerRoot = Join-Path $RepoRoot "EngineData\Backend\LocalWorker\WorkerRuntime"
$Runner = Join-Path $RepoRoot "tools\translation_quality\milmmt_1b_workerruntime_compatibility.py"
$Report = Join-Path $EvidenceRoot "milmmt_1b_workerruntime_compatibility_report.json"
$Uv = Get-Command uv -ErrorAction SilentlyContinue

foreach ($Required in @($Model, $QualityReport, $WorkerRoot, $Runner)) {
    if (-not (Test-Path -LiteralPath $Required)) {
        throw "Required MiLMMT compatibility input is missing: $Required"
    }
}
if ($null -eq $Uv) {
    throw "uv is required to execute the canonical frozen WorkerRuntime environment."
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

Write-Host "=== MiLMMT-1B CANONICAL WORKERRUNTIME COMPATIBILITY ==="
Write-Host "Purpose: verify the selected MiLMMT-1B under the current frozen WorkerRuntime dependency matrix."
Write-Host "No model download. No model search. No production source mutation."
Write-Host "24 deterministic outputs are compared with the already-approved MiLMMT-1B quality evidence."
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
        Write-Host "GPU is still too busy for a clean compatibility run."
        Read-Host "Close GPU-heavy apps, then press ENTER to check again"
    }
}
if (-not $Ready) {
    throw "GPU did not reach the clean-test gate (<= 2048 MiB used and <= 10% utilization). No proof was run."
}

$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"
$env:HF_HUB_OFFLINE = "1"
$env:TRANSFORMERS_OFFLINE = "1"
$env:TOKENIZERS_PARALLELISM = "false"

Push-Location $WorkerRoot
try {
    Write-Host ""
    Write-Host "Using frozen canonical WorkerRuntime environment..."
    & $Uv.Source run --frozen --no-dev python $Runner --repo-root $RepoRoot
    if ($LASTEXITCODE -ne 0) {
        throw "MiLMMT-1B is not yet proven compatible with the current WorkerRuntime dependency matrix. See report: $Report"
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "=== COMPLETE ==="
Write-Host ("Report: {0}" -f $Report)
Write-Host "Upload this JSON report. If it says WORKERRUNTIME_COMPATIBLE, the next step is canonical production source migration without changing the dependency lock."
