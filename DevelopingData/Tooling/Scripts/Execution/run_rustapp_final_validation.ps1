$ErrorActionPreference = "Continue"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")
$Tooling = Join-Path $Root "DevelopingData\Tooling\Scripts\Execution"
$RustApp = Join-Path $Root "EngineData\LauncherApp\RustApp"
$EvidenceWriter = Join-Path $Tooling "write_rustapp_validation_evidence.py"
$ReadinessSummary = Join-Path $Tooling "summarize_translateit_readiness.py"
$ValidationFailed = $false

function Invoke-ValidationStep {
    param([string]$Name, [scriptblock]$Command)
    Write-Host "[validation] $Name"
    try {
        & $Command
        if ($LASTEXITCODE -ne 0) { throw "$Name failed with exit code $LASTEXITCODE" }
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
        if ($LASTEXITCODE -ne 0) { Write-Warning "Readiness summary reports remaining blockers." }
    }
}

Write-Host "TranslateIT RustApp final validation"
Write-Host "Root: $Root"
Write-Host "RustApp: $RustApp"
Write-Host "Tooling: $Tooling"
Write-Host "Status: internal validation only. Do not mark Ready without manual runtime evidence."

Invoke-ValidationStep "Root professional cleanliness" { python (Join-Path $Tooling "check_root_professional_cleanliness.py") } | Out-Null
Invoke-ValidationStep "Engine and DevelopingData structure" { python (Join-Path $Tooling "check_engine_developing_structure.py") } | Out-Null
Invoke-ValidationStep "Launcher contract" { python (Join-Path $Tooling "check_launcher_contract.py") } | Out-Null
Invoke-ValidationStep "CI validation workflow contract" { python (Join-Path $Tooling "check_ci_validation_workflow.py") } | Out-Null
Invoke-ValidationStep "Local release bundle contract" { python (Join-Path $Tooling "check_translateit_local_release_bundle.py") } | Out-Null
Invoke-ValidationStep "Rust validation evidence boundary" { python (Join-Path $Tooling "check_rust_validation_evidence_boundary.py") } | Out-Null
Invoke-ValidationStep "Frontend runtime contract" { python (Join-Path $Tooling "check_frontend_runtime_contract.py") } | Out-Null
$LocalWorkerStackPassed = Invoke-ValidationStep "Local realtime worker stack" { python (Join-Path $Tooling "check_local_realtime_worker_stack.py") }

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

Write-Host "RustApp final validation completed. Real inference still requires local runtime smoke evidence."
Write-Host "Do not mark owner validation, release candidate, or production Ready until manual runtime checks pass."

if ($ValidationFailed) { exit 1 }
