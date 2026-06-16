param(
    [bool]$MicrophoneAsrPassed = $false,
    [bool]$RealtimeTranslationPassed = $false,
    [bool]$QualityTranslationPassed = $false,
    [bool]$PiperTtsPassed = $false,
    [bool]$EndToEndLatencyMeasured = $false,
    [string]$Note = "Manual target-PC runtime evidence recorded by operator."
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$EvidenceRoot = Join-Path $Root "UserData\LogData\RustAppValidation"
$EvidencePath = Join-Path $EvidenceRoot "latest_manual_runtime_evidence.json"

New-Item -ItemType Directory -Force -Path $EvidenceRoot | Out-Null

$payload = [ordered]@{
    schema = "translateit.manual_runtime_evidence.v3"
    created_at = (Get-Date).ToUniversalTime().ToString("o")
    microphone_asr_passed = $MicrophoneAsrPassed
    realtime_translation_passed = $RealtimeTranslationPassed
    quality_translation_passed = $QualityTranslationPassed
    piper_tts_passed = $PiperTtsPassed
    end_to_end_latency_measured = $EndToEndLatencyMeasured
    note = $Note
}

$payload | ConvertTo-Json -Depth 8 | Set-Content -Path $EvidencePath -Encoding UTF8
$payload | ConvertTo-Json -Depth 8

Write-Host "Manual runtime evidence saved: $EvidencePath"
