$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")
$RustApp = Join-Path $Root "EngineData\LauncherApp\RustApp"

Write-Host "TranslateIT RustApp final validation"
Write-Host "Root: $Root"
Write-Host "RustApp: $RustApp"

python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_rust_app.py")
python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_rust_runtime_boundaries.py")
python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_rust_output_boundary.py")
python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_rust_model_boundary.py")

Push-Location $RustApp
try {
    npm install
    npm run typecheck
    npm run check:rust
    npm run build
}
finally {
    Pop-Location
}

Write-Host "RustApp final validation commands completed. Review app runtime diagnostics manually before marking Ready."
