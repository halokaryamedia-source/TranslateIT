$ErrorActionPreference = "Continue"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")
$Tooling = Join-Path $Root "DevelopingData\Tooling\Scripts\Execution"
$RustApp = Join-Path $Root "EngineData\LauncherApp\RustApp"
$NodeTooling = Join-Path $Tooling "translateit_tooling.mjs"
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
    if (Test-Path $NodeTooling) {
        Write-Host "[summary] Writing evidence-based readiness summary"
        node $NodeTooling summarize-readiness
        if ($LASTEXITCODE -ne 0) { Write-Warning "Readiness summary reports remaining blockers." }
    }
}

Write-Host "TranslateIT RustApp final validation"
Write-Host "Root: $Root"
Write-Host "RustApp: $RustApp"
Write-Host "Tooling: $Tooling"
Write-Host "Status: internal validation only. Do not mark Ready without manual runtime evidence."

Invoke-ValidationStep "Root professional cleanliness" { node $NodeTooling validate-root } | Out-Null
Invoke-ValidationStep "Engine and DevelopingData structure" { node $NodeTooling validate-structure } | Out-Null
Invoke-ValidationStep "Launcher contract" { node $NodeTooling validate-launcher } | Out-Null
Invoke-ValidationStep "CI validation workflow contract" { node $NodeTooling validate-ci } | Out-Null
Invoke-ValidationStep "Local release bundle contract" { node $NodeTooling validate-release } | Out-Null
Invoke-ValidationStep "Rust validation evidence boundary" { node $NodeTooling validate-evidence } | Out-Null
Invoke-ValidationStep "Frontend runtime contract" { node $NodeTooling validate-frontend } | Out-Null
$LocalWorkerStackPassed = Invoke-ValidationStep "Local realtime worker stack" { node $NodeTooling validate-worker }

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
    node $NodeTooling write-validation-evidence $RustCheckPassed $TypecheckPassed $FrontendBuildPassed $TauriBuildPassed $PackagingPassed $LocalWorkerStackPassed
    Invoke-ReadinessSummary
}

Write-Host "RustApp final validation completed. Real inference still requires local runtime smoke evidence."
Write-Host "Do not mark owner validation, release candidate, or production Ready until manual runtime checks pass."

if ($ValidationFailed) { exit 1 }
