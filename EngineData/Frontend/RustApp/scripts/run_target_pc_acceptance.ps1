param(
    [ValidateSet("PreInstall", "InstalledRuntime")]
    [string]$Phase = "PreInstall",
    [string]$ReleaseDir = "",
    [string]$InstallRoot = "",
    [string]$OutputPath = "",
    [switch]$AllowCpuFallback,
    [ValidateRange(30, 600)]
    [int]$WorkerTimeoutSeconds = 300
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$AppRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($ReleaseDir)) {
    $ReleaseDir = Join-Path $AppRoot "src-tauri\target\translateit-release"
}
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $suffix = if ($Phase -eq "PreInstall") { "preinstall" } else { "installed-runtime" }
    $OutputPath = Join-Path $AppRoot "src-tauri\target\translateit-target-pc-$suffix.json"
}

$Checks = New-Object System.Collections.Generic.List[object]
$Runtime = [ordered]@{}
$ManualRemaining = New-Object System.Collections.Generic.List[string]

function Add-Check {
    param(
        [string]$Name,
        [bool]$Passed,
        [string]$Detail,
        [bool]$Required = $true
    )
    $Checks.Add([ordered]@{
        name = $Name
        passed = $Passed
        required = $Required
        detail = $Detail
    })
}

function Get-Value {
    param($Object, [string]$Name, $Default = "")
    if ($null -eq $Object) { return $Default }
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) { return $Default }
    return $property.Value
}

function Get-Sha256 {
    param([string]$Path)
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

function Read-JsonFile {
    param([string]$Path)
    return (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -ErrorAction Stop)
}

function Write-Evidence {
    $failedRequired = @($Checks | Where-Object { $_.required -and -not $_.passed })
    $status = if ($failedRequired.Count -eq 0) { "pass" } else { "fail" }
    $result = [ordered]@{
        schema = "translateit.target_pc_acceptance.v1"
        created_at = (Get-Date).ToUniversalTime().ToString("o")
        phase = $Phase
        status = $status
        allow_cpu_fallback = [bool]$AllowCpuFallback
        release_dir = $ReleaseDir
        install_root = $InstallRoot
        checks = $Checks
        runtime = $Runtime
        manual_remaining = $ManualRemaining
        note = "This harness verifies only claims exercised on this Windows PC. UAC/driver consent UX, physical microphone capture, My Voice quality, Meeting-app reception, uninstall/reinstall, and clean-machine acceptance remain manual unless separately observed."
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $OutputPath -Parent) | Out-Null
    $result | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $OutputPath -Encoding UTF8
    $result | ConvertTo-Json -Depth 20
    Write-Host "[target-pc] Evidence: $OutputPath"
    if ($status -ne "pass") { exit 1 }
    exit 0
}

function Resolve-InstalledRoot {
    param([string]$ExplicitRoot)

    if (-not [string]::IsNullOrWhiteSpace($ExplicitRoot)) {
        if (Test-Path -LiteralPath $ExplicitRoot -PathType Container) {
            return [IO.Path]::GetFullPath($ExplicitRoot)
        }
        return ""
    }

    $candidates = New-Object System.Collections.Generic.List[string]
    foreach ($registryPath in @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )) {
        try {
            Get-ItemProperty $registryPath -ErrorAction SilentlyContinue |
                Where-Object { [string]$_.DisplayName -eq "TranslateIT" } |
                ForEach-Object {
                    $location = [string]$_.InstallLocation
                    if (-not [string]::IsNullOrWhiteSpace($location)) {
                        $candidates.Add($location.Trim('"'))
                    }
                }
        } catch {}
    }

    if (-not [string]::IsNullOrWhiteSpace($env:ProgramFiles)) {
        $candidates.Add((Join-Path $env:ProgramFiles "TranslateIT"))
    }
    if (-not [string]::IsNullOrWhiteSpace(${env:ProgramFiles(x86)})) {
        $candidates.Add((Join-Path ${env:ProgramFiles(x86)} "TranslateIT"))
    }

    foreach ($candidate in @($candidates | Select-Object -Unique)) {
        if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
        $manifest = Join-Path $candidate "EngineData\Backend\TRANSLATEIT_INSTALLED_RUNTIME.json"
        $exe = Join-Path $candidate "TranslateIT.exe"
        if ((Test-Path -LiteralPath $manifest -PathType Leaf) -or (Test-Path -LiteralPath $exe -PathType Leaf)) {
            return [IO.Path]::GetFullPath($candidate)
        }
    }
    return ""
}

function Get-VBCableEvidence {
    $names = New-Object System.Collections.Generic.List[string]
    $present = $false
    $pnputil = Join-Path $env:SystemRoot "System32\pnputil.exe"
    if (Test-Path -LiteralPath $pnputil -PathType Leaf) {
        try {
            $driverText = (& $pnputil /enum-drivers 2>&1 | Out-String)
            if ($driverText -match "(?i)vbmmecable|vb-audio.+virtual cable") {
                $present = $true
                $names.Add("VB-Audio driver package")
            }
        } catch {}
    }
    try {
        Get-CimInstance -ClassName Win32_SoundDevice -ErrorAction Stop |
            Where-Object { [string]$_.Name -match "(?i)VB-Audio.*(?:CABLE|Virtual Cable)|^CABLE (?:Input|Output)" } |
            ForEach-Object {
                $present = $true
                $names.Add([string]$_.Name)
            }
    } catch {}
    return [ordered]@{
        present = $present
        devices = @($names | Select-Object -Unique)
    }
}

function Invoke-WorkerJson {
    param(
        [System.Diagnostics.Process]$Process,
        [hashtable]$Payload,
        [int]$TimeoutSeconds
    )
    if ($Process.HasExited) {
        throw "Installed worker exited before $($Payload.command)."
    }
    $Process.StandardInput.WriteLine(($Payload | ConvertTo-Json -Compress -Depth 12))
    $read = $Process.StandardOutput.ReadLineAsync()
    if (-not $read.Wait($TimeoutSeconds * 1000)) {
        try { $Process.Kill() } catch {}
        throw "Installed worker timed out for $($Payload.command)."
    }
    if ([string]::IsNullOrWhiteSpace($read.Result)) {
        throw "Installed worker returned no JSON for $($Payload.command)."
    }
    return $read.Result | ConvertFrom-Json -ErrorAction Stop
}

function Worker-Summary {
    param($Response)
    if ($null -eq $Response) { return $null }
    return [ordered]@{
        ok = [bool](Get-Value $Response "ok" $false)
        stage = [string](Get-Value $Response "stage" "")
        model_id = [string](Get-Value $Response "model_id" "")
        model_revision = [string](Get-Value $Response "model_revision" "")
        direction_pair = [string](Get-Value $Response "direction_pair" "")
        translation_contract = [string](Get-Value $Response "translation_contract" "")
        device = [string](Get-Value $Response "device" "")
        precision = [string](Get-Value $Response "precision" "")
        compute_type = [string](Get-Value $Response "compute_type" "")
        complete = Get-Value $Response "complete" $null
        finished_with_eos = Get-Value $Response "finished_with_eos" $null
        elapsed_ms = Get-Value $Response "elapsed_ms" $null
        blocker = [string](Get-Value $Response "blocker" "")
        note = [string](Get-Value $Response "note" "")
    }
}

function Translation-Passed {
    param($Response, [string]$Direction)
    return $null -ne $Response `
        -and [bool](Get-Value $Response "ok" $false) `
        -and [string](Get-Value $Response "stage" "") -eq "translate" `
        -and [string](Get-Value $Response "translation_contract" "") -eq "canonical_bidirectional_id_en" `
        -and [string](Get-Value $Response "direction_pair" "") -eq $Direction `
        -and [bool](Get-Value $Response "complete" $false) `
        -and [bool](Get-Value $Response "finished_with_eos" $false) `
        -and -not [string]::IsNullOrWhiteSpace([string](Get-Value $Response "translated_text" ""))
}

if ($Phase -eq "PreInstall") {
    $setup = Join-Path $ReleaseDir "TranslateIT-Setup.exe"
    $payload = Join-Path $ReleaseDir "TranslateIT-Payload.7z"
    $releaseEvidence = Join-Path $AppRoot "src-tauri\target\translateit-r3-release-build.json"

    $releaseDirExists = Test-Path -LiteralPath $ReleaseDir -PathType Container
    Add-Check "release-directory" $releaseDirExists "Expected release directory: $ReleaseDir"
    if (-not $releaseDirExists) {
        $ManualRemaining.Add("Build the current Local release pair before installer acceptance.")
        Write-Evidence
    }

    $setupExists = Test-Path -LiteralPath $setup -PathType Leaf
    $payloadExists = Test-Path -LiteralPath $payload -PathType Leaf
    Add-Check "setup-present" $setupExists $setup
    Add-Check "payload-present" $payloadExists $payload

    $expectedNames = @("TranslateIT-Payload.7z", "TranslateIT-Setup.exe")
    $actualNames = @((Get-ChildItem -LiteralPath $ReleaseDir -File | Sort-Object Name | ForEach-Object Name))
    Add-Check "exactly-two-user-facing-files" (($actualNames -join "|") -eq ($expectedNames -join "|")) ("Found: " + ($actualNames -join ", "))

    $evidenceExists = Test-Path -LiteralPath $releaseEvidence -PathType Leaf
    Add-Check "release-build-evidence-present" $evidenceExists $releaseEvidence
    if ($setupExists -and $payloadExists -and $evidenceExists) {
        $build = Read-JsonFile $releaseEvidence
        $setupHash = Get-Sha256 $setup
        $payloadHash = Get-Sha256 $payload
        Add-Check "release-evidence-schema" ([string]$build.schema -eq "translateit.r3.release_pair.v1") ([string]$build.schema)
        Add-Check "installer-mode-per-machine" ([string]$build.installer_mode -eq "perMachine") ([string]$build.installer_mode)
        Add-Check "release-is-offline" ([bool]$build.offline) ("offline=" + [string]$build.offline)
        Add-Check "setup-sha256" ($setupHash -eq [string]$build.setup_sha256) $setupHash
        Add-Check "payload-sha256" ($payloadHash -eq [string]$build.payload_sha256) $payloadHash
        Add-Check "target-acceptance-not-preclaimed" ([string]$build.target_pc_acceptance -eq "deferred") ([string]$build.target_pc_acceptance)
        $Runtime.release_build = [ordered]@{
            app_version = [string]$build.app_version
            setup_sha256 = $setupHash
            payload_sha256 = $payloadHash
            payload_expanded_bytes = [Int64]$build.payload_expanded_bytes
        }
    }

    $ManualRemaining.Add("Run TranslateIT-Setup.exe manually while TranslateIT-Payload.7z stays in the same folder.")
    $ManualRemaining.Add("Observe UAC and any Windows/VB-CABLE driver consent; do not bypass or auto-click it.")
    $ManualRemaining.Add("Restart Windows if Setup requests it, then run InstalledRuntime acceptance.")
    Write-Evidence
}

$resolvedRoot = Resolve-InstalledRoot $InstallRoot
$InstallRoot = $resolvedRoot
$rootDetail = if (-not [string]::IsNullOrWhiteSpace($InstallRoot)) { $InstallRoot } else { "TranslateIT install root was not found. Pass -InstallRoot explicitly." }
Add-Check "installed-root-discovered" (-not [string]::IsNullOrWhiteSpace($InstallRoot)) $rootDetail
if ([string]::IsNullOrWhiteSpace($InstallRoot)) {
    $ManualRemaining.Add("Provide the actual TranslateIT installation directory with -InstallRoot.")
    Write-Evidence
}

$manifestPath = Join-Path $InstallRoot "EngineData\Backend\TRANSLATEIT_INSTALLED_RUNTIME.json"
$python = Join-Path $InstallRoot "EngineData\Backend\LocalWorker\PythonRuntime\python.exe"
$worker = Join-Path $InstallRoot "EngineData\Backend\LocalWorker\WorkerRuntime\realtime_local_worker.py"
$appExe = Join-Path $InstallRoot "TranslateIT.exe"
$releaseEvidence = Join-Path $AppRoot "src-tauri\target\translateit-r3-release-build.json"

foreach ($item in @(
    @{ name = "installed-app-exe"; path = $appExe },
    @{ name = "installed-runtime-manifest"; path = $manifestPath },
    @{ name = "private-python"; path = $python },
    @{ name = "installed-worker-entrypoint"; path = $worker }
)) {
    Add-Check $item.name (Test-Path -LiteralPath $item.path -PathType Leaf) $item.path
}

if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf) -or -not (Test-Path -LiteralPath $python -PathType Leaf) -or -not (Test-Path -LiteralPath $worker -PathType Leaf)) {
    $ManualRemaining.Add("Re-run the original Setup + Payload pair; do not repair Python/models manually.")
    Write-Evidence
}

$manifest = Read-JsonFile $manifestPath
Add-Check "installed-manifest-schema" ([string]$manifest.schema -eq "translateit.installed_runtime.v1") ([string]$manifest.schema)
Add-Check "installed-complete" ([bool]$manifest.installed_complete) ("installed_complete=" + [string]$manifest.installed_complete)
Add-Check "installed-python-version" ([string]$manifest.python -eq "3.12.10") ([string]$manifest.python)
Add-Check "installed-torch-version" ([string]$manifest.torch -eq "2.11.0") ([string]$manifest.torch)
Add-Check "installed-transformers-version" ([string]$manifest.transformers -eq "4.57.6") ([string]$manifest.transformers)
Add-Check "installed-tokenizers-version" ([string]$manifest.tokenizers -eq "0.22.2") ([string]$manifest.tokenizers)
Add-Check "installed-milmmt-revision" ([string]$manifest.translation_revision -eq "4fc480b6c58dec29c159dcdf9fde0f6d5c354995") ([string]$manifest.translation_revision)
Add-Check "installed-asr-revision" ([string]$manifest.asr_revision -eq "0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf") ([string]$manifest.asr_revision)
Add-Check "installed-gpt-sovits-revision" ([string]$manifest.voice_revision -eq "d523079fc05d9a8028d6085bffe4a2757c32abb6") ([string]$manifest.voice_revision)

if (Test-Path -LiteralPath $releaseEvidence -PathType Leaf) {
    $build = Read-JsonFile $releaseEvidence
    Add-Check "installed-payload-matches-local-release" ([string]$manifest.payload_sha256 -eq [string]$build.payload_sha256) ([string]$manifest.payload_sha256)
    Add-Check "installed-app-version-matches-release" ([string]$manifest.app_version -eq [string]$build.app_version) ([string]$manifest.app_version)
}

$stageAbsent = -not (Test-Path -LiteralPath (Join-Path $InstallRoot ".translateit-r3-stage"))
$backupAbsent = -not (Test-Path -LiteralPath (Join-Path $InstallRoot ".translateit-r3-backup"))
Add-Check "installer-stage-cleaned" $stageAbsent "No .translateit-r3-stage should remain."
Add-Check "installer-backup-cleaned" $backupAbsent "No .translateit-r3-backup should remain."

$vbCable = Get-VBCableEvidence
$Runtime.vb_cable = $vbCable
Add-Check "vb-cable-present" ([bool]$vbCable.present) ((@($vbCable.devices) -join ", "))

if ([bool]$manifest.vb_cable_restart_required) {
    try {
        $lastBoot = (Get-CimInstance Win32_OperatingSystem -ErrorAction Stop).LastBootUpTime.ToUniversalTime()
        $installedUtc = [DateTime]::Parse([string]$manifest.installed_utc).ToUniversalTime()
        Add-Check "restart-after-new-vb-cable" ($lastBoot -gt $installedUtc) ("last_boot=" + $lastBoot.ToString("o") + "; installed=" + $installedUtc.ToString("o"))
    } catch {
        Add-Check "restart-after-new-vb-cable" $false "Could not prove a reboot after VB-CABLE installation."
    }
} else {
    Add-Check "restart-after-new-vb-cable" $true "Installer manifest says a new VB-CABLE install did not require restart."
}

$pythonProbeCode = @'
import importlib.metadata as m
import json
import sys
import torch

def version(name):
    try:
        return m.version(name)
    except Exception:
        return "missing"

cuda = bool(torch.cuda.is_available())
bf16 = bool(torch.cuda.is_bf16_supported()) if cuda else False
name = torch.cuda.get_device_name(0) if cuda else ""
capability = list(torch.cuda.get_device_capability(0)) if cuda else []
total_memory = int(torch.cuda.get_device_properties(0).total_memory) if cuda else 0
print(json.dumps({
    "python": ".".join(map(str, sys.version_info[:3])),
    "torch": version("torch"),
    "transformers": version("transformers"),
    "tokenizers": version("tokenizers"),
    "accelerate": version("accelerate"),
    "torch_cuda_runtime": str(torch.version.cuda or ""),
    "cuda_available": cuda,
    "bf16_supported": bf16,
    "gpu_name": name,
    "gpu_capability": capability,
    "gpu_total_memory_bytes": total_memory,
}))
'@

try {
    $probeRaw = (& $python -s -c $pythonProbeCode 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { throw "Private Python probe failed: $probeRaw" }
    $probe = $probeRaw | ConvertFrom-Json -ErrorAction Stop
    $Runtime.python_gpu = $probe
    Add-Check "private-python-runtime" ([string]$probe.python -eq "3.12.10") ([string]$probe.python)
    Add-Check "private-accelerate-version" ([string]$probe.accelerate -eq "1.14.0") ([string]$probe.accelerate)
    if ($AllowCpuFallback) {
        Add-Check "cuda-available" ([bool]$probe.cuda_available) ("gpu=" + [string]$probe.gpu_name) $false
        Add-Check "bf16-supported" ([bool]$probe.bf16_supported) ("bf16=" + [string]$probe.bf16_supported) $false
    } else {
        Add-Check "cuda-available" ([bool]$probe.cuda_available) ("gpu=" + [string]$probe.gpu_name)
        Add-Check "bf16-supported" ([bool]$probe.bf16_supported) ("bf16=" + [string]$probe.bf16_supported)
    }
} catch {
    Add-Check "private-python-gpu-probe" $false $_.Exception.Message
}

$Info = New-Object System.Diagnostics.ProcessStartInfo
$Info.FileName = $python
$Info.Arguments = '-s "' + ($worker -replace '"', '\"') + '"'
$Info.RedirectStandardInput = $true
$Info.RedirectStandardOutput = $true
$Info.RedirectStandardError = $true
$Info.UseShellExecute = $false
$Info.CreateNoWindow = $true
$Info.WorkingDirectory = Split-Path $worker -Parent
$Info.EnvironmentVariables["TRANSLATEIT_RUNTIME_ROOT"] = $InstallRoot
$Info.EnvironmentVariables["TRANSLATEIT_USER_DATA_ROOT"] = Join-Path $env:TEMP "TranslateITTargetPcAcceptanceUserData"

$Process = New-Object System.Diagnostics.Process
$Process.StartInfo = $Info
$processStarted = $false
$asrPreload = $null
$translationPreload = $null
$idEn = $null
$enId = $null
try {
    [void]$Process.Start()
    $processStarted = $true
    $Process.StandardInput.AutoFlush = $true
    $asrPreload = Invoke-WorkerJson $Process @{ command = "asr_preload" } $WorkerTimeoutSeconds
    $translationPreload = Invoke-WorkerJson $Process @{ command = "translation_preload"; source_language = "id"; target_language = "en" } $WorkerTimeoutSeconds
    $idEn = Invoke-WorkerJson $Process @{ command = "translate"; text = "selamat pagi"; source_language = "id"; target_language = "en" } $WorkerTimeoutSeconds
    $enId = Invoke-WorkerJson $Process @{ command = "translate"; text = "good morning"; source_language = "en"; target_language = "id" } $WorkerTimeoutSeconds
    Add-Check "installed-worker-execution" $true "Installed private Python worker completed ASR preload, MiLMMT preload, and both translation fixtures."
} catch {
    Add-Check "installed-worker-execution" $false $_.Exception.Message
} finally {
    if ($processStarted) {
        try { $Process.StandardInput.Close() } catch {}
        if (-not $Process.HasExited) {
            if (-not $Process.WaitForExit(5000)) { try { $Process.Kill() } catch {} }
        }
        if ($Process.HasExited -and $Process.ExitCode -ne 0) {
            try {
                $stderr = $Process.StandardError.ReadToEnd().Trim()
                if (-not [string]::IsNullOrWhiteSpace($stderr)) { $Runtime.worker_stderr = $stderr }
            } catch {}
        }
    }
}

$Runtime.asr_preload = Worker-Summary $asrPreload
$Runtime.translation_preload = Worker-Summary $translationPreload
$Runtime.translation_id_en = Worker-Summary $idEn
$Runtime.translation_en_id = Worker-Summary $enId

if ($null -ne $asrPreload) {
    $asrDevice = [string](Get-Value $asrPreload "device" "")
    $asrBlocker = [string](Get-Value $asrPreload "blocker" "")
    Add-Check "asr-preload" ([bool](Get-Value $asrPreload "ok" $false)) ("device=" + $asrDevice + "; blocker=" + $asrBlocker)
    if (-not $AllowCpuFallback) {
        Add-Check "asr-cuda" ($asrDevice -eq "cuda") $asrDevice
    }
}
if ($null -ne $translationPreload) {
    $translationDevice = [string](Get-Value $translationPreload "device" "")
    $translationPrecision = [string](Get-Value $translationPreload "precision" "")
    $translationBlocker = [string](Get-Value $translationPreload "blocker" "")
    $preloadOk = [bool](Get-Value $translationPreload "ok" $false) -and [string](Get-Value $translationPreload "model_revision" "") -eq "4fc480b6c58dec29c159dcdf9fde0f6d5c354995"
    Add-Check "milmmt-preload" $preloadOk ("device=" + $translationDevice + "; precision=" + $translationPrecision + "; blocker=" + $translationBlocker)
    if (-not $AllowCpuFallback) {
        Add-Check "milmmt-cuda-bf16" ($translationDevice -eq "cuda" -and $translationPrecision -eq "bf16") ("device=" + $translationDevice + "; precision=" + $translationPrecision)
    }
}

if ($null -ne $idEn) {
    Add-Check "translation-id-en" (Translation-Passed $idEn "id->en") ("output=" + [string](Get-Value $idEn "translated_text" "") + "; device=" + [string](Get-Value $idEn "device" "") + "; elapsed_ms=" + [string](Get-Value $idEn "elapsed_ms" ""))
}
if ($null -ne $enId) {
    Add-Check "translation-en-id" (Translation-Passed $enId "en->id") ("output=" + [string](Get-Value $enId "translated_text" "") + "; device=" + [string](Get-Value $enId "device" "") + "; elapsed_ms=" + [string](Get-Value $enId "elapsed_ms" ""))
}

$ManualRemaining.Add("Launch the installed TranslateIT app and confirm first launch has no missing-runtime/dependency error.")
$ManualRemaining.Add("Complete My Voice recording/build/evaluation/approval, then verify generated voice by listening.")
$ManualRemaining.Add("Run Microphone Test with the real physical microphone and confirm capture/stop/retry behavior.")
$ManualRemaining.Add("Verify TranslateIT Meeting Microphone reaches Zoom, Google Meet, or Teams through VB-CABLE without duplicate/stale audio.")
$ManualRemaining.Add("Repeat Meeting Start/Stop at least twice to check lifecycle cleanup.")
$ManualRemaining.Add("Verify uninstall/reinstall preserves user data as specified, then repeat the final clean-machine acceptance separately.")
Write-Evidence
