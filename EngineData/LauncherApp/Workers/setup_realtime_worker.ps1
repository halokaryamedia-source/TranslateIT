$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$WorkerRoot = Join-Path $Root "EngineData\LauncherApp\Workers"
$Venv = Join-Path $WorkerRoot ".venv"
$Requirements = Join-Path $WorkerRoot "requirements-realtime.txt"
$PythonExe = Join-Path $Venv "Scripts\python.exe"

Write-Host "TranslateIT local realtime worker setup"
Write-Host "Root: $Root"
Write-Host "WorkerRoot: $WorkerRoot"

if (-not (Test-Path $Requirements)) {
    throw "Missing requirements file: $Requirements"
}

if (-not (Test-Path $PythonExe)) {
    Write-Host "Creating worker virtual environment"
    python -m venv $Venv
}

Write-Host "Upgrading pip"
& $PythonExe -m pip install --upgrade pip

Write-Host "Installing local realtime worker dependencies"
& $PythonExe -m pip install -r $Requirements

Write-Host "Checking worker status command"
$Worker = Join-Path $WorkerRoot "realtime_local_worker.py"
'{"command":"status"}' | & $PythonExe $Worker

Write-Host "Local realtime worker setup completed. Real ASR/translation/TTS still requires downloaded model files and smoke tests."
