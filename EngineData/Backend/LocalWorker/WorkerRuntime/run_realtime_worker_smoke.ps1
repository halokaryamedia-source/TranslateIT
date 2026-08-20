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

foreach ($RequiredPath in @($Worker, $PythonExe, $PythonVersionFile)) {
    if (-not (Test-Path -LiteralPath $RequiredPath)) {
        throw "Canonical WorkerRuntime prerequisite missing: $RequiredPath"
    }
}
$PinnedPython = (Get-Content -LiteralPath $PythonVersionFile -Raw).Trim()
$ResolvedPython = (& $PythonExe -c "import platform; print(platform.python_version())").Trim()
if ($LASTEXITCODE -ne 0 -or $ResolvedPython -ne $PinnedPython) {
    throw "WorkerRuntime Python mismatch. Expected $PinnedPython, got $ResolvedPython."
}

$Info = New-Object System.Diagnostics.ProcessStartInfo
$Info.FileName = $PythonExe
$Info.Arguments = '"' + ($Worker -replace '"', '\"') + '"'
$Info.RedirectStandardInput = $true
$Info.RedirectStandardOutput = $true
$Info.RedirectStandardError = $true
$Info.UseShellExecute = $false
$Info.CreateNoWindow = $true
$Process = New-Object System.Diagnostics.Process
$Process.StartInfo = $Info
[void]$Process.Start()
$Process.StandardInput.AutoFlush = $true

function Stop-Worker {
    if (-not $Process.HasExited) {
        try { $Process.Kill() } catch {}
        try { [void]$Process.WaitForExit(5000) } catch {}
    }
}

function Read-Stderr {
    if (-not $Process.HasExited) { return "" }
    try { return $Process.StandardError.ReadToEnd().Trim() } catch { return "" }
}

function Invoke-WorkerJson {
    param([hashtable]$Payload)
    if ($Process.HasExited) {
        throw "Persistent worker exited before $($Payload.command); stderr=$(Read-Stderr)"
    }
    $Process.StandardInput.WriteLine(($Payload | ConvertTo-Json -Compress -Depth 12))
    $Read = $Process.StandardOutput.ReadLineAsync()
    if (-not $Read.Wait($CommandTimeoutSeconds * 1000)) {
        Stop-Worker
        throw "Persistent worker timed out for $($Payload.command); stderr=$(Read-Stderr)"
    }
    if ([string]::IsNullOrWhiteSpace($Read.Result)) {
        Stop-Worker
        throw "Persistent worker returned no response for $($Payload.command); stderr=$(Read-Stderr)"
    }
    return $Read.Result | ConvertFrom-Json -ErrorAction Stop
}

function Stage-Summary {
    param($Response)
    if ($null -eq $Response) { return $null }
    return [ordered]@{
        ok = [bool]$Response.ok
        stage = $Response.stage
        model_id = $Response.model_id
        model_revision = $Response.model_revision
        direction_pair = $Response.direction_pair
        translation_contract = $Response.translation_contract
        device = $Response.device
        precision = $Response.precision
        complete = $Response.complete
        finished_with_eos = $Response.finished_with_eos
        generated_tokens = $Response.generated_tokens
        blocker = $Response.blocker
        elapsed_ms = $Response.elapsed_ms
    }
}

function Translation-Ok {
    param($Response, [string]$Direction)
    return [bool]$Response.ok `
        -and $Response.stage -eq "translate" `
        -and $Response.translation_contract -eq "canonical_bidirectional_id_en" `
        -and $Response.direction_pair -eq $Direction `
        -and [bool]$Response.complete `
        -and [bool]$Response.finished_with_eos `
        -and -not [string]::IsNullOrWhiteSpace([string]$Response.translated_text)
}

$Status = $null
$AsrPreload = $null
$IdEn = $null
$EnId = $null
$VoicePreflight = $null
$Voice = $null
$Asr = $null
$PostStatus = $null
$VoiceArtifactValid = $false

try {
    $Status = Invoke-WorkerJson @{ command = "status" }
    $AsrPreload = Invoke-WorkerJson @{ command = "asr_preload" }
    $IdEn = Invoke-WorkerJson @{ command = "translate"; text = $IdText; source_language = "id"; target_language = "en" }
    $EnId = Invoke-WorkerJson @{ command = "translate"; text = $EnText; source_language = "en"; target_language = "id" }
    $VoicePreflight = Invoke-WorkerJson @{ command = "voice_actor_preflight" }
    if ($TtsText.Trim().Length -gt 0) {
        $Voice = Invoke-WorkerJson @{ command = "voice_actor_synthesize"; text = $TtsText }
        if ([bool]$Voice.ok -and -not [string]::IsNullOrWhiteSpace([string]$Voice.output_path)) {
            $VoiceArtifactValid = (Test-Path -LiteralPath $Voice.output_path) -and ((Get-Item -LiteralPath $Voice.output_path).Length -gt 44)
        }
    }
    if ($AudioPath.Trim().Length -gt 0) {
        $Asr = Invoke-WorkerJson @{ command = "transcribe"; audio_path = $AudioPath; language = "id"; beam_size = 1; vad_filter = $true }
    }
    $PostStatus = Invoke-WorkerJson @{ command = "status" }
}
finally {
    try { $Process.StandardInput.Close() } catch {}
    if (-not $Process.WaitForExit(5000)) { Stop-Worker }
}

$IdEnOk = Translation-Ok $IdEn "id->en"
$EnIdOk = Translation-Ok $EnId "en->id"
$VoiceOk = [bool]$VoicePreflight.ok -and (($null -eq $Voice) -or ([bool]$Voice.ok -and $VoiceArtifactValid))
$AsrOk = [bool]$AsrPreload.ok
if ($null -ne $Asr) {
    $AsrOk = $AsrOk -and [bool]$Asr.ok -and -not [string]::IsNullOrWhiteSpace([string]$Asr.transcript_text)
}
$LoadedDirections = @($PostStatus.loaded.translation_directions)
$LifecycleOk = $LoadedDirections -contains "id->en" -and $LoadedDirections -contains "en->id"
$Ok = [bool]$Status.ok -and $IdEnOk -and $EnIdOk -and $VoiceOk -and $AsrOk -and $LifecycleOk

$Result = [ordered]@{
    schema = "translateit.local_worker_smoke_result.v8.milmmt.redacted.persistent"
    created_at = (Get-Date).ToUniversalTime().ToString("o")
    privacy = "conversation_bodies_and_runtime_paths_redacted"
    persistent_worker = $true
    ok = $Ok
    expected_device = $ExpectedDevice
    assertions = [ordered]@{
        translation_id_en = $IdEnOk
        translation_en_id = $EnIdOk
        voice_actor_artifact = $VoiceOk
        asr = $AsrOk
        persistent_translation_lifecycle = $LifecycleOk
    }
    status = Stage-Summary $Status
    asr_preload = Stage-Summary $AsrPreload
    translation_id_en = Stage-Summary $IdEn
    translation_en_id = Stage-Summary $EnId
    voice_actor_preflight = Stage-Summary $VoicePreflight
    voice_actor_synthesize = Stage-Summary $Voice
    asr = Stage-Summary $Asr
    post_status = Stage-Summary $PostStatus
    note = "Runtime smoke only. This result does not claim linguistic quality, target latency, installer readiness, or clean-machine proof."
}
New-Item -ItemType Directory -Force -Path $EvidenceRoot | Out-Null
$Result | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $EvidencePath -Encoding UTF8
$Result | ConvertTo-Json -Depth 20
if (-not $Ok) { exit 1 }
Write-Host "Persistent-worker smoke passed: $EvidencePath"
