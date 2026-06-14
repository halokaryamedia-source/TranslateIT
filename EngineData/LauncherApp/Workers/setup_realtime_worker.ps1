$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$WorkerRoot = Join-Path $Root "EngineData\LauncherApp\Workers"
$Venv = Join-Path $WorkerRoot ".venv"
$Requirements = Join-Path $WorkerRoot "requirements-realtime.txt"
$PythonExe = Join-Path $Venv "Scripts\python.exe"
$Worker = Join-Path $WorkerRoot "realtime_local_worker.py"
$NodeTooling = Join-Path $Root "DevelopingData\Tooling\Scripts\Execution\translateit_tooling.mjs"

Write-Host "TranslateIT local realtime worker setup"
Write-Host "Root: $Root"
Write-Host "WorkerRoot: $WorkerRoot"

if (-not (Test-Path $Requirements)) {
    throw "Missing requirements file: $Requirements"
}
if (-not (Test-Path $Worker)) {
    throw "Missing local worker script: $Worker"
}

if (-not (Test-Path $PythonExe)) {
    Write-Host "Creating worker virtual environment"
    python -m venv $Venv
}

Write-Host "Upgrading pip"
& $PythonExe -m pip install --upgrade pip

Write-Host "Installing local realtime worker dependencies"
& $PythonExe -m pip install -r $Requirements

Write-Host "Checking worker dependency/model status"
'{"command":"status"}' | & $PythonExe $Worker

if (Test-Path $NodeTooling) {
    Write-Host "Checking local runtime model and Piper voice readiness"
    node $NodeTooling validate-models
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Local worker dependencies were installed, but one or more local model or Piper voice assets are still missing."
    }
}

Write-Host "Local realtime worker setup completed. Run run_realtime_worker_smoke.ps1 after model files and a microphone WAV sample are ready."
