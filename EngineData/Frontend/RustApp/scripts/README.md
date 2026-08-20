# RustApp Scripts

This directory contains TranslateIT's bounded source validators and controlled Windows release entrypoints.

## Source checks

```text
validate:source-contracts
├─ startup/runtime path contract
├─ Meeting route contract
├─ Rust/Tauri manifest preflight
├─ frontend build preflight
└─ R3 Tauri/package source contract

validate:quick
└─ source contracts + TypeScript typecheck
```

`check:tauri-rust-local` is explicit local compile proof and is not run merely to validate documentation/source routing.

## R3 release boundary

User-facing release shape:

```text
src-tauri/target/translateit-release/
├─ TranslateIT-Setup.exe
└─ TranslateIT-Payload.7z
```

`build_release.ps1` is the controlled Windows release entry. It validates staged inputs, applies the reviewed release optimizer, regenerates third-party notices, builds the external payload, renders the trusted NSIS hook, builds Tauri/NSIS, and requires the user-facing release directory to contain exactly Setup + Payload. Build evidence under ignored `src-tauri/target/` records both SHA-256 values and the app/payload identity.

`build_r3_external_payload.py` uses a **build-time-only 7-Zip CLI** to create the 7z/LZMA2 payload. 7-Zip is not an installed-product dependency. The generated archive is validated with `tar`/bsdtar, which is also the Windows install-time reader/extractor.

Large external payload roots are:

- `EngineData/Backend/LocalWorker/PythonRuntime`
- `EngineData/Backend/RuntimeAssets/ASR/ModelData`
- `EngineData/Backend/RuntimeAssets/Translation/ModelData`
- `EngineData/Backend/RuntimeAssets/Voice/GPTSoVITS`
- `EngineData/Backend/RuntimeAssets/AudioProvider/VBCABLE/Package`

They are deliberately not Tauri resources.

## Installer lifecycle source

R3 uses `perMachine` NSIS mode. The generated hook and `r3_payload_installer.ps1` make Setup responsible for:

```text
find colocated payload
→ verify SHA-256 + app/schema/dependency/model identity
→ check expanded disk-space budget
→ extract to staging
→ verify staged runtime
→ invoke reviewed VB-CABLE vendor setup if absent
→ transactionally replace external application runtime
→ verify private Python dependency versions
→ write installed-runtime manifest
→ signal restart when a new driver install requires it
```

Windows driver-security consent is not bypassed or auto-clicked. Re-running Setup is the repair/reinstall path. Uninstall removes TranslateIT-owned external runtime but preserves app-local user data and the system VB-CABLE driver.

## CI ownership

`.github/workflows/release-payload-verify.yml` is the single R3 release workflow owner:

- cheap source contract on relevant push/PR changes;
- heavy controlled Windows payload staging/build evidence only when manually dispatched.

The former overlapping release profiling workflows are retired. Worker dependency-lock consistency is owned separately by a read-only `uv lock --check` workflow.

## Proof boundary

Source/hosted proof can establish declarations, controlled staging, payload structure, and build evidence. It does not prove actual Windows Setup execution, driver consent/restart, installed model execution, GPU/audio behavior, Meeting delivery, or clean-machine readiness.

## Rules

- Do not re-embed the large R3 payload in `tauri.release.conf.json`.
- Do not add network bootstrap/model downloads to installed Setup.
- Do not add a user-facing 7-Zip dependency, manual extraction flow, or second installer.
- Do not create another release pipeline merely to gather duplicate evidence.
- Keep generated hook/payload/build evidence under ignored output paths.
