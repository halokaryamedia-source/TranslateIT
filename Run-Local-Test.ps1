param(
    [switch]$AllowCpuFallback,
    [switch]$NoLaunchApp,
    [ValidateRange(30, 600)]
    [int]$WorkerTimeoutSeconds = 300
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ($env:OS -ne "Windows_NT") {
    throw "TranslateIT local acceptance must run on Windows."
}

$RepoRoot = $PSScriptRoot
$AppRoot = Join-Path $RepoRoot "EngineData\Frontend\RustApp"
$ScriptsRoot = Join-Path $AppRoot "scripts"
$Runner = Join-Path $ScriptsRoot "run_local_test.ps1"
$StageInputs = Join-Path $ScriptsRoot "stage_release_inputs.ps1"
$StageLicenses = Join-Path $ScriptsRoot "stage_release_license_material.py"
$TauriCli = Join-Path $AppRoot "node_modules\.bin\tauri.cmd"
$PythonRoot = Join-Path $RepoRoot "EngineData\Backend\LocalWorker\PythonRuntime"
$AsrMarker = Join-Path $RepoRoot "EngineData\Backend\RuntimeAssets\ASR\ModelData\faster-whisper-large-v3-turbo\.translateit_model_revision"
$MilmmtMarker = Join-Path $RepoRoot "EngineData\Backend\RuntimeAssets\Translation\ModelData\xiaomi-research--MiLMMT-46-1B-v1.0\.translateit_model_revision"
$VoiceRoot = Join-Path $RepoRoot "EngineData\Backend\RuntimeAssets\Voice\GPTSoVITS\Source"
$GptMarker = Join-Path $VoiceRoot "TRANSLATEIT_GPTSOVITS_REVISION.txt"
$VbRoot = Join-Path $RepoRoot "EngineData\Backend\RuntimeAssets\AudioProvider\VBCABLE\Package"

function Need-File {
    param([string]$Path, [string]$Label)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "$Label is missing: $Path"
    }
}

function Get-CommandSource {
    param([string[]]$Names)
    foreach ($name in $Names) {
        $command = Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($null -ne $command) { return [string]$command.Source }
    }
    return ""
}

function Get-SevenZip {
    $candidates = New-Object System.Collections.Generic.List[string]
    if (-not [string]::IsNullOrWhiteSpace($env:TRANSLATEIT_7ZIP)) {
        $candidates.Add($env:TRANSLATEIT_7ZIP)
    }
    foreach ($name in @("7z.exe", "7zz.exe", "7z", "7zz")) {
        $resolved = Get-CommandSource @($name)
        if (-not [string]::IsNullOrWhiteSpace($resolved)) { $candidates.Add($resolved) }
    }
    if (-not [string]::IsNullOrWhiteSpace($env:ProgramFiles)) {
        $candidates.Add((Join-Path $env:ProgramFiles "7-Zip\7z.exe"))
    }
    if (-not [string]::IsNullOrWhiteSpace(${env:ProgramFiles(x86)})) {
        $candidates.Add((Join-Path ${env:ProgramFiles(x86)} "7-Zip\7z.exe"))
    }
    foreach ($candidate in @($candidates | Select-Object -Unique)) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return [IO.Path]::GetFullPath($candidate) }
    }
    return ""
}

function Test-VcBuildTools {
    $vswhereCandidates = @()
    if (-not [string]::IsNullOrWhiteSpace(${env:ProgramFiles(x86)})) {
        $vswhereCandidates += Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
    }
    if (-not [string]::IsNullOrWhiteSpace($env:ProgramFiles)) {
        $vswhereCandidates += Join-Path $env:ProgramFiles "Microsoft Visual Studio\Installer\vswhere.exe"
    }
    foreach ($vswhere in $vswhereCandidates) {
        if (-not (Test-Path -LiteralPath $vswhere -PathType Leaf)) { continue }
        try {
            $installation = (& $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>$null | Out-String).Trim()
            if (-not [string]::IsNullOrWhiteSpace($installation)) { return $true }
        } catch {}
    }
    foreach ($root in @(
        (Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC"),
        (Join-Path $env:ProgramFiles "Microsoft Visual Studio\2022\Community\VC\Tools\MSVC"),
        (Join-Path $env:ProgramFiles "Microsoft Visual Studio\2022\Professional\VC\Tools\MSVC"),
        (Join-Path $env:ProgramFiles "Microsoft Visual Studio\2022\Enterprise\VC\Tools\MSVC")
    )) {
        if (-not [string]::IsNullOrWhiteSpace($root) -and (Test-Path -LiteralPath $root -PathType Container)) { return $true }
    }
    return $false
}

function Resolve-HostPython {
    $python = Get-CommandSource @("python.exe", "python")
    if ([string]::IsNullOrWhiteSpace($python)) { return "" }
    try {
        $version = (& $python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')" 2>&1 | Out-String).Trim()
        if ($LASTEXITCODE -ne 0 -or $version -notmatch '^3\.12\.\d+$') { return "" }
        & $python -m pip --version *> $null
        if ($LASTEXITCODE -ne 0) { return "" }
        return $python
    } catch {
        return ""
    }
}

function Test-TextMarker {
    param([string]$Path, [string]$Expected)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $false }
    try { return (Get-Content -LiteralPath $Path -Raw).Trim() -eq $Expected } catch { return $false }
}

function Test-ReleaseInputsReady {
    if (-not (Test-Path -LiteralPath (Join-Path $PythonRoot "python.exe") -PathType Leaf)) { return $false }
    if (-not (Test-TextMarker $AsrMarker "0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf")) { return $false }
    if (-not (Test-TextMarker $MilmmtMarker "4fc480b6c58dec29c159dcdf9fde0f6d5c354995")) { return $false }
    if (-not (Test-TextMarker $GptMarker "d523079fc05d9a8028d6085bffe4a2757c32abb6")) { return $false }
    foreach ($path in @(
        (Join-Path $VoiceRoot "LICENSE"),
        (Join-Path $VoiceRoot "FFMPEG_LICENSE.txt"),
        (Join-Path $VoiceRoot "FFMPEG_SOURCE.txt"),
        (Join-Path $VbRoot "VBCABLE_Setup.exe"),
        (Join-Path $VbRoot "VBCABLE_Setup_x64.exe")
    )) {
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return $false }
    }
    $torchDist = @(Get-ChildItem -LiteralPath $PythonRoot -Directory -Filter "torch-*.dist-info" -ErrorAction SilentlyContinue)
    $transformersDist = @(Get-ChildItem -LiteralPath $PythonRoot -Directory -Filter "transformers-*.dist-info" -ErrorAction SilentlyContinue)
    return $torchDist.Count -gt 0 -and $transformersDist.Count -gt 0
}

foreach ($required in @(
    @{ path = $Runner; label = "Local acceptance runner" },
    @{ path = $StageInputs; label = "Release input staging script" },
    @{ path = $StageLicenses; label = "Release license staging script" }
)) {
    Need-File $required.path $required.label
}

Write-Host ""
Write-Host "============================================================"
Write-Host " TranslateIT - Fresh Clone Bootstrap + Local Acceptance"
Write-Host "============================================================"
Write-Host "Repository: $RepoRoot"
Write-Host ""

$node = Get-CommandSource @("node.exe", "node")
$npm = Get-CommandSource @("npm.cmd", "npm")
$hostPython = Resolve-HostPython
$cargo = Get-CommandSource @("cargo.exe", "cargo")
$rustc = Get-CommandSource @("rustc.exe", "rustc")
$sevenZip = Get-SevenZip
$vcBuildTools = Test-VcBuildTools
$missing = New-Object System.Collections.Generic.List[string]
if ([string]::IsNullOrWhiteSpace($node)) { $missing.Add("Node.js 22 / node") }
if ([string]::IsNullOrWhiteSpace($npm)) { $missing.Add("npm") }
if ([string]::IsNullOrWhiteSpace($hostPython)) { $missing.Add("host Python 3.12.x with pip") }
if ([string]::IsNullOrWhiteSpace($cargo) -or [string]::IsNullOrWhiteSpace($rustc)) { $missing.Add("Rust toolchain (rustup/cargo/rustc)") }
if ([string]::IsNullOrWhiteSpace($sevenZip)) { $missing.Add("7-Zip CLI") }
if (-not $vcBuildTools) { $missing.Add("Visual Studio 2022 C++ Build Tools") }
if ($missing.Count -gt 0) {
    throw ("Build-machine prerequisites missing:`n - " + ($missing -join "`n - ") + "`n`nInstall these build tools once, then run this same root PowerShell again. Normal installed TranslateIT users do not need these developer tools.")
}
$env:TRANSLATEIT_7ZIP = $sevenZip
$pythonScripts = Join-Path (Split-Path $hostPython -Parent) "Scripts"
if (Test-Path -LiteralPath $pythonScripts -PathType Container) {
    $env:PATH = "$pythonScripts;$env:PATH"
}

Write-Host "[bootstrap] node     = $node"
Write-Host "[bootstrap] npm      = $npm"
Write-Host "[bootstrap] python   = $hostPython"
Write-Host "[bootstrap] cargo    = $cargo"
Write-Host "[bootstrap] 7-Zip    = $sevenZip"
Write-Host "[bootstrap] VC tools = detected"

if (-not (Test-Path -LiteralPath $TauriCli -PathType Leaf)) {
    Write-Host ""
    Write-Host "[bootstrap] Installing locked frontend/Tauri build dependencies with npm ci..."
    Push-Location $AppRoot
    try {
        & $npm ci
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed with exit code $LASTEXITCODE." }
    } finally {
        Pop-Location
    }
    Need-File $TauriCli "Local locked Tauri CLI"
} else {
    Write-Host "[bootstrap] frontend/Tauri dependencies already present."
}

if (-not (Test-ReleaseInputsReady)) {
    Write-Host ""
    Write-Host "[bootstrap] Release runtime inputs are missing or incomplete."
    Write-Host "[bootstrap] Staging private Python, dependencies, ASR, MiLMMT, GPT-SoVITS, FFmpeg, and VB-CABLE."
    Write-Host "[bootstrap] This first preparation downloads several GB and can take a while."
    & powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File $StageInputs
    if ($LASTEXITCODE -ne 0) { throw "Release input staging failed with exit code $LASTEXITCODE." }
    if (-not (Test-ReleaseInputsReady)) { throw "Release input staging completed but the required runtime boundary is still incomplete." }
} else {
    Write-Host "[bootstrap] release runtime inputs already staged."
}

Write-Host ""
Write-Host "[bootstrap] Staging reviewed exceptional license material..."
& $hostPython $StageLicenses
if ($LASTEXITCODE -ne 0) { throw "Release license material staging failed with exit code $LASTEXITCODE." }

Write-Host ""
Write-Host "[bootstrap] Bootstrap complete. Starting build/install/target-PC acceptance..."
$args = @("-WorkerTimeoutSeconds", [string]$WorkerTimeoutSeconds)
if ($AllowCpuFallback) { $args += "-AllowCpuFallback" }
if ($NoLaunchApp) { $args += "-NoLaunchApp" }

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File $Runner @args
exit $LASTEXITCODE
