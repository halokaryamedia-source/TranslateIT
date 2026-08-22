param(
    [switch]$AllowCpuFallback,
    [switch]$NoLaunchApp,
    [ValidateRange(30, 600)]
    [int]$WorkerTimeoutSeconds = 300
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Runner = Join-Path $PSScriptRoot "EngineData\Frontend\RustApp\scripts\run_local_test.ps1"
if (-not (Test-Path -LiteralPath $Runner -PathType Leaf)) {
    throw "TranslateIT local-test runner is missing: $Runner"
}

$args = @("-WorkerTimeoutSeconds", [string]$WorkerTimeoutSeconds)
if ($AllowCpuFallback) { $args += "-AllowCpuFallback" }
if ($NoLaunchApp) { $args += "-NoLaunchApp" }

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File $Runner @args
exit $LASTEXITCODE
