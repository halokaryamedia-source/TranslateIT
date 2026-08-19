$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $RepoRoot

$Branch = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $Branch -ne "Local") {
    throw "Translation model cleanup must run from the TranslateIT Local branch. Current branch: '$Branch'"
}

function Get-DirectoryBytes([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        return [int64]0
    }
    $sum = Get-ChildItem -LiteralPath $Path -File -Recurse -Force -ErrorAction SilentlyContinue |
        Measure-Object -Property Length -Sum
    if ($null -eq $sum.Sum) {
        return [int64]0
    }
    return [int64]$sum.Sum
}

function Remove-ExactDirectory([string]$Path, [string]$Label) {
    if (-not (Test-Path -LiteralPath $Path)) {
        Write-Host ("SKIP  {0} (not present)" -f $Label)
        return [int64]0
    }

    $bytes = Get-DirectoryBytes $Path
    Write-Host ("REMOVE {0}" -f $Label)
    Write-Host ("       {0}" -f $Path)
    Remove-Item -LiteralPath $Path -Recurse -Force
    if (Test-Path -LiteralPath $Path) {
        throw "Failed to remove obsolete model directory: $Path"
    }
    return $bytes
}

$TranslationRoot = Join-Path $RepoRoot "EngineData\Backend\RuntimeAssets\Translation\ModelData"

$ProtectedPaths = @(
    (Join-Path $TranslationRoot "m2m100-418m"),
    (Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\Round2\m2m100_1_2b_model"),
    (Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\Phase2\.venv")
)

Write-Host "TranslateIT rejected-model cleanup"
Write-Host ""
Write-Host "Protected / intentionally retained:"
foreach ($Path in $ProtectedPaths) {
    Write-Host ("  KEEP  {0}" -f $Path)
}
Write-Host ""

$FreedBytes = [int64]0

$RepoOwnedTargets = @(
    @{
        Path = (Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\Phase2\lmt_model")
        Label = "rejected LMT-60-1.7B evaluation model"
    },
    @{
        Path = (Join-Path $RepoRoot "UserData\CacheData\TranslationQuality\Round2\small100_model")
        Label = "abandoned SMaLL-100 evaluation model"
    },
    @{
        Path = (Join-Path $TranslationRoot "marianmt-en-id")
        Label = "retired Marian EN-to-ID RuntimeAssets model"
    },
    @{
        Path = (Join-Path $TranslationRoot "marianmt-id-en")
        Label = "retired Marian ID-to-EN RuntimeAssets model"
    }
)

foreach ($Target in $RepoOwnedTargets) {
    $FreedBytes += Remove-ExactDirectory -Path $Target.Path -Label $Target.Label
}

$HubRoots = New-Object System.Collections.Generic.List[string]
if ($env:HF_HUB_CACHE) {
    $HubRoots.Add($env:HF_HUB_CACHE)
}
if ($env:HUGGINGFACE_HUB_CACHE) {
    $HubRoots.Add($env:HUGGINGFACE_HUB_CACHE)
}
if ($env:HF_HOME) {
    $HubRoots.Add((Join-Path $env:HF_HOME "hub"))
}
if ($env:USERPROFILE) {
    $HubRoots.Add((Join-Path $env:USERPROFILE ".cache\huggingface\hub"))
}

$UniqueHubRoots = $HubRoots | Where-Object { $_ } | Sort-Object -Unique
$RejectedHubRepos = @(
    "models--NiuTrans--LMT-60-1.7B",
    "models--alirezamsh--small100"
)

foreach ($HubRoot in $UniqueHubRoots) {
    foreach ($RepoName in $RejectedHubRepos) {
        $CachePath = Join-Path $HubRoot $RepoName
        $FreedBytes += Remove-ExactDirectory -Path $CachePath -Label ("Hugging Face cache {0}" -f $RepoName)
    }
}

Write-Host ""
$FreedGiB = [math]::Round($FreedBytes / 1GB, 2)
Write-Host ("Cleanup complete. Approximate model bytes removed: {0} GiB" -f $FreedGiB)

if (Test-Path -LiteralPath $TranslationRoot) {
    $Unknown = Get-ChildItem -LiteralPath $TranslationRoot -Directory -Force |
        Where-Object { $_.Name -ne "m2m100-418m" }
    if ($Unknown) {
        Write-Host ""
        Write-Host "Unrecognized RuntimeAssets translation directories were NOT deleted:"
        foreach ($Item in $Unknown) {
            Write-Host ("  REVIEW {0}" -f $Item.FullName)
        }
        Write-Host "Return these paths for review before deleting them."
    }
}

Write-Host ""
Write-Host "Preserved Phase 2/3 reports and evaluation environments."
Write-Host "Preserved production M2M100-418M and active Round 2 M2M100-1.2B candidate cache."
