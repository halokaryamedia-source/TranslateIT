$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")
$RustApp = Join-Path $Root "EngineData\LauncherApp\RustApp"

Write-Host "TranslateIT RustApp final validation"
Write-Host "Root: $Root"
Write-Host "RustApp: $RustApp"
Write-Host "Status: internal validation only. Do not mark Ready from this script without manual runtime evidence."

python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_rust_app.py")
python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_rust_runtime_boundaries.py")
python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_rust_output_boundary.py")
python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_rust_model_boundary.py")

Push-Location $RustApp
try {
    Write-Host "[1/5] Installing frontend/RustApp dependencies"
    npm install

    Write-Host "[2/5] Running TypeScript typecheck"
    npm run typecheck

    Write-Host "[3/5] Running Rust cargo check"
    npm run check:rust

    Write-Host "[4/5] Building frontend bundle"
    npm run build:frontend

    Write-Host "[5/5] Building Tauri application package"
    npm run build
}
finally {
    Pop-Location
}

Write-Host "RustApp final validation commands completed."
Write-Host "Required manual evidence still remains: microphone capture smoke test, ASR transcript smoke test, translation smoke test, TTS/playback smoke test, launcher/package open test."
Write-Host "Do not mark owner validation, release candidate, or production Ready until those manual runtime checks pass."
