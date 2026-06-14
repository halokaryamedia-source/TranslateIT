$ErrorActionPreference = "Stop"

param(
    [string]$AudioPath = "",
    [ValidateSet("Realtime", "Quality")]
    [string]$Mode = "Realtime",
    [string]$Text = "halo",
    [string]$TtsText = "Hello."
)

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$NodeTooling = Join-Path $Root "DevelopingData\Tooling\Scripts\Execution\translateit_tooling.mjs"

if (-not (Test-Path $NodeTooling)) {
    throw "Missing Node tooling script: $NodeTooling"
}

Write-Host "TranslateIT local realtime worker smoke test"
Write-Host "Root: $Root"
Write-Host "Mode: $Mode"
Write-Host "AudioPath: $AudioPath"
Write-Host "Persistent worker: true"

node $NodeTooling smoke-worker

Write-Host "Smoke test finished. Owner validation remains blocked unless latest_validation_evidence.json and manual runtime evidence are complete."
