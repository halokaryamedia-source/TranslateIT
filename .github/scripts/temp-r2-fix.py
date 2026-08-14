from pathlib import Path

root = Path('.')

build_path = root / 'EngineData/Frontend/RustApp/scripts/build_release.ps1'
build = build_path.read_text(encoding='utf-8')
old = '''    npm exec -- tauri build --config src-tauri/tauri.release.conf.json
    if ($LASTEXITCODE -ne 0) { throw 'TranslateIT Tauri/NSIS release build failed.' }
'''
new = '''    $TauriCli = Join-Path $AppRoot 'node_modules\\.bin\\tauri.cmd'
    if (-not (Test-Path -LiteralPath $TauriCli -PathType Leaf)) {
        throw 'TranslateIT release requires the local @tauri-apps/cli installed from package-lock.json. Run npm ci; dynamic CLI download is not allowed.'
    }
    & $TauriCli build --config src-tauri/tauri.release.conf.json
    if ($LASTEXITCODE -ne 0) { throw 'TranslateIT Tauri/NSIS release build failed.' }
'''
if old not in build:
    raise SystemExit('build_release npm exec anchor not found')
build_path.write_text(build.replace(old, new, 1), encoding='utf-8')

contract_path = root / 'EngineData/Frontend/RustApp/scripts/validate_release_package_contract.mjs'
contract = contract_path.read_text(encoding='utf-8')
old_markers = '''for (const marker of [
  "node scripts/generate_third_party_notices.mjs --write",
  "npm run preflight:release-payload",
  "npm exec -- tauri build --config src-tauri/tauri.release.conf.json",
]) {
  if (!buildRelease.includes(marker)) fail(`Controlled Windows release build marker is missing: ${marker}`);
}
'''
new_markers = '''for (const marker of [
  "node scripts/generate_third_party_notices.mjs --write",
  "npm run preflight:release-payload",
  "node_modules\\\\.bin\\\\tauri.cmd",
  "dynamic CLI download is not allowed",
  "& $TauriCli build --config src-tauri/tauri.release.conf.json",
]) {
  if (!buildRelease.includes(marker)) fail(`Controlled Windows release build marker is missing: ${marker}`);
}
if (buildRelease.includes("npm exec") || buildRelease.includes("npx ")) {
  fail("Controlled Windows release build must use only the locally installed Tauri CLI; npm exec/npx download-capable execution is forbidden.");
}
'''
if old_markers not in contract:
    raise SystemExit('release contract npm exec anchor not found')
contract_path.write_text(contract.replace(old_markers, new_markers, 1), encoding='utf-8')

print('[r2] bounded release CLI source patch applied')
