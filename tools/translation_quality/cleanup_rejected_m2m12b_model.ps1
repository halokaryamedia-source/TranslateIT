$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $RepoRoot

$Branch = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $Branch -ne "Local") {
    throw "Rejected M2M100-1.2B cleanup must run from TranslateIT Local. Current branch: '$Branch'"
}

$ModelDir = Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\Round2\m2m100_1_2b_model"
$Report = Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\Round2\m2m12b_prescreen_report.json"
$ReviewPack = Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\Round2\m2m12b_semantic_review_pack.jsonl"
$Production = Join-Path $RepoRoot "EngineData\Backend\RuntimeAssets\Translation\ModelData\m2m100-418m"

Write-Host "KEEP  production M2M100-418M: $Production"
Write-Host "KEEP  prescreen report: $Report"
Write-Host "KEEP  semantic review pack if present: $ReviewPack"

function Get-DirectoryBytes([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return [int64]0 }
    $sum = Get-ChildItem -LiteralPath $Path -File -Recurse -Force -ErrorAction SilentlyContinue |
        Measure-Object -Property Length -Sum
    if ($null -eq $sum.Sum) { return [int64]0 }
    return [int64]$sum.Sum
}

$Freed = [int64]0
if (Test-Path -LiteralPath $ModelDir) {
    $Freed += Get-DirectoryBytes $ModelDir
    Write-Host "REMOVE rejected M2M100-1.2B candidate cache: $ModelDir"
    Remove-Item -LiteralPath $ModelDir -Recurse -Force
    if (Test-Path -LiteralPath $ModelDir) {
        throw "Failed to remove rejected M2M100-1.2B cache: $ModelDir"
    }
} else {
    Write-Host "SKIP  rejected M2M100-1.2B candidate cache (not present)"
}

$HubRoots = New-Object System.Collections.Generic.List[string]
if ($env:HF_HUB_CACHE) { $HubRoots.Add($env:HF_HUB_CACHE) }
if ($env:HUGGINGFACE_HUB_CACHE) { $HubRoots.Add($env:HUGGINGFACE_HUB_CACHE) }
if ($env:HF_HOME) { $HubRoots.Add((Join-Path $env:HF_HOME "hub")) }
if ($env:USERPROFILE) { $HubRoots.Add((Join-Path $env:USERPROFILE ".cache\huggingface\hub")) }

foreach ($HubRoot in ($HubRoots | Where-Object { $_ } | Sort-Object -Unique)) {
    $CachePath = Join-Path $HubRoot "models--facebook--m2m100_1.2B"
    if (Test-Path -LiteralPath $CachePath) {
        $Freed += Get-DirectoryBytes $CachePath
        Write-Host "REMOVE Hugging Face cache: $CachePath"
        Remove-Item -LiteralPath $CachePath -Recurse -Force
    }
}

$FreedGiB = [math]::Round($Freed / 1GB, 2)
Write-Host "Cleanup complete. Approximate rejected M2M100-1.2B bytes removed: $FreedGiB GiB"
