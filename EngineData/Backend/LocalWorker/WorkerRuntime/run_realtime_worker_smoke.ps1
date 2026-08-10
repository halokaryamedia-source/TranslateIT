param(
    [string]$AudioPath = "",
    [ValidateSet("Realtime", "Quality")]
    [string]$Mode = "Realtime",
    [string]$Text = "halo",
    [string]$TtsText = "Hello."
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
$Worker = Join-Path $PSScriptRoot "realtime_local_worker.py"
$PythonExe = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
$EvidenceRoot = Join-Path $Root "UserData\LogData\RustAppValidation"
$EvidencePath = Join-Path $EvidenceRoot "latest_worker_smoke_result.json"

if (-not (Test-Path $Worker)) {
    throw "Missing realtime local worker: $Worker"
}
if (-not (Test-Path $PythonExe)) {
    throw "Canonical WorkerRuntime environment is missing. Run setup_realtime_worker.ps1 first."
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

function Invoke-WorkerJson {
    param([hashtable]$Payload)

    if ($process.HasExited) {
        $stderr = $process.StandardError.ReadToEnd().Trim()
        throw "Persistent worker exited before command $($Payload.command); stderr=$stderr"
    }

    $json = $Payload | ConvertTo-Json -Compress -Depth 12
    $process.StandardInput.WriteLine($json)
    $line = $process.StandardOutput.ReadLine()
    if ([string]::IsNullOrWhiteSpace($line)) {
        $stderr = $process.StandardError.ReadToEnd().Trim()
        throw "Persistent worker returned no response for command $($Payload.command); stderr=$stderr"
    }
    return $line | ConvertFrom-Json -ErrorAction Stop
}

function Get-StageSummary {
    param($Response)

    if ($null -eq $Response) {
        return $null
    }

    return [ordered]@{
        ok = [bool]$Response.ok
        stage = $Response.stage
        mode = $Response.mode
        model_id = $Response.model_id
        device = $Response.device
        compute_type = $Response.compute_type
        provider = $Response.provider
        blocker = $Response.blocker
        elapsed_ms = $Response.elapsed_ms
        readiness = $Response.readiness
        loaded = $Response.loaded
    }
}

Write-Host "TranslateIT local persistent-worker smoke test"
Write-Host "Root: $Root"
Write-Host "Mode: $Mode"
Write-Host "Audio provided: $([bool]($AudioPath.Trim().Length -gt 0))"

try {
    $status = Invoke-WorkerJson @{ command = "status" }
    $translation = Invoke-WorkerJson @{
        command = "translate"
        text = $Text
        source_language = "id"
        target_language = "en"
        mode = $Mode
        max_new_tokens = 48
    }
    $ttsPreflight = Invoke-WorkerJson @{ command = "tts_preflight" }
    $tts = $null
    if ($TtsText.Trim().Length -gt 0) {
        $tts = Invoke-WorkerJson @{
            command = "synthesize"
            text = $TtsText
        }
    }
    $asr = $null
    if ($AudioPath.Trim().Length -gt 0) {
        $asr = Invoke-WorkerJson @{
            command = "transcribe"
            audio_path = $AudioPath
            language = "id"
            beam_size = 1
            vad_filter = $true
        }
    }
}
finally {
    try { $process.StandardInput.Close() } catch {}
    if (-not $process.WaitForExit(5000)) {
        try { $process.Kill() } catch {}
        try { [void]$process.WaitForExit(5000) } catch {}
    }
}

$ok = [bool]$status.ok -and [bool]$translation.ok -and [bool]$ttsPreflight.ok
if ($null -ne $tts) { $ok = $ok -and [bool]$tts.ok }
if ($null -ne $asr) { $ok = $ok -and [bool]$asr.ok }

$result = [ordered]@{
    schema = "translateit.local_worker_smoke_result.v5.redacted.persistent"
    created_at = (Get-Date).ToUniversalTime().ToString("o")
    privacy = "conversation_bodies_and_runtime_paths_redacted"
    persistent_worker = $true
    ok = $ok
    mode = $Mode
    text_chars = $Text.Length
    audio_supplied = [bool]($AudioPath.Trim().Length -gt 0)
    tts_text_chars = $TtsText.Length
    status = Get-StageSummary $status
    translation = Get-StageSummary $translation
    tts_preflight = Get-StageSummary $ttsPreflight
    tts = Get-StageSummary $tts
    asr = Get-StageSummary $asr
    note = "This smoke result proves only the observed persistent worker command path on this PC. It intentionally excludes source/translated/transcript text and file paths, and is not model-quality, latency, Windows audio-delivery, or release proof."
}

New-Item -ItemType Directory -Force -Path $EvidenceRoot | Out-Null
$result | ConvertTo-Json -Depth 20 | Set-Content -Path $EvidencePath -Encoding UTF8
$result | ConvertTo-Json -Depth 20

if (-not $ok) {
    exit 1
}

Write-Host "Persistent-worker smoke finished and privacy-bounded evidence saved: $EvidencePath"
