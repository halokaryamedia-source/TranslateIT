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

## Local target-PC test — one command

Normal local acceptance starts from the repository-root wrapper:

```powershell
.\Run-Local-Test.ps1
```

For example, when the repository lives at `D:\Work\AI Stuff\TranslateIT`:

```powershell
cd "D:\Work\AI Stuff\TranslateIT"
.\Run-Local-Test.ps1
```

The wrapper resolves the internal runner from its own repository location, so paths containing spaces are supported and the repository does not depend on one machine-specific absolute path.

### Fresh-clone bootstrap

A plain Git clone intentionally does **not** contain the large release runtime/model payload. `Run-Local-Test.ps1` therefore prepares the build machine before it delegates to the normal release/acceptance runner.

It checks for:

```text
Node.js / npm
host Python 3.12.x + pip
Rust toolchain (cargo/rustc)
7-Zip CLI
Visual Studio 2022 C++ Build Tools
```

If locked frontend/Tauri dependencies are absent it runs `npm ci`. If the ignored release inputs are absent or incomplete it runs the repository-owned release staging path for private Python/dependencies, ASR, MiLMMT, GPT-SoVITS assets/source, NLTK data, FFmpeg, and VB-CABLE, then runs `stage_release_license_material.py` before the release build. The first preparation may download several GB and is expected to take materially longer than later runs.

Do not manually copy models, install a second Python runtime into the product, or bypass the staged identity/hash checks merely to make a fresh clone build.

### Windows PowerShell compatibility

The current target-PC bootstrap may be launched from Windows PowerShell 5.1. `Set-Content -Encoding utf8NoBOM` is not supported by PowerShell 5.1, so release staging has an explicit compatibility boundary:

```text
stage_release_inputs.ps1
→ PowerShell-version compatibility entrypoint

stage_release_inputs_impl.ps1
→ canonical full staging implementation
```

PowerShell 7+ executes the implementation unchanged. Windows PowerShell 5.1 executes a temporary same-directory compatibility copy with only the unsupported encoding enum replaced for the temporary generated Python helper. The runtime/model sources, revisions, hashes, release identity, and staging behavior are otherwise unchanged.

The default local-test flow is:

```text
verify branch Local + clean tracked source
→ verify/build-machine prerequisites
→ stage fresh-clone release inputs when required
→ stage reviewed license material
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

If Windows restart is required, type `R` when prompted to register a one-time auto-resume and restart. If you prefer to restart manually, restart Windows and run the **same root command** again; saved ignored state makes the script continue at installed-runtime validation instead of rebuilding.

By default CUDA/BF16 is required. `-AllowCpuFallback` is only for an intentional degraded-mode test and must not be used to turn a failed CUDA target into a normal pass. `-NoLaunchApp` can be used when only automated runtime evidence is wanted.

`EngineData/Frontend/RustApp/scripts/run_local_test.ps1`, `run_target_pc_acceptance.ps1`, and `build_release.ps1` are implementation helpers behind the root entrypoint. They remain directly callable for diagnosis, but normal acceptance should use `Run-Local-Test.ps1` only.

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
- the source-contract job parse-checks the root wrapper plus the Windows release/acceptance PowerShell helpers;
- canonical MiLMMT validation also preserves the release staging model-acquisition contract;
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
