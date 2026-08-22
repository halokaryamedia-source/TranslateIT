# TranslateIT — Next Action

## Current Status

`MILMMT-46-1B-v1.0 CURRENT / MY VOICE NAMING NORMALIZED / REPO-SIDE CLEANUP CLOSED / WINDOWS R3 HOSTED PAYLOAD PROOF PASSED / TARGET-PC ACCEPTANCE HARNESS PREPARED / CURRENT RELEASE PAIR REBUILD REQUIRED BEFORE LOCAL TEST`

## Active Boundary

- `Local` is the current development authority.
- `Developing` remains the GitHub default branch and historical/recovery authority; it is not a silent write target.
- Product-facing custom-voice terminology is **My Voice**. Existing `voice_lab_*` command/error identifiers and `UserData/.../VoiceLab/...` directories remain only where they are protocol/storage compatibility identifiers.
- Translator remains `xiaomi-research/MiLMMT-46-1B-v1.0` at revision `4fc480b6c58dec29c159dcdf9fde0f6d5c354995`.
- WorkerRuntime dependency versions remain Python 3.12.x + Torch 2.11.0/cu126 + Transformers 4.57.6 + Tokenizers 0.22.2; Accelerate 1.14.0 remains required for the CUDA `device_map` path.
- The R3 packaging shape remains one offline `TranslateIT-Setup.exe` plus colocated `TranslateIT-Payload.7z`.
- Hosted Windows R3 run `32473226976` passed source and controlled payload-build proof; this remains hosted evidence only.
- Source changed after the earlier user-facing release pair was produced. Because application version remains `0.1.0`, the acceptance path now binds release evidence to the exact committed Git source revision. `build_release.ps1` refuses tracked local modifications and writes `source_commit`; `PreInstall` rejects evidence that is missing that field or differs from current HEAD.
- `EngineData/Frontend/RustApp/scripts/run_target_pc_acceptance.ps1` is the bounded local Windows acceptance harness. `PreInstall` verifies current source identity plus the final Setup/Payload hashes. `InstalledRuntime` verifies the installed manifest/private runtime, Accelerate, model revisions, VB-CABLE/restart evidence, Torch CUDA/BF16, ASR preload, MiLMMT preload, and installed-worker ID→EN + EN→ID fixtures.
- The acceptance harness does not install/uninstall software, change audio settings, create My Voice, or claim physical microphone, My Voice quality, Meeting reception, uninstall/reinstall, or clean-machine proof. Those remain manual target-PC observations.
- Acceptance evidence is written under ignored `src-tauri/target/` output and is not a new source-of-truth/status system.

## Closed Development Boundary

Do not reopen model selection, MiLMMT tuning, dependency convergence, worker architecture, R3 payload representation, installer lifecycle, or retired workflow cleanup without a concrete target-PC defect. Do not rename compatibility-bound `voice_lab_*` protocol/storage identifiers merely for cosmetic consistency.

## Next Step

**After the source-binding change is fast-forwarded to `Local`, sync the Windows test workspace to that exact `Local` HEAD and rebuild the final pair with `EngineData/Frontend/RustApp/scripts/build_release.ps1`. Then run `run_target_pc_acceptance.ps1 -Phase PreInstall`; do not install any older Setup/Payload pair.**
