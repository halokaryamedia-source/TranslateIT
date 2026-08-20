param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Verify', 'Extract')]
    [string]$Mode,

    [Parameter(Mandatory = $true)]
    [string]$PayloadPath,

    [Parameter(Mandatory = $true)]
    [string]$ExpectedSha256,

    [string]$InstallRoot
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$MiLMMTRevision = '4fc480b6c58dec29c159dcdf9fde0f6d5c354995'
$AsrRevision = '0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf'
$GptSoVitsRevision = 'd523079fc05d9a8028d6085bffe4a2757c32abb6'

function Fail([int]$Code, [string]$Message) {
    [Console]::Error.WriteLine("[translateit-r3-installer] $Message")
    exit $Code
}

function Require-File([string]$Path, [int]$Code, [string]$Label) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        Fail $Code "$Label is missing: $Path"
    }
}

function Require-Marker([string]$Path, [string]$Expected, [int]$Code, [string]$Label) {
    Require-File $Path $Code $Label
    $actual = (Get-Content -LiteralPath $Path -Raw).Trim()
    if ($actual -ne $Expected) {
        Fail $Code "$Label mismatch: expected $Expected, got $actual"
    }
}

try {
    $PayloadPath = [IO.Path]::GetFullPath($PayloadPath)
    Require-File $PayloadPath 41 'TranslateIT external payload'

    $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $PayloadPath).Hash.ToLowerInvariant()
    if ($actualHash -ne $ExpectedSha256.ToLowerInvariant()) {
        Fail 42 "TranslateIT external payload SHA-256 mismatch. Expected $ExpectedSha256, got $actualHash"
    }

    $tar = (Get-Command tar.exe -ErrorAction Stop).Source

    if ($Mode -eq 'Verify') {
        & $tar -tf $PayloadPath | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Fail 43 "TranslateIT external payload could not be read as a valid 7z archive."
        }
        exit 0
    }

    if ([string]::IsNullOrWhiteSpace($InstallRoot)) {
        Fail 44 'InstallRoot is required for payload extraction.'
    }
    $InstallRoot = [IO.Path]::GetFullPath($InstallRoot)
    New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null

    & $tar -xf $PayloadPath -C $InstallRoot
    if ($LASTEXITCODE -ne 0) {
        Fail 45 "TranslateIT external payload extraction failed with tar exit code $LASTEXITCODE."
    }

    $backend = Join-Path $InstallRoot 'EngineData\Backend'
    Require-File (Join-Path $backend 'LocalWorker\PythonRuntime\python.exe') 46 'Packaged Python runtime'
    Require-Marker (
        Join-Path $backend 'RuntimeAssets\ASR\ModelData\faster-whisper-large-v3-turbo\.translateit_model_revision'
    ) $AsrRevision 47 'ASR revision marker'
    Require-Marker (
        Join-Path $backend 'RuntimeAssets\Translation\ModelData\xiaomi-research--MiLMMT-46-1B-v1.0\.translateit_model_revision'
    ) $MiLMMTRevision 48 'MiLMMT revision marker'
    Require-Marker (
        Join-Path $backend 'RuntimeAssets\Voice\GPTSoVITS\Source\TRANSLATEIT_GPTSOVITS_REVISION.txt'
    ) $GptSoVitsRevision 49 'GPT-SoVITS source revision marker'
    Require-File (
        Join-Path $backend 'RuntimeAssets\AudioProvider\VBCABLE\Package\VBCABLE_Setup_x64.exe'
    ) 50 'VB-CABLE provider package'

    exit 0
}
catch {
    [Console]::Error.WriteLine("[translateit-r3-installer] $($_.Exception.Message)")
    exit 60
}
