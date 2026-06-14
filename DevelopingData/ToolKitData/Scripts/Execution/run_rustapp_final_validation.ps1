$ErrorActionPreference = "Continue"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")
$RustApp = Join-Path $Root "EngineData\LauncherApp\RustApp"
$EvidenceWriter = Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\write_rustapp_validation_evidence.py"
$ReadinessSummary = Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\summarize_translateit_readiness.py"
$ValidationFailed = $false

function Invoke-ValidationStep {
    param(
        [string]$Name,
        [scriptblock]$Command
    )

    Write-Host "[validation] $Name"
    try {
        & $Command
        if ($LASTEXITCODE -ne 0) {
            throw "$Name failed with exit code $LASTEXITCODE"
        }
        return $true
    }
    catch {
        Write-Warning $_
        $script:ValidationFailed = $true
        return $false
    }
}

function Invoke-ReadinessSummary {
    if (Test-Path $ReadinessSummary) {
        Write-Host "[summary] Writing evidence-based readiness summary"
        python $ReadinessSummary
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Readiness summary reports remaining blockers. This is expected until local runtime evidence is complete."
        }
    }
}

Write-Host "TranslateIT RustApp final validation"
Write-Host "Root: $Root"
Write-Host "RustApp: $RustApp"
Write-Host "Status: internal validation only. Do not mark Ready from this script without manual runtime evidence."

Invoke-ValidationStep "Truthful readiness claims" { python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_truthful_readiness_claims.py") } | Out-Null
Invoke-ValidationStep "Rust app scaffold boundary" { python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_rust_app.py") } | Out-Null
Invoke-ValidationStep "Launcher contract" { python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_launcher_contract.py") } | Out-Null
Invoke-ValidationStep "CI validation workflow contract" { python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_ci_validation_workflow.py") } | Out-Null
Invoke-ValidationStep "Local release bundle contract" { python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_translateit_local_release_bundle.py") } | Out-Null
Invoke-ValidationStep "Rust runtime boundary" { python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_rust_runtime_boundaries.py") } | Out-Null
Invoke-ValidationStep "Rust command registration boundary" { python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_rust_runtime_command_registration.py") } | Out-Null
Invoke-ValidationStep "Rust validation evidence boundary" { python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_rust_validation_evidence_boundary.py") } | Out-Null
Invoke-ValidationStep "Rust output boundary" { python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_rust_output_boundary.py") } | Out-Null
Invoke-ValidationStep "Rust model boundary" { python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_rust_model_boundary.py") } | Out-Null
Invoke-ValidationStep "Frontend runtime contract" { python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_frontend_runtime_contract.py") } | Out-Null
$LocalWorkerStackPassed = Invoke-ValidationStep "Local realtime worker stack" { python (Join-Path $Root "DevelopingData\ToolKitData\Scripts\Execution\check_local_realtime_worker_stack.py") }

$TypecheckPassed = $false
$RustCheckPassed = $false
$FrontendBuildPassed = $false
$TauriBuildPassed = $false
$PackagingPassed = $false

Push-Location $RustApp
try {
    Invoke-ValidationStep "Install frontend/RustApp dependencies" { npm install } | Out-Null
    $TypecheckPassed = Invoke-ValidationStep "TypeScript typecheck" { npm run typecheck }
    $RustCheckPassed = Invoke-ValidationStep "Rust cargo check" { npm run check:rust }
    $FrontendBuildPassed = Invoke-ValidationStep "Frontend build" { npm run build:frontend }
    $TauriBuildPassed = Invoke-ValidationStep "Tauri application package build" { npm run build }
    $PackagingPassed = $TauriBuildPassed
}
finally {
    Pop-Location
    python $EvidenceWriter $RustCheckPassed $TypecheckPassed $FrontendBuildPassed $TauriBuildPassed $PackagingPassed $LocalWorkerStackPassed
    Invoke-ReadinessSummary
}

Write-Host "RustApp final validation commands completed."
Write-Host "Truthful readiness claims, launcher, CI workflow, local release bundle, local realtime worker stack, frontend runtime contract, validation evidence, and readiness summary boundaries are included, but real inference still requires runtime smoke evidence."
Write-Host "Required manual evidence still remains: microphone capture smoke test, ASR transcript smoke test, translation smoke test, TTS/playback smoke test, launcher/package open test."
Write-Host "Do not mark owner validation, release candidate, or production Ready until those manual runtime checks pass."

if ($ValidationFailed) {
    exit 1
}
