param(
    [string]$AudioPath = "",
    [string]$IdText = "halo apa kabar",
    [string]$EnText = "hello how are you",
    [string]$TtsText = "Hello.",
    [ValidateSet("Any", "Cuda", "CpuFallback")]
    [string]$ExpectedDevice = "Any",
    [ValidateRange(10, 600)]
    [int]$CommandTimeoutSeconds = 300
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
$Worker = Join-Path $PSScriptRoot "realtime_local_worker.py"
$PythonExe = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
$PythonVersionFile = Join-Path $PSScriptRoot ".python-version"
$EvidenceRoot = Join-Path $Root "UserData\LogData\RustAppValidation"
$EvidencePath = Join-Path $EvidenceRoot "latest_worker_smoke_result.json"

if (-not (Test-Path $Worker)) {
    throw "Missing realtime local worker: $Worker"
}
if (-not (Test-Path $PythonExe)) {
    throw "Canonical WorkerRuntime environment is missing. Run setup_realtime_worker.ps1 first."
}
if (-not (Test-Path $PythonVersionFile)) {
    throw "Canonical WorkerRuntime Python pin is missing: $PythonVersionFile"
}
$PinnedPython = (Get-Content $PythonVersionFile -Raw).Trim()
$ResolvedPython = (& $PythonExe -c "import platform; print(platform.python_version())").Trim()
if ($LASTEXITCODE -ne 0 -or $ResolvedPython -ne $PinnedPython) {
    throw "WorkerRuntime Python mismatch. Expected $PinnedPython, got $ResolvedPython. Run setup_realtime_worker.ps1."
}

$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = $PythonExe
$processInfo.Arguments = '"' + ($Worker -replace '"', '\"') + '"'
$processInfo.RedirectStandardInput = $true
$processInfo.RedirectStandardOutput = $true
$processInfo.RedirectStandardError = $true
$processInfo.UseShellExecute = $false
$processInfo.CreateNoWindow = $true

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $processInfo
[void]$process.Start()
$process.StandardInput.AutoFlush = $true

function Stop-WorkerForFailure {
    if (-not $process.HasExited) {
        try { $process.Kill() } catch {}
        try { [void]$process.WaitForExit(5000) } catch {}
    }
}

function Read-WorkerStderrSafe {
    if (-not $process.HasExited) { return "" }
    try { return $process.StandardError.ReadToEnd().Trim() } catch { return "" }
}

function Invoke-WorkerJson {
    param([hashtable]$Payload)

    if ($process.HasExited) {
        throw "Persistent worker exited before command $($Payload.command); stderr=$(Read-WorkerStderrSafe)"
    }

    $json = $Payload | ConvertTo-Json -Compress -Depth 12
    $process.StandardInput.WriteLine($json)
    $readTask = $process.StandardOutput.ReadLineAsync()
    if (-not $readTask.Wait($CommandTimeoutSeconds * 1000)) {
        Stop-WorkerForFailure
        throw "Persistent worker timed out after $CommandTimeoutSeconds seconds for command $($Payload.command); stderr=$(Read-WorkerStderrSafe)"
    }
    $line = $readTask.Result
    if ([string]::IsNullOrWhiteSpace($line)) {
        Stop-WorkerForFailure
        throw "Persistent worker returned no response for command $($Payload.command); stderr=$(Read-WorkerStderrSafe)"
    }
    return $line | ConvertFrom-Json -ErrorAction Stop
}

function Get-StageSummary {
    param($Response)

    if ($null -eq $Response) { return $null }
    return [ordered]@{
        ok = [bool]$Response.ok
        stage = $Response.stage
        model_id = $Response.model_id
        source_language = $Response.source_language
        target_language = $Response.target_language
        direction_pair = $Response.direction_pair
        translation_contract = $Response.translation_contract
        device = $Response.device
        compute_type = $Response.compute_type
        selected_device = $Response.selected_device
        selected_translation_device = $Response.selected_translation_device
        cpu_fallback_active = $Response.cpu_fallback_active
        cuda_capability_known = $Response.cuda_capability_known
        fallback_reason = $Response.fallback_reason
        translation_degraded = $Response.translation_degraded
        translation_fallback_reason = $Response.translation_fallback_reason
        provider = $Response.provider
        voice_id = $Response.voice_id
        language_code = $Response.language_code
        complete = $Response.complete
        finished_with_eos = $Response.finished_with_eos
        generated_tokens = $Response.generated_tokens
        hit_token_ceiling = $Response.hit_token_ceiling
        blocker = $Response.blocker
        elapsed_ms = $Response.elapsed_ms
        readiness = $Response.readiness
        loaded = $Response.loaded
    }
}

function Test-TranslationResponse {
    param($Response, [string]$Direction)
    return [bool]$Response.ok `
        -and $Response.stage -eq "translate" `
        -and $Response.translation_contract -eq "canonical_bidirectional_id_en" `
        -and $Response.direction_pair -eq $Direction `
        -and [bool]$Response.complete `
        -and [bool]$Response.finished_with_eos `
        -and -not [string]::IsNullOrWhiteSpace([string]$Response.translated_text)
}

function Test-DeviceExpectation {
    param($Status, $AsrPreload, $IdEn, $EnId)

    if (-not [bool]$Status.cuda_capability_known) { return $false }
    if ($ExpectedDevice -eq "Any") {
        return $Status.selected_device -in @("cpu", "cuda") `
            -and $Status.selected_translation_device -in @("cpu", "cuda")
    }
    if ($ExpectedDevice -eq "Cuda") {
        return -not [bool]$Status.cpu_fallback_active `
            -and $Status.selected_device -eq "cuda" `
            -and $Status.selected_translation_device -eq "cuda" `
            -and $AsrPreload.device -eq "cuda" `
            -and $IdEn.device -eq "cuda" `
            -and $EnId.device -eq "cuda"
    }
    return [bool]$Status.cpu_fallback_active `
        -and $Status.selected_device -eq "cpu" `
        -and $Status.selected_translation_device -eq "cpu" `
        -and $AsrPreload.device -eq "cpu" `
        -and $IdEn.device -eq "cpu" `
        -and $EnId.device -eq "cpu"
}

Write-Host "TranslateIT canonical persistent-worker smoke test"
Write-Host "Root: $Root"
Write-Host "Expected device: $ExpectedDevice"
Write-Host "Audio provided: $([bool]($AudioPath.Trim().Length -gt 0))"

$status = $null
$asrPreload = $null
$translationIdEn = $null
$translationEnId = $null
$ttsPreflight = $null
$tts = $null
$asr = $null
$postStatus = $null
$ttsArtifactValid = $false

try {
    $status = Invoke-WorkerJson @{ command = "status" }
    $asrPreload = Invoke-WorkerJson @{ command = "asr_preload" }
    $translationIdEn = Invoke-WorkerJson @{
        command = "translate"
        text = $IdText
        source_language = "id"
        target_language = "en"
        max_new_tokens = 48
    }
    $translationEnId = Invoke-WorkerJson @{
        command = "translate"
        text = $EnText
        source_language = "en"
        target_language = "id"
        max_new_tokens = 48
    }
    $ttsPreflight = Invoke-WorkerJson @{ command = "tts_preflight" }
    if ($TtsText.Trim().Length -gt 0) {
        $tts = Invoke-WorkerJson @{ command = "synthesize"; text = $TtsText }
        if ([bool]$tts.ok -and -not [string]::IsNullOrWhiteSpace([string]$tts.output_path)) {
            $ttsArtifactValid = (Test-Path $tts.output_path) -and ((Get-Item $tts.output_path).Length -gt 44)
        }
    }
    if ($AudioPath.Trim().Length -gt 0) {
        $asr = Invoke-WorkerJson @{
            command = "transcribe"
            audio_path = $AudioPath
            language = "id"
            beam_size = 1
            vad_filter = $true
        }
    }
    $postStatus = Invoke-WorkerJson @{ command = "status" }
}
finally {
    try { $process.StandardInput.Close() } catch {}
    if (-not $process.WaitForExit(5000)) {
        try { $process.Kill() } catch {}
        try { [void]$process.WaitForExit(5000) } catch {}
    }
}

$translationIdEnOk = Test-TranslationResponse $translationIdEn "id->en"
$translationEnIdOk = Test-TranslationResponse $translationEnId "en->id"
$ttsOk = [bool]$ttsPreflight.ok -and (($null -eq $tts) -or ([bool]$tts.ok -and $ttsArtifactValid))
$asrOk = [bool]$asrPreload.ok
if ($null -ne $asr) {
    $asrOk = $asrOk -and [bool]$asr.ok -and -not [string]::IsNullOrWhiteSpace([string]$asr.transcript_text)
}
$deviceOk = Test-DeviceExpectation $status $asrPreload $translationIdEn $translationEnId
$loadedDirections = @($postStatus.loaded.translation_directions)
$persistentLifecycleOk = $loadedDirections -contains "id->en" -and $loadedDirections -contains "en->id"

$ok = [bool]$status.ok `
    -and $translationIdEnOk `
    -and $translationEnIdOk `
    -and $ttsOk `
    -and $asrOk `
    -and $deviceOk `
    -and $persistentLifecycleOk

$result = [ordered]@{
    schema = "translateit.local_worker_smoke_result.v7.redacted.persistent"
    created_at = (Get-Date).ToUniversalTime().ToString("o")
    privacy = "conversation_bodies_and_runtime_paths_redacted"
    persistent_worker = $true
    ok = $ok
    expected_device = $ExpectedDevice
    id_text_chars = $IdText.Length
    en_text_chars = $EnText.Length
    audio_supplied = [bool]($AudioPath.Trim().Length -gt 0)
    tts_text_chars = $TtsText.Length
    assertions = [ordered]@{
        translation_id_en = $translationIdEnOk
        translation_en_id = $translationEnIdOk
        tts_artifact = $ttsOk
        asr = $asrOk
        device_truth = $deviceOk
        persistent_translation_lifecycle = $persistentLifecycleOk
    }
    status = Get-StageSummary $status
    asr_preload = Get-StageSummary $asrPreload
    translation_id_en = Get-StageSummary $translationIdEn
    translation_en_id = Get-StageSummary $translationEnId
    tts_preflight = Get-StageSummary $ttsPreflight
    tts = Get-StageSummary $tts
    asr = Get-StageSummary $asr
    post_status = Get-StageSummary $postStatus
    note = "This smoke result records only stage/completion/provider/device metadata for the observed persistent worker run. It excludes source, translated, transcript text and runtime file paths. It is not linguistic-quality, meeting-audio-delivery, latency, installer, or clean-machine proof."
}

New-Item -ItemType Directory -Force -Path $EvidenceRoot | Out-Null
$result | ConvertTo-Json -Depth 20 | Set-Content -Path $EvidencePath -Encoding UTF8
$result | ConvertTo-Json -Depth 20

if (-not $ok) { exit 1 }
Write-Host "Persistent-worker smoke finished and privacy-bounded evidence saved: $EvidencePath"
