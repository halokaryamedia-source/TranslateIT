# TranslateIT — Next Action

## Current Status

`MILMMT-46-1B-v1.0 CURRENT / MY VOICE NAMING NORMALIZED / REPO-SIDE CLEANUP CLOSED / WINDOWS R3 HOSTED PAYLOAD PROOF PASSED / TARGET-PC ACCEPTANCE IN PROGRESS / FRESH-CLONE BOOTSTRAP + WINDOWS POWERSHELL 5.1 STAGING FIXED / LOCAL RERUN REQUIRED / REPOSITORY HANDOFF READY`

## Active Boundary

- `Local` is the current development authority. `Developing` remains the GitHub default branch and historical/recovery authority; it is not a silent write target.
- This repository is the handoff authority for continuation outside the current ChatGPT session. A new tool/operator should recover context from `AGENTS.md` → `GITHUB_RULES.md` → `CONTEXT.md` → this file, then inspect only the first failing owner.
- Product-facing custom-voice terminology is **My Voice**. Existing `voice_lab_*` command/error identifiers and `UserData/.../VoiceLab/...` directories remain only where they are protocol/storage compatibility identifiers.
- Translator remains `xiaomi-research/MiLMMT-46-1B-v1.0` at revision `4fc480b6c58dec29c159dcdf9fde0f6d5c354995`.
- WorkerRuntime dependency authority remains Python 3.12.x + Torch 2.11.0/cu126 + Transformers 4.57.6 + Tokenizers 0.22.2; Accelerate 1.14.0 remains required for the CUDA `device_map` path.
- The active **R3 packaging** shape remains one offline `TranslateIT-Setup.exe` plus colocated `TranslateIT-Payload.7z`; target-PC acceptance must exercise that exact pair rather than a development-only launch path.
- Release evidence is bound to the exact committed Git source revision through `source_commit`; tracked source must be clean before release build/acceptance.
- Current Windows test workspace is `D:\Work\AI Stuff\TranslateIT`. Repository paths containing spaces are supported and must not be replaced with machine-specific hardcoding in source.
- Root `Run-Local-Test.ps1` is the single normal user-facing local-test entrypoint. From the repository root, normal acceptance is `.\Run-Local-Test.ps1`.
- On a fresh clone, the root runner checks Node/npm, host Python 3.12 with pip, Rust/cargo, 7-Zip CLI, and Visual Studio 2022 C++ Build Tools; runs locked `npm ci` when needed; stages ignored private Python/runtime/model/audio release inputs; stages reviewed exceptional license material; then delegates to the existing build/install/acceptance runner.
- Large runtime/model inputs intentionally remain outside Git. Fresh-clone staging may download several GB: private Python/dependencies, ASR, MiLMMT, GPT-SoVITS assets/source, FFmpeg, NLTK data, and VB-CABLE.
- `EngineData/Frontend/RustApp/scripts/stage_release_inputs.ps1` is now the PowerShell-version compatibility entrypoint. The full canonical staging implementation is `stage_release_inputs_impl.ps1`. PowerShell 7+ runs the implementation unchanged; Windows PowerShell 5.1 uses a temporary same-directory compatibility copy for the single unsupported `utf8NoBOM` encoding token.
- The all-in-one acceptance flow owns current release build, PreInstall verification, UAC Setup launch, installed-root discovery, restart/resume handling, InstalledRuntime validation, private Python/dependency checks, VB-CABLE/restart evidence, Torch CUDA/BF16, ASR preload, MiLMMT preload, and installed-worker ID→EN + EN→ID fixtures.
- If a new VB-CABLE install requires reboot, ignored resume state is written. The user may type `R` to register one-time RunOnce auto-resume and restart, or restart manually and invoke the same root script again.
- Automated acceptance does not claim physical microphone behavior, My Voice listening quality, Zoom/Meet/Teams reception, repeated Meeting lifecycle, uninstall/reinstall, or clean-machine proof. Those remain target-PC observations.
- Acceptance evidence stays under ignored `EngineData/Frontend/RustApp/src-tauri/target/` output and is not a new source-of-truth/status system.

## Observed Target-PC Test Evidence

1. **Fresh-clone attempt 1** reached `build_release.ps1` and failed at third-party notice generation because ignored release inputs were absent on the new Windows workspace. The notice generator requires the staged private Python runtime plus package/license/model/provider material; a plain Git clone is intentionally insufficient for that build boundary.
2. **Fix merged:** PR #36, commit `9307258ca613cdc10db16091e5e6a41f292be902`, extended root `Run-Local-Test.ps1` so fresh-clone local acceptance stages the existing controlled release inputs and license material before building. R3 source-contract CI passed before merge.
3. During the next real staging run, `uv` reported `Failed to hardlink files; falling back to full copy`. This is a performance/storage warning only, not a runtime failure. The observed environment convergence replaced Transformers 4.50.0 → 4.57.6 and Tokenizers 0.21.4 → 0.22.2, matching current authority.
4. **Fresh-clone attempt 2** then failed in `stage_release_inputs.ps1` because the target PC is using Windows PowerShell 5.1, whose `Set-Content -Encoding` enum does not support `utf8NoBOM`.
5. **Fix merged:** PR #37, final commit `baac4c3af9ea63b463e0c5c1e1bac206217c402c`, added the PowerShell 5.1 compatibility entrypoint while preserving the canonical staging implementation and MiLMMT contract markers. R3 source-contract and canonical MiLMMT validation passed before merge.
6. **No target-PC success claim yet.** The latest PowerShell 5.1 compatibility fix has not yet been rerun through the full Windows sequence. Setup execution, installed private runtime, CUDA/BF16, ASR/MiLMMT runtime, VB-CABLE, microphone, My Voice, Meeting delivery, uninstall/reinstall, and clean-machine acceptance remain unproven until the rerun reaches those boundaries.

## Current Source / Evidence Entry Points

```text
Run-Local-Test.ps1
EngineData/Frontend/RustApp/scripts/run_local_test.ps1
EngineData/Frontend/RustApp/scripts/run_target_pc_acceptance.ps1
EngineData/Frontend/RustApp/scripts/build_release.ps1
EngineData/Frontend/RustApp/scripts/stage_release_inputs.ps1
EngineData/Frontend/RustApp/scripts/stage_release_inputs_impl.ps1
EngineData/Frontend/RustApp/scripts/stage_release_license_material.py
EngineData/Frontend/RustApp/src-tauri/target/translateit-r3-release-build.json
EngineData/Frontend/RustApp/src-tauri/target/translateit-target-pc-preinstall.json
EngineData/Frontend/RustApp/src-tauri/target/translateit-target-pc-installed-runtime.json
EngineData/Frontend/RustApp/src-tauri/target/translateit-local-test-session.json
```

Generated `src-tauri/target/` evidence is local/ignored and may be absent until the matching phase actually runs. Do not manufacture missing evidence or convert hosted/static checks into target-PC proof.

## Closed Development Boundary

Do not reopen model selection, MiLMMT tuning, dependency convergence, worker architecture, R3 payload representation, installer lifecycle, naming cleanup, or retired workflow cleanup without a concrete target-PC defect or new explicit requirement. Do not rename compatibility-bound `voice_lab_*` protocol/storage identifiers merely for cosmetic consistency. Diagnose the first reproducible local failure before changing source.

## Next Step

**On the Windows test machine, sync `D:\Work\AI Stuff\TranslateIT` to current `Local` (this handoff commit or newer), keep tracked source clean, then run only `.\Run-Local-Test.ps1` from the repository root. Preserve the first failing console output and any generated JSON evidence; continue by diagnosing that first failing boundary rather than applying manual runtime/model repairs.**
