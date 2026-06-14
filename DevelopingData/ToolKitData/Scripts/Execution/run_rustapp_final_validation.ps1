$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")
$RustApp = Join-Path $Root "EngineData\LauncherApp\RustApp"
$EvidenceWriter = Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\write_rustapp_validation_evidence.py"

Write-Host "TranslateIT RustApp final validation"
Write-Host "Root: $Root"
Write-Host "RustApp: $RustApp"
Write-Host "Status: internal validation only. Do not mark Ready from this script without manual runtime evidence."

python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_rust_app.py")
python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_rust_runtime_boundaries.py")
python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_rust_runtime_command_registration.py")
python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_rust_validation_evidence_boundary.py")
python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_rust_output_boundary.py")
python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_rust_model_boundary.py")

$TypecheckPassed = $false
$RustCheckPassed = $false
$FrontendBuildPassed = $false
$TauriBuildPassed = $false
$PackagingPassed = $false

Push-Location $RustApp
try {
    Write-Host "[1/5] Installing frontend/RustApp dependencies"
    npm install

    Write-Host "[2/5] Running TypeScript typecheck"
    npm run typecheck
    $TypecheckPassed = $true

    Write-Host "[3/5] Running Rust cargo check"
    npm run check:rust
    $RustCheckPassed = $true

    Write-Host "[4/5] Building frontend bundle"
    npm run build:frontend
    $FrontendBuildPassed = $true

    Write-Host "[5/5] Building Tauri application package"
    npm run build
    $TauriBuildPassed = $true
    $PackagingPassed = $true
}
finally {
    Pop-Location
    python $EvidenceWriter $RustCheckPassed $TypecheckPassed $FrontendBuildPassed $TauriBuildPassed $PackagingPassed
}

Write-Host "RustApp final validation commands completed."
Write-Host "Required manual evidence still remains: microphone capture smoke test, ASR transcript smoke test, translation smoke test, TTS/playback smoke test, launcher/package open test."
Write-Host "Do not mark owner validation, release candidate, or production Ready until those manual runtime checks pass."
