$ErrorActionPreference = "Stop"

param(
    [string]$AudioPath = "",
    [ValidateSet("Realtime", "Quality")]
    [string]$Mode = "Realtime"
)

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$SmokeScript = Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\run_local_realtime_worker_smoke_tests.py"
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

if ($AudioPath -ne "") {
    & $Python $SmokeScript --mode $Mode --audio-path $AudioPath
} else {
    & $Python $SmokeScript --mode $Mode
}

Write-Host "Smoke test finished. Owner validation remains blocked unless latest_validation_evidence.json and manual runtime evidence are complete."
