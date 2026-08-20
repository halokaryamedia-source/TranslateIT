$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$AppRoot = Split-Path -Parent $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $AppRoot '..\..\..')).Path
$BackendRoot = (Resolve-Path (Join-Path $AppRoot '..\..\Backend')).Path
$ReleasePython = Join-Path $BackendRoot 'LocalWorker\PythonRuntime\python.exe'
$Optimizer = Join-Path $PSScriptRoot 'optimize_release_payload.py'
$PayloadBuilder = Join-Path $PSScriptRoot 'build_r3_external_payload.py'
$HookTemplate = Join-Path $AppRoot 'src-tauri\windows\r3_payload_hooks.template.nsh'
$InstallerHelper = Join-Path $AppRoot 'src-tauri\windows\r3_payload_installer.ps1'
$GeneratedHook = Join-Path $AppRoot 'src-tauri\target\translateit-r3-payload-hooks.generated.nsh'
$ReleaseDir = Join-Path $AppRoot 'src-tauri\target\translateit-release'
$PayloadPath = Join-Path $ReleaseDir 'TranslateIT-Payload.7z'
$SetupPath = Join-Path $ReleaseDir 'TranslateIT-Setup.exe'
$PayloadEvidence = Join-Path $AppRoot 'src-tauri\target\translateit-r3-payload-build.json'
$ReleaseEvidence = Join-Path $AppRoot 'src-tauri\target\translateit-r3-release-build.json'
$NsisBundleDir = Join-Path $AppRoot 'src-tauri\target\release\bundle\nsis'

function Require-File([string]$Path, [string]$Label) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "$Label is missing: $Path" }
}
function Get-Sha256([string]$Path) {
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

Push-Location $AppRoot
try {
    node scripts/generate_third_party_notices.mjs --write
    if ($LASTEXITCODE -ne 0) { throw 'TranslateIT third-party notice generation failed.' }
    npm run preflight:release-payload
    if ($LASTEXITCODE -ne 0) { throw 'TranslateIT release payload preflight failed.' }

    Require-File $ReleasePython 'Staged private PythonRuntime'
    Require-File $Optimizer 'Release payload optimizer'
    Require-File $PayloadBuilder 'R3 external payload builder'
    Require-File $HookTemplate 'R3 NSIS hook template'
    Require-File $InstallerHelper 'R3 installer helper'

    & $ReleasePython -s $Optimizer --backend-root $BackendRoot
    if ($LASTEXITCODE -ne 0) { throw 'TranslateIT release payload optimization failed.' }

    node scripts/generate_third_party_notices.mjs --write
    if ($LASTEXITCODE -ne 0) { throw 'TranslateIT optimized third-party notice generation failed.' }
    npm run preflight:release-payload
    if ($LASTEXITCODE -ne 0) { throw 'TranslateIT optimized release payload validation failed.' }
    npm run preflight:tauri-package
    if ($LASTEXITCODE -ne 0) { throw 'TranslateIT R3 package source contract failed.' }

    Remove-Item -LiteralPath $ReleaseDir -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null
    Remove-Item -LiteralPath $GeneratedHook,$PayloadEvidence,$ReleaseEvidence -Force -ErrorAction SilentlyContinue

    & $ReleasePython -s $PayloadBuilder `
        --repo-root $RepoRoot `
        --output $PayloadPath `
        --hook-template $HookTemplate `
        --installer-helper $InstallerHelper `
        --generated-hook $GeneratedHook `
        --evidence $PayloadEvidence
    if ($LASTEXITCODE -ne 0) { throw 'TranslateIT R3 external payload build failed.' }
    Require-File $PayloadPath 'TranslateIT external payload'
    Require-File $GeneratedHook 'Generated R3 NSIS hook'
    Require-File $PayloadEvidence 'R3 payload build evidence'

    $TauriCli = Join-Path $AppRoot 'node_modules\.bin\tauri.cmd'
    Require-File $TauriCli 'Local @tauri-apps/cli from package-lock.json'
    $BuildStartUtc = [DateTime]::UtcNow
    & $TauriCli build --config src-tauri/tauri.release.conf.json
    if ($LASTEXITCODE -ne 0) { throw 'TranslateIT Tauri/NSIS release build failed.' }

    if (-not (Test-Path -LiteralPath $NsisBundleDir -PathType Container)) {
        throw "Tauri NSIS output directory is missing: $NsisBundleDir"
    }
    $Candidates = @(
        Get-ChildItem -LiteralPath $NsisBundleDir -Filter '*.exe' -File |
            Where-Object { $_.LastWriteTimeUtc -ge $BuildStartUtc.AddSeconds(-2) } |
            Sort-Object LastWriteTimeUtc -Descending
    )
    if ($Candidates.Count -ne 1) {
        $names = ($Candidates | ForEach-Object Name) -join ', '
        throw "Expected exactly one new Tauri NSIS installer, found $($Candidates.Count): $names"
    }
    Copy-Item -LiteralPath $Candidates[0].FullName -Destination $SetupPath -Force
    Require-File $SetupPath 'TranslateIT-Setup.exe'

    $ExpectedNames = @('TranslateIT-Payload.7z','TranslateIT-Setup.exe')
    $ActualNames = @((Get-ChildItem -LiteralPath $ReleaseDir -File | Sort-Object Name | ForEach-Object Name))
    if (($ActualNames -join '|') -ne ($ExpectedNames -join '|')) {
        throw "R3 release directory must contain exactly Setup + Payload. Found: $($ActualNames -join ', ')"
    }

    $payloadBuild = Get-Content -LiteralPath $PayloadEvidence -Raw | ConvertFrom-Json
    $payloadHash = Get-Sha256 $PayloadPath
    if ($payloadHash -ne [string]$payloadBuild.payload_sha256) {
        throw 'Release payload SHA-256 changed after trusted hook generation.'
    }
    $releaseBuild = [ordered]@{
        schema = 'translateit.r3.release_pair.v1'
        app_version = [string]$payloadBuild.app_version
        payload_schema = [string]$payloadBuild.schema
        setup_file = 'TranslateIT-Setup.exe'
        setup_sha256 = Get-Sha256 $SetupPath
        payload_file = 'TranslateIT-Payload.7z'
        payload_sha256 = $payloadHash
        payload_expanded_bytes = [Int64]$payloadBuild.expanded_bytes
        user_facing_file_count = 2
        installer_mode = 'perMachine'
        offline = $true
        target_pc_acceptance = 'deferred'
    }
    $releaseBuild | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $ReleaseEvidence -Encoding utf8

    Write-Host '[release] R3 offline release pair ready:'
    Write-Host "[release]   $SetupPath"
    Write-Host "[release]   $PayloadPath"
    Write-Host "[release] Build evidence: $ReleaseEvidence"
}
finally {
    # Generated hook embeds the exact payload hash and a build-machine source path.
    Remove-Item -LiteralPath $GeneratedHook -Force -ErrorAction SilentlyContinue
    Pop-Location
}
