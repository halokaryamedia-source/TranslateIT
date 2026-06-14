$ErrorActionPreference = "Stop"

param(
    [string]$AudioPath = "",
    [ValidateSet("Realtime", "Quality")]
    [string]$Mode = "Realtime",
    [string]$Text = "halo",
    [string]$TtsText = "Hello."
)

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$SmokeScript = Join-Path $Root "DevelopingData\Tooling\Scripts\Execution\run_local_realtime_worker_smoke_tests.py"
$WorkerPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $SmokeScript)) {
    throw "Missing smoke test script: $SmokeScript"
}

if (Test-Path $WorkerPython) {
    $Python = $WorkerPython
} else {
    $Python = "python"
}

Write-Host "TranslateIT local realtime worker smoke test"
Write-Host "Root: $Root"
Write-Host "Mode: $Mode"
Write-Host "AudioPath: $AudioPath"
Write-Host "Persistent worker: true"

$ArgsList = @($SmokeScript, "--mode", $Mode, "--text", $Text, "--tts-text", $TtsText)
if ($AudioPath -ne "") {
    $ArgsList += @("--audio-path", $AudioPath)
}

& $Python @ArgsList

Write-Host "Smoke test finished. Owner validation remains blocked unless latest_validation_evidence.json and manual runtime evidence are complete."
