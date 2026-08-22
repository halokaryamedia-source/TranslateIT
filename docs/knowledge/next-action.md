# TranslateIT — Next Action

## Current Status

`MILMMT-46-1B-v1.0 CURRENT / MY VOICE NAMING NORMALIZED / REPO-SIDE CLEANUP CLOSED / WINDOWS R3 HOSTED PAYLOAD PROOF PASSED / ROOT ONE-COMMAND TARGET-PC ACCEPTANCE PREPARED / LOCAL TEST NEXT`

## Active Boundary

- `Local` is the current development authority.
- `Developing` remains the GitHub default branch and historical/recovery authority; it is not a silent write target.
- Product-facing custom-voice terminology is **My Voice**. Existing `voice_lab_*` command/error identifiers and `UserData/.../VoiceLab/...` directories remain only where they are protocol/storage compatibility identifiers.
- Translator remains `xiaomi-research/MiLMMT-46-1B-v1.0` at revision `4fc480b6c58dec29c159dcdf9fde0f6d5c354995`.
- WorkerRuntime dependency versions remain Python 3.12.x + Torch 2.11.0/cu126 + Transformers 4.57.6 + Tokenizers 0.22.2; Accelerate 1.14.0 remains required for the CUDA `device_map` path.
- Release evidence is bound to the exact committed Git source revision through `source_commit`; tracked source must be clean before release build/acceptance.
- Root `Run-Local-Test.ps1` is the single normal user-facing local-test entrypoint. It delegates to the internal runner without hardcoding a machine path, so repository locations containing spaces are supported.
- The all-in-one flow owns current release build, PreInstall verification, UAC Setup launch, installed-root discovery, restart/resume handling, InstalledRuntime validation, private Python/dependency checks, VB-CABLE/restart evidence, Torch CUDA/BF16, ASR preload, MiLMMT preload, and installed-worker ID→EN + EN→ID fixtures.
- If a new VB-CABLE install requires reboot, ignored resume state is written. The user may type `R` to register one-time RunOnce auto-resume and restart, or restart manually and invoke the same root script again.
- Automated acceptance does not claim physical microphone behavior, My Voice listening quality, Zoom/Meet/Teams reception, repeated Meeting lifecycle, uninstall/reinstall, or clean-machine proof. Those remain target-PC observations.
- Acceptance evidence stays under ignored `EngineData/Frontend/RustApp/src-tauri/target/` output and is not a new source-of-truth/status system.

## Closed Development Boundary

Do not reopen model selection, MiLMMT tuning, dependency convergence, worker architecture, R3 payload representation, installer lifecycle, or retired workflow cleanup without a concrete target-PC defect. Do not rename compatibility-bound `voice_lab_*` protocol/storage identifiers merely for cosmetic consistency.

## Next Step

**On the Windows test machine, sync the repository to current `Local`, open PowerShell in the repository root, and run only `.\Run-Local-Test.ps1`. Follow normal UAC/driver prompts. If the script reports a concrete failure, preserve the generated JSON evidence and diagnose that first failing boundary before changing source.**
