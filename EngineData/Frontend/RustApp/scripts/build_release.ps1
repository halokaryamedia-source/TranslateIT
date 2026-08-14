$ErrorActionPreference = 'Stop'

$AppRoot = Split-Path -Parent $PSScriptRoot
Push-Location $AppRoot
try {
    npm run preflight:release-payload
    if ($LASTEXITCODE -ne 0) { throw 'TranslateIT release payload preflight failed.' }

    npm exec -- tauri build --config src-tauri/tauri.release.conf.json
    if ($LASTEXITCODE -ne 0) { throw 'TranslateIT Tauri/NSIS release build failed.' }
}
finally {
    Pop-Location
}
