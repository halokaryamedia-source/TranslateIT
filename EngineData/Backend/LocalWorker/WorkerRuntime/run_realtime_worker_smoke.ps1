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

function Invoke-WorkerJson {
    param([hashtable]$Payload)

    $json = $Payload | ConvertTo-Json -Compress -Depth 12
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
    $process.StandardInput.WriteLine($json)
    $process.StandardInput.Close()
    if (-not $process.WaitForExit(180000)) {
        try { $process.Kill() } catch {}
        throw "Worker command timed out: $($Payload.command)"
    }

    $stdout = $process.StandardOutput.ReadToEnd().Trim()
    $stderr = $process.StandardError.ReadToEnd().Trim()
    if ($process.ExitCode -ne 0 -or $stdout.Length -eq 0) {
        throw "Worker command failed: $($Payload.command); stderr=$stderr"
    }

    $firstLine = ($stdout -split "`r?`n" | Select-Object -First 1)
    return $firstLine | ConvertFrom-Json -ErrorAction Stop
}

Write-Host "TranslateIT local persistent-worker smoke test"
Write-Host "Root: $Root"
Write-Host "Mode: $Mode"
Write-Host "Audio provided: $([bool]($AudioPath.Trim().Length -gt 0))"

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

$ok = [bool]$status.ok -and [bool]$translation.ok -and [bool]$ttsPreflight.ok
if ($null -ne $tts) { $ok = $ok -and [bool]$tts.ok }
if ($null -ne $asr) { $ok = $ok -and [bool]$asr.ok }

$result = [ordered]@{
    schema = "translateit.local_worker_smoke_result.v3.redacted"
    created_at = (Get-Date).ToUniversalTime().ToString("o")
    privacy = "source_text_and_audio_path_redacted"
    ok = $ok
    mode = $Mode
    text_chars = $Text.Length
    audio_supplied = [bool]($AudioPath.Trim().Length -gt 0)
    tts_text_chars = $TtsText.Length
    status = $status
    translation = $translation
    tts_preflight = $ttsPreflight
    tts = $tts
    asr = $asr
    note = "This smoke result proves only the observed local worker command path on this PC. It is not model-quality, latency, Windows audio-delivery, or release proof."
}

New-Item -ItemType Directory -Force -Path $EvidenceRoot | Out-Null
$result | ConvertTo-Json -Depth 20 | Set-Content -Path $EvidencePath -Encoding UTF8
$result | ConvertTo-Json -Depth 20

if (-not $ok) {
    exit 1
}

Write-Host "Smoke test finished and privacy-bounded evidence saved: $EvidencePath"
