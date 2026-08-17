$ErrorActionPreference = 'Stop'

$AppRoot = Split-Path -Parent $PSScriptRoot
Push-Location $AppRoot
try {
    # Validate the complete controlled staging input before release-only trimming.
    node scripts/generate_third_party_notices.mjs --write
    if ($LASTEXITCODE -ne 0) { throw 'TranslateIT third-party notice generation failed.' }

    npm run preflight:release-payload
    if ($LASTEXITCODE -ne 0) { throw 'TranslateIT release payload preflight failed.' }

    $BackendRoot = (Resolve-Path (Join-Path $AppRoot '..\..\Backend')).Path
    $ReleasePython = Join-Path $BackendRoot 'LocalWorker\PythonRuntime\python.exe'
    $Optimizer = Join-Path $PSScriptRoot 'optimize_release_payload.py'
    if (-not (Test-Path -LiteralPath $ReleasePython -PathType Leaf)) {
        throw 'TranslateIT release optimization requires the staged private PythonRuntime.'
    }
    if (-not (Test-Path -LiteralPath $Optimizer -PathType Leaf)) {
        throw 'TranslateIT release payload optimizer is missing.'
    }

    & $ReleasePython -s $Optimizer --backend-root $BackendRoot
    if ($LASTEXITCODE -ne 0) { throw 'TranslateIT release payload optimization failed.' }

    # Notices are regenerated from the final optimized Python closure. The initial
    # preflight above remains the fail-closed validation of the complete controlled
    # input; the optimizer itself only removes the profiled release exclusions.
    node scripts/generate_third_party_notices.mjs --write
    if ($LASTEXITCODE -ne 0) { throw 'TranslateIT optimized third-party notice generation failed.' }

    $TauriCli = Join-Path $AppRoot 'node_modules\.bin\tauri.cmd'
    if (-not (Test-Path -LiteralPath $TauriCli -PathType Leaf)) {
        throw 'TranslateIT release requires the local @tauri-apps/cli installed from package-lock.json. Run npm ci; dynamic CLI download is not allowed.'
    }
    & $TauriCli build --config src-tauri/tauri.release.conf.json
    if ($LASTEXITCODE -ne 0) { throw 'TranslateIT Tauri/NSIS release build failed.' }
}
finally {
    Pop-Location
}
