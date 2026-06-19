param(
    [string]$AudioPath = "",
    [ValidateSet("Realtime", "Quality", "TranslationGpu")]
    [string]$Mode = "Realtime",
    [string]$Text = "halo",
    [string]$TtsText = "Hello."
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
$Worker = Join-Path $PSScriptRoot "realtime_local_worker.py"
$EvidenceRoot = Join-Path $Root "UserData\LogData\RustAppValidation"
$EvidencePath = Join-Path $EvidenceRoot "latest_worker_smoke_result.json"

if (-not (Test-Path $Worker)) {
    throw "Missing realtime local worker: $Worker"
}

function Invoke-WorkerJson {
    param([hashtable]$Payload)

    $json = $Payload | ConvertTo-Json -Compress -Depth 12
    $venvPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
    $candidates = @()
    if (Test-Path $venvPython) {
        $candidates += @{ FileName = $venvPython; Arguments = @($Worker) }
    }
    $candidates += @(
        @{ FileName = "python"; Arguments = @($Worker) },
        @{ FileName = "py"; Arguments = @("-3", $Worker) }
    )

    foreach ($candidate in $candidates) {
        $processInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processInfo.FileName = $candidate.FileName
        $processInfo.Arguments = ($candidate.Arguments | ForEach-Object {
            if ($_ -match '\s') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
        }) -join ' '
        $processInfo.RedirectStandardInput = $true
        $processInfo.RedirectStandardOutput = $true
        $processInfo.RedirectStandardError = $true
        $processInfo.UseShellExecute = $false
        $processInfo.CreateNoWindow = $true

        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $processInfo
        try {
            [void]$process.Start()
            $process.StandardInput.WriteLine($json)
            $process.StandardInput.Close()
            if (-not $process.WaitForExit(180000)) {
                try { $process.Kill() } catch {}
                continue
            }
            $stdout = $process.StandardOutput.ReadToEnd().Trim()
            if ($process.ExitCode -eq 0 -and $stdout.Length -gt 0) {
                $firstLine = ($stdout -split "`r?`n" | Select-Object -First 1)
                return $firstLine | ConvertFrom-Json -ErrorAction Stop
            }
        } catch {
            continue
        }
    }

    throw "Worker command failed: $($Payload.command)"
}

Write-Host "TranslateIT local realtime worker smoke test"
Write-Host "Root: $Root"
Write-Host "Mode: $Mode"
Write-Host "AudioPath: $AudioPath"

$status = Invoke-WorkerJson @{ command = "status" }
$translationPreload = $null
if ($Mode -eq "TranslationGpu") {
    $translationPreload = Invoke-WorkerJson @{ command = "translation_preload"; mode = "Realtime" }
}
$translation = Invoke-WorkerJson @{
    command = "translate"
    text = $Text
    source_language = "id"
    target_language = "en"
    mode = if ($Mode -eq "TranslationGpu") { "Realtime" } else { $Mode }
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
    schema = "translateit.local_worker_smoke_result.v2"
    created_at = (Get-Date).ToUniversalTime().ToString("o")
    ok = $ok
    mode = $Mode
    text_input = $Text
    audio_path = $AudioPath
    status = $status
    translation_preload = $translationPreload
    translation = $translation
    tts_preflight = $ttsPreflight
    tts = $tts
    asr = $asr
    note = "This smoke result proves only the local worker command path for this PC. Full release still requires Rust build/test and manual UI validation."
}

New-Item -ItemType Directory -Force -Path $EvidenceRoot | Out-Null
$result | ConvertTo-Json -Depth 20 | Set-Content -Path $EvidencePath -Encoding UTF8
$result | ConvertTo-Json -Depth 20

if (-not $ok) {
    exit 1
}

Write-Host "Smoke test finished and evidence saved: $EvidencePath"
