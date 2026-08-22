# RustApp Scripts

This directory contains TranslateIT's source validators, Windows release entrypoints, and target-PC acceptance tooling.

## Source checks

```text
validate:source-contracts
├─ startup/runtime path checks
├─ Meeting route checks
├─ Rust/Tauri manifest preflight
├─ frontend build preflight
└─ R3 Tauri/package source checks

validate:quick
└─ source checks + TypeScript typecheck
```

`check:tauri-rust-local` is explicit local compile verification and is not run merely to validate documentation/source routing.

## R3 release boundary

User-facing release shape:

```text
src-tauri/target/translateit-release/
├─ TranslateIT-Setup.exe
└─ TranslateIT-Payload.7z
```

`build_release.ps1` is the controlled Windows release entry. It requires a committed tracked working tree, records the exact Git source commit, validates staged inputs, applies the reviewed release optimizer, regenerates third-party notices, builds the external payload, renders the NSIS hook, builds Tauri/NSIS, and requires the user-facing release directory to contain exactly Setup + Payload. Build evidence under ignored `src-tauri/target/` records the source commit, both SHA-256 values, and the app/payload identity.

`build_r3_external_payload.py` uses a build-time-only 7-Zip CLI to create the 7z/LZMA2 payload. 7-Zip is not an installed-product dependency. The generated archive is validated with `tar`/bsdtar, which is also the Windows install-time reader/extractor.

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

## Local target-PC test — one command

`run_local_test.ps1` is the single user-facing PowerShell entrypoint for the current local acceptance run.

From `EngineData/Frontend/RustApp` run only:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run_local_test.ps1
```

The default flow is:

```text
verify branch Local + clean tracked source
→ build current Setup + Payload
→ verify exact source commit and release hashes
→ launch TranslateIT-Setup.exe with normal UAC
→ discover installed runtime
→ if VB-CABLE needs restart, save resume state
→ optionally restart Windows and auto-resume after sign-in
→ verify installed manifest/private Python/dependencies
→ verify VB-CABLE/restart state
→ verify CUDA + BF16
→ ASR preload
→ MiLMMT preload
→ installed-worker ID → EN
→ installed-worker EN → ID
→ launch TranslateIT for the remaining manual product/audio checks
```

If Windows restart is required, type `R` when prompted to register a one-time auto-resume and restart. If you prefer to restart manually, restart Windows and run the **same command** again; the saved state makes the script continue at installed-runtime validation instead of rebuilding.

By default CUDA/BF16 is required. `-AllowCpuFallback` is only for an intentional degraded-mode test and must not be used to turn a failed CUDA target into a normal pass. `-NoLaunchApp` can be used when only automated runtime evidence is wanted.

`run_target_pc_acceptance.ps1` and `build_release.ps1` remain internal helpers used by the all-in-one entrypoint. They may still be invoked directly for diagnosis, but normal local acceptance should start from `run_local_test.ps1` only.

The automated flow writes evidence under ignored `src-tauri/target/`, including:

```text
translateit-r3-release-build.json
translateit-target-pc-preinstall.json
translateit-target-pc-installed-runtime.json
translateit-local-test-session.json
```

Automated core acceptance does **not** replace observation of UAC/driver consent, physical microphone capture, My Voice listening quality, Zoom/Meet/Teams reception, repeated Meeting Start/Stop behavior, uninstall/reinstall, or clean-machine operation.

## CI ownership

`.github/workflows/release-payload-verify.yml` is the single R3 release workflow owner:

- relevant pull requests to `Local` run the source-contract job;
- relevant pushes to `Local` run the source-contract job and the controlled Windows payload-proof job;
- the source-contract job parse-checks the Windows release build, internal target-PC harness, and all-in-one local-test PowerShell entrypoints;
- there is no manual-dispatch path for the current branch model.

The former overlapping release profiling workflows are retired. Worker dependency-lock consistency is owned separately by the read-only WorkerRuntime lock workflow.

## Proof boundary

Source/hosted verification can establish declarations, controlled staging, payload structure, build evidence, and acceptance-tool syntax. It does not prove actual Windows Setup execution, driver consent/restart, installed model execution, GPU/audio behavior, Meeting delivery, or clean-machine readiness.

## Rules

- Do not re-embed the large R3 payload in `tauri.release.conf.json`.
- Do not add network bootstrap/model downloads to installed Setup.
- Do not add a user-facing 7-Zip dependency, manual extraction flow, or second installer.
- Do not create another release pipeline merely to gather duplicate evidence.
- Keep generated hook/payload/build/acceptance evidence under ignored output paths.
