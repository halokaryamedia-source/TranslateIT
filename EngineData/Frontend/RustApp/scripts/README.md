# RustApp Scripts

This directory contains the small set of source validation and Windows release entrypoints owned by the current TranslateIT product.

## Source checks

```text
validate:source-contracts
├─ startup/runtime path contract
├─ internal Meeting route contract
├─ Rust/Tauri manifest preflight
├─ frontend build preflight
└─ R3 Tauri/package source contract

validate:quick
└─ source contracts + TypeScript typecheck
```

`check:tauri-rust-local` remains an explicit local compile command and is not source-only proof. It reuses Cargo incremental output by default; set `TRANSLATEIT_CLEAN_RUST_TARGET=1` only for a deliberate clean compile.

## R3 release boundary

The approved release shape is:

```text
src-tauri/target/translateit-release/
├─ TranslateIT-Setup.exe
└─ TranslateIT-Payload.7z
```

`build_release.ps1` owns the full Windows release build. The controlled runtime/model inputs are validated and optimized first, then `build_r3_external_payload.py` creates the external `7z/LZMA2` payload and SHA-256 build evidence. A temporary ignored NSIS hook is rendered under `src-tauri/target/`; Tauri compiles that trusted payload hash into `TranslateIT-Setup.exe`. The generated hook is removed when the build exits.

At install time the user runs **only** `TranslateIT-Setup.exe`. Setup validates the colocated payload SHA-256 and archive readability before install, then extracts it automatically into `$INSTDIR`, which is also the Windows Tauri `resource_dir` runtime root. The user is not asked to install Python, run pip/PowerShell, download models, open 7-Zip, manually extract payloads, or run a second setup.

Large controlled payload roots are deliberately **not** Tauri resources:

- `EngineData/Backend/LocalWorker/PythonRuntime`
- `EngineData/Backend/RuntimeAssets/ASR/ModelData`
- `EngineData/Backend/RuntimeAssets/Translation/ModelData`
- `EngineData/Backend/RuntimeAssets/Voice/GPTSoVITS`
- `EngineData/Backend/RuntimeAssets/AudioProvider/VBCABLE/Package`

The Tauri/NSIS resource map carries only the small canonical worker/control files, model manifest, third-party notices, and VB-CABLE distribution notice.

## Proof boundary

Source checks prove declarations and fail-closed routing only. A successful `build_release.ps1` run is **build artifact proof**, not installed-runtime or clean-machine proof. Windows installation, GPU/audio behavior, VB-CABLE installation, model execution, and clean-target acceptance remain separate evidence.

## Rules

- Do not re-embed the large R3 payload into `tauri.release.conf.json`.
- Do not add network bootstrap/download behavior to Setup.
- Do not add a user-facing 7-Zip dependency or second installer.
- Do not reintroduce retired translator/runtime paths for packaging convenience.
- Generated proof belongs under ignored `src-tauri/target/` or other ignored `.tmp/` paths.
