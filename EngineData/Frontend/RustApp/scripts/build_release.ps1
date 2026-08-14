$ErrorActionPreference = 'Stop'

$AppRoot = Split-Path -Parent $PSScriptRoot
Push-Location $AppRoot
try {
    node scripts/generate_third_party_notices.mjs --write
    if ($LASTEXITCODE -ne 0) { throw 'TranslateIT third-party notice generation failed.' }

    npm run preflight:release-payload
    if ($LASTEXITCODE -ne 0) { throw 'TranslateIT release payload preflight failed.' }

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
