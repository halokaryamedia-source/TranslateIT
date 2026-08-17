$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$Backend = Join-Path $RepoRoot 'EngineData\Backend'
$Worker = Join-Path $Backend 'LocalWorker\WorkerRuntime'
$PythonRoot = Join-Path $Backend 'LocalWorker\PythonRuntime'
$Assets = Join-Path $Backend 'RuntimeAssets'
$AsrRoot = Join-Path $Assets 'ASR\ModelData'
$TranslationRoot = Join-Path $Assets 'Translation\ModelData'
$VoiceSource = Join-Path $Assets 'Voice\GPTSoVITS\Source'
$VbPackage = Join-Path $Assets 'AudioProvider\VBCABLE\Package'
$TempBase = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { Join-Path $RepoRoot '.translateit-release-temp' }
$Temp = Join-Path $TempBase 'translateit-release-stage'

function Get-Sha256([string]$Path) {
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

function Assert-Hash([string]$Path, [string]$Expected, [string]$Label) {
    $actual = Get-Sha256 $Path
    if ($actual -ne $Expected.ToLowerInvariant()) { throw "$Label SHA-256 mismatch: $actual" }
    Write-Host "[release-stage][hash] $Label=$actual"
}

function Invoke-Download([string]$Url, [string]$Path) {
    Write-Host "[release-stage][download] $Url"
    Invoke-WebRequest -Uri $Url -OutFile $Path
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "Download missing: $Url" }
}

function Copy-Tree([string]$Source, [string]$Destination) {
    New-Item -ItemType Directory -Force -Path $Destination | Out-Null
    & robocopy $Source $Destination /E /NFL /NDL /NJH /NJS /NP | Out-Null
    $code = $LASTEXITCODE
    if ($code -gt 7) { throw "robocopy failed ($code): $Source -> $Destination" }
}

Remove-Item -LiteralPath $Temp -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $Temp | Out-Null
foreach ($path in @($PythonRoot, $AsrRoot, $TranslationRoot, $VoiceSource, $VbPackage)) {
    Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path $path | Out-Null
}

Write-Host '[release-stage] Stage CPython 3.12.10 embeddable runtime'
$pythonZip = Join-Path $Temp 'python-3.12.10-embed-amd64.zip'
Invoke-Download 'https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip' $pythonZip
$pythonBytes = (Get-Item -LiteralPath $pythonZip).Length
if ($pythonBytes -ne 11133606) { throw "CPython archive byte count mismatch: $pythonBytes" }
$pythonMd5 = (Get-FileHash -Algorithm MD5 -LiteralPath $pythonZip).Hash.ToLowerInvariant()
if ($pythonMd5 -ne 'fe8ef205f2e9c3ba44d0cf9954e1abd3') { throw "CPython official MD5 mismatch: $pythonMd5" }
$pythonSha = Get-Sha256 $pythonZip
if ($pythonSha -ne '4acbed6dd1c744b0376e3b1cf57ce906f9dc9e95e68824584c8099a63025a3c3') { throw "CPython SHA-256 mismatch: $pythonSha" }
Expand-Archive -LiteralPath $pythonZip -DestinationPath $PythonRoot -Force
@('python312.zip', '.', '..\WorkerRuntime') | Set-Content -LiteralPath (Join-Path $PythonRoot 'python312._pth') -Encoding ascii
& (Join-Path $PythonRoot 'python.exe') --version
if ($LASTEXITCODE -ne 0) { throw 'Embedded CPython did not start.' }
@"
source_kind=cpython-embeddable
release=3.12.10
source_url=https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip
archive_bytes=$pythonBytes
archive_md5=$pythonMd5
archive_sha256=$pythonSha
"@ | Set-Content -LiteralPath (Join-Path $PythonRoot 'PYTHON_SOURCE.txt') -Encoding ascii

Write-Host '[release-stage] Build frozen WorkerRuntime dependency environment'
$hostPython = (Get-Command python).Source
& $hostPython -m pip install --disable-pip-version-check uv==0.12.0 huggingface-hub==0.36.2 hf-xet==1.6.0
if ($LASTEXITCODE -ne 0) { throw 'Pinned release staging tools failed to install.' }
Push-Location $Worker
try {
    uv sync --frozen --no-dev --python $hostPython
    if ($LASTEXITCODE -ne 0) { throw 'uv sync failed.' }
} finally { Pop-Location }
$sitePackages = Join-Path $Worker '.venv\Lib\site-packages'
if (-not (Test-Path -LiteralPath $sitePackages -PathType Container)) { throw 'Frozen WorkerRuntime site-packages missing.' }
Copy-Tree $sitePackages $PythonRoot
$privatePython = Join-Path $PythonRoot 'python.exe'
& $privatePython -s -c "import torch, torchaudio, transformers, ctranslate2, faster_whisper, sentencepiece, soundfile, numpy, voice_lab_gpt_sovits; print('[release-stage][python] private imports PASS', torch.__version__, transformers.__version__)"
if ($LASTEXITCODE -ne 0) { throw 'Private Python runtime import smoke failed.' }

Write-Host '[release-stage] Download exact Hugging Face release snapshots'
$env:HF_HUB_DISABLE_TELEMETRY = '1'
$env:HF_HOME = Join-Path $Temp 'hf-home'
$env:HF_HUB_CACHE = Join-Path $Temp 'hf-cache'
$env:HF_XET_CACHE = Join-Path $Temp 'hf-xet'
$env:ASR_OUT = Join-Path $AsrRoot 'faster-whisper-large-v3-turbo'
$env:IDEN_OUT = Join-Path $TranslationRoot 'marianmt-id-en'
$env:ENID_OUT = Join-Path $TranslationRoot 'marianmt-en-id'
$env:GPT_ASSET_OUT = Join-Path $Temp 'gpt-assets'
$downloadScript = Join-Path $Temp 'download-hf.py'
@'
import os
import shutil
from huggingface_hub import snapshot_download

jobs = [
    ('dropbox-dash/faster-whisper-large-v3-turbo', '0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf', os.environ['ASR_OUT'], None),
    ('Helsinki-NLP/opus-mt-id-en', '9a7f1b0d0dfe0a92ba691030b01d6f23f966e7ec', os.environ['IDEN_OUT'], None),
    ('Helsinki-NLP/opus-mt-en-id', '6e4c52d61a6b16fe3509b0267cbfec65011b860b', os.environ['ENID_OUT'], None),
    ('lj1995/GPT-SoVITS', '336b2ec4e8d4ac74740798dd40af44e74659ecaf', os.environ['GPT_ASSET_OUT'], [
        's1v3.ckpt', 'sv/pretrained_eres2netv2w24s4ep4.ckpt',
        'v2Pro/s2Dv2ProPlus.pth', 'v2Pro/s2Gv2ProPlus.pth',
        'chinese-hubert-base/**', 'chinese-roberta-wwm-ext-large/**'
    ]),
]
for repo, revision, out, patterns in jobs:
    print(f'[release-stage][hf] {repo}@{revision} -> {out}', flush=True)
    snapshot_download(repo_id=repo, revision=revision, local_dir=out, allow_patterns=patterns)
    cache = os.path.join(out, '.cache')
    if os.path.isdir(cache):
        shutil.rmtree(cache)
print('[release-stage][hf] snapshots PASS')
'@ | Set-Content -LiteralPath $downloadScript -Encoding utf8NoBOM
& $hostPython $downloadScript
if ($LASTEXITCODE -ne 0) { throw 'Hugging Face snapshot staging failed.' }

Write-Host '[release-stage] Stage pinned GPT-SoVITS source revision'
$gptSourceZip = Join-Path $Temp 'gpt-sovits-source.zip'
Invoke-Download 'https://github.com/RVC-Boss/GPT-SoVITS/archive/d523079fc05d9a8028d6085bffe4a2757c32abb6.zip' $gptSourceZip
$gptExtract = Join-Path $Temp 'gpt-source-extract'
Expand-Archive -LiteralPath $gptSourceZip -DestinationPath $gptExtract -Force
$gptRoot = Get-ChildItem -LiteralPath $gptExtract -Directory | Select-Object -First 1
if (-not $gptRoot) { throw 'GPT-SoVITS source archive root missing.' }
Copy-Tree $gptRoot.FullName $VoiceSource
'd523079fc05d9a8028d6085bffe4a2757c32abb6' | Set-Content -LiteralPath (Join-Path $VoiceSource 'TRANSLATEIT_GPTSOVITS_REVISION.txt') -Encoding ascii
foreach ($relative in @('webui.py', 'api.py', 'api_v2.py', 'GPT_SoVITS\inference_webui.py', 'tools\asr', 'tools\uvr5', 'tools\subfix_webui.py')) {
    Remove-Item -LiteralPath (Join-Path $VoiceSource $relative) -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host '[release-stage] Stage pinned GPT-SoVITS pretrained assets'
$assetRoot = $env:GPT_ASSET_OUT
$pretrained = Join-Path $VoiceSource 'GPT_SoVITS\pretrained_models'
New-Item -ItemType Directory -Force -Path $pretrained, (Join-Path $pretrained 'sv'), (Join-Path $pretrained 'v2Pro') | Out-Null
Copy-Item -LiteralPath (Join-Path $assetRoot 's1v3.ckpt') -Destination (Join-Path $pretrained 's1v3.ckpt') -Force
Copy-Item -LiteralPath (Join-Path $assetRoot 'sv\pretrained_eres2netv2w24s4ep4.ckpt') -Destination (Join-Path $pretrained 'sv\pretrained_eres2netv2w24s4ep4.ckpt') -Force
Copy-Item -LiteralPath (Join-Path $assetRoot 'v2Pro\s2Dv2ProPlus.pth') -Destination (Join-Path $pretrained 'v2Pro\s2Dv2ProPlus.pth') -Force
Copy-Item -LiteralPath (Join-Path $assetRoot 'v2Pro\s2Gv2ProPlus.pth') -Destination (Join-Path $pretrained 'v2Pro\s2Gv2ProPlus.pth') -Force
Copy-Tree (Join-Path $assetRoot 'chinese-hubert-base') (Join-Path $pretrained 'chinese-hubert-base')
Copy-Tree (Join-Path $assetRoot 'chinese-roberta-wwm-ext-large') (Join-Path $pretrained 'chinese-roberta-wwm-ext-large')
Assert-Hash (Join-Path $pretrained 's1v3.ckpt') '87133414860ea14ff6620c483a3db5ed07b44be42e2c3fcdad65523a729a745a' 's1v3.ckpt'
Assert-Hash (Join-Path $pretrained 'sv\pretrained_eres2netv2w24s4ep4.ckpt') '4f5a0bf73c61eb41b174e1bb54e7ee3c83233892be8e0af1f187024e8e581a35' 'speaker model'
Assert-Hash (Join-Path $pretrained 'v2Pro\s2Dv2ProPlus.pth') '635cd84bf6f7f9b8d41c88c7106f81d782c794c61f931845214ea037b0c5bef2' 's2Dv2ProPlus.pth'
Assert-Hash (Join-Path $pretrained 'v2Pro\s2Gv2ProPlus.pth') 'd42a22bbbf65fb2bbdd45ad6a66841156977db45c7aabe0a6992ff378d9c7d3b' 's2Gv2ProPlus.pth'

Write-Host '[release-stage] Stage exact NLTK data snapshot'
$nltkRevision = '550b6625bcef1f2abff2ff770a5a0d272c9c6b2a'
$nltkRoot = Join-Path $VoiceSource 'nltk_data'
New-Item -ItemType Directory -Force -Path (Join-Path $nltkRoot 'corpora'), (Join-Path $nltkRoot 'taggers') | Out-Null
$nltkPackages = @(
    @('corpora', 'cmudict', 'd07cca47fd72ad32ea9d8ad1219f85301eeaf4568f8b6b73747506a71fb5afd6'),
    @('taggers', 'averaged_perceptron_tagger', 'e1f13cf2532daadfd6f3bc481a49859f0b8ea6432ccdcd83e6a49a5f19008de9'),
    @('taggers', 'averaged_perceptron_tagger_eng', '6025f530624335c67d6547d44757b357b4e79bae030a0383e9887a92c1718f0b')
)
$nltkRecords = @()
foreach ($item in $nltkPackages) {
    $category = $item[0]; $name = $item[1]; $expected = $item[2]
    $zip = Join-Path $Temp "$name.zip"
    $url = "https://raw.githubusercontent.com/nltk/nltk_data/$nltkRevision/packages/$category/$name.zip"
    Invoke-Download $url $zip
    Assert-Hash $zip $expected "NLTK $category/$name.zip"
    $nltkRecords += "$category/$name.zip sha256=$expected"
    Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $nltkRoot $category) -Force
}
@('source_kind=nltk_data', 'repository=nltk/nltk_data', "revision=$nltkRevision") + $nltkRecords | Set-Content -LiteralPath (Join-Path $VoiceSource 'NLTK_DATA_SOURCE.txt') -Encoding ascii

Write-Host '[release-stage] Stage pinned FFmpeg LGPL executable and source companions'
$ffmpegArchive = Join-Path $Temp 'ffmpeg.zip'
Invoke-Download 'https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2026-08-10-13-17/ffmpeg-n8.1.2-34-g9b6c8969e0-win64-lgpl-8.1.zip' $ffmpegArchive
Assert-Hash $ffmpegArchive 'b0531e470d73bf2e0d3e22a3a35f6e890781e0791c496950664da9be9ea8c0ab' 'FFmpeg archive'
$ffmpegExtract = Join-Path $Temp 'ffmpeg-extract'
Expand-Archive -LiteralPath $ffmpegArchive -DestinationPath $ffmpegExtract -Force
$ffmpegExe = Get-ChildItem -LiteralPath $ffmpegExtract -Recurse -File -Filter 'ffmpeg.exe' | Select-Object -First 1
$ffmpegLicense = Get-ChildItem -LiteralPath $ffmpegExtract -Recurse -File -Filter 'LICENSE.txt' | Select-Object -First 1
if (-not $ffmpegExe -or -not $ffmpegLicense) { throw 'Pinned FFmpeg archive layout incomplete.' }
Assert-Hash $ffmpegExe.FullName 'ad62137371b2111d52d29c9bc82d5aecf7065c8f937e95dfed087b2bc63ea88d' 'ffmpeg.exe'
Assert-Hash $ffmpegLicense.FullName 'da7eabb7bafdf7d3ae5e9f223aa5bdc1eece45ac569dc21b3b037520b4464768' 'FFmpeg LICENSE.txt'
Copy-Item -LiteralPath $ffmpegExe.FullName -Destination (Join-Path $VoiceSource 'ffmpeg.exe') -Force
Copy-Item -LiteralPath $ffmpegLicense.FullName -Destination (Join-Path $VoiceSource 'FFMPEG_LICENSE.txt') -Force
@'
source_kind=ffmpeg
binary_builder=BtbN/FFmpeg-Builds
builder_release_tag=autobuild-2026-08-10-13-17
builder_commit=2437e7b868da3c11872367b15f3c613b87c24819
archive=ffmpeg-n8.1.2-34-g9b6c8969e0-win64-lgpl-8.1.zip
archive_sha256=b0531e470d73bf2e0d3e22a3a35f6e890781e0791c496950664da9be9ea8c0ab
ffmpeg_version=n8.1.2-34-g9b6c8969e0-20260810
ffmpeg_source_commit=9b6c8969e05b4f0b29f0f85cd501be6b3e582e6b
ffmpeg_exe_sha256=ad62137371b2111d52d29c9bc82d5aecf7065c8f937e95dfed087b2bc63ea88d
license_profile=LGPL-3.0-or-later
build_profile=win64-lgpl-static
'@ | Set-Content -LiteralPath (Join-Path $VoiceSource 'FFMPEG_SOURCE.txt') -Encoding ascii

Write-Host '[release-stage] Stage exact official VB-CABLE Pack45'
$vbArchive = Join-Path $Temp 'VBCABLE_Driver_Pack45.zip'
Invoke-Download 'https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack45.zip' $vbArchive
Assert-Hash $vbArchive 'b950e39f01af1d04ea623c8f6d8eb9b6ea5c477c637295fabf20631c85116bfb' 'VB-CABLE Pack45 archive'
Remove-Item -LiteralPath $VbPackage -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $VbPackage | Out-Null
Expand-Archive -LiteralPath $vbArchive -DestinationPath $VbPackage -Force
if ((Get-ChildItem -LiteralPath $VbPackage -File).Count -ne 31) { throw 'VB-CABLE Pack45 extraction count mismatch.' }
foreach ($exeName in @('VBCABLE_Setup.exe', 'VBCABLE_Setup_x64.exe')) {
    $sig = Get-AuthenticodeSignature -LiteralPath (Join-Path $VbPackage $exeName)
    if ($sig.Status -ne 'Valid' -or $sig.SignerCertificate.Subject -notmatch 'BUREL VINCENT') { throw "VB-CABLE Authenticode invalid: $exeName" }
}

Write-Host '[release-stage] Remove transient download metadata from staged runtime'
Get-ChildItem -LiteralPath $Assets -Directory -Recurse -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq '.cache' } | Sort-Object FullName -Descending | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Write-Host '[release-stage] Static VoiceLab source-asset preflight through private Python'
$env:SOURCE_ROOT = $VoiceSource
& $privatePython -s -c "from pathlib import Path; import os; import voice_lab_gpt_sovits as v; a=v.source_assets(Path(os.environ['SOURCE_ROOT'])); print('[release-stage][voice] source assets PASS', sorted(a.keys()))"
if ($LASTEXITCODE -ne 0) { throw 'VoiceLab staged source asset validation failed.' }

Write-Host '[release-stage] Controlled input sizes'
foreach ($pair in @(
    @('PythonRuntime', $PythonRoot),
    @('ASR', $AsrRoot),
    @('Translation', $TranslationRoot),
    @('Voice', $VoiceSource),
    @('VB-CABLE', $VbPackage)
)) {
    $bytes = (Get-ChildItem -LiteralPath $pair[1] -File -Recurse | Measure-Object -Property Length -Sum).Sum
    Write-Host "[release-stage][size] $($pair[0]) bytes=$bytes"
}

Write-Host '[release-stage] controlled release input staging -> PASS'
