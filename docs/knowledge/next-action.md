# TranslateIT — Next Action

## Current Status

`MILMMT-46-1B-v1.0 CURRENT / MY VOICE NAMING NORMALIZED / REPO-SIDE CLEANUP CLOSED / WINDOWS R3 HOSTED PAYLOAD PROOF PASSED / TARGET-PC ACCEPTANCE IN PROGRESS / FRESH-CLONE + POWERSHELL 5.1 FIXES MERGED / AUDIT CLEANUP WAVE APPLIED UNCOMMITTED ON LOCAL / LOCAL RERUN REQUIRED / HANDOFF READY`

## Active Boundary

- `Local` is the current development authority. `Developing` remains the GitHub default branch and historical/recovery authority; it is not a silent write target.
- This repository is the continuation authority for another tool/operator. Recover `AGENTS.md` → `GITHUB_RULES.md` → `CONTEXT.md` → this file, then diagnose only the first failing owner.
- Product-facing custom voice is **My Voice**. Existing `voice_lab_*` identifiers and `UserData/.../VoiceLab/...` paths remain only where required for protocol/storage compatibility.
- Translator remains `xiaomi-research/MiLMMT-46-1B-v1.0` revision `4fc480b6c58dec29c159dcdf9fde0f6d5c354995` with Python 3.12.x + Torch 2.11.0/cu126 + Transformers 4.57.6 + Tokenizers 0.22.2 + Accelerate 1.14.0.
- Active **R3 packaging** remains one offline `TranslateIT-Setup.exe` plus colocated `TranslateIT-Payload.7z`. Release evidence is bound to the exact committed source through `source_commit`.
- Current Windows test workspace: `D:\Work\AI Stuff\TranslateIT`. Root `.\Run-Local-Test.ps1` is the single normal local-test entrypoint and supports repository paths containing spaces.
- Fresh-clone bootstrap checks build prerequisites, runs locked `npm ci` when needed, stages ignored private runtime/model/audio inputs plus reviewed license material, then delegates to build/install/acceptance. Large release inputs intentionally remain outside Git and first staging may download several GB.
- `scripts/stage_release_inputs.ps1` is the PowerShell-version compatibility entrypoint; `stage_release_inputs_impl.ps1` is the full staging implementation. Windows PowerShell 5.1 compatibility is limited to the unsupported `utf8NoBOM` encoding token for a temporary generated Python helper.
- Automated acceptance covers Setup/Payload identity, install/restart state, private runtime/dependencies, VB-CABLE presence, CUDA/BF16, ASR preload, MiLMMT preload, and installed-worker ID→EN + EN→ID. Physical microphone, My Voice listening quality, Meeting-app reception, repeated Meeting lifecycle, uninstall/reinstall, and clean-machine proof remain manual target-PC evidence.
- Architecture-audit cleanup (uncommitted on `Local`, all static proofs green: `validate:quick`, `cargo check/test` 47/47 with dead-code denies, ruff/compileall, `verify_repository.py`): stale contract validators repaired and wired into CI (`code-health.yml` runs the previously orphaned validators; `release-payload-verify.yml` parses the staging/installer PowerShell), frontend readiness single-sourced through the facade (approved My Voice truth included) with one close-decision ladder, dead compat matcher/orphaned generation helpers removed, standalone Text translate deadline class (180s) separated from MeetingOutbound 90s, ASR blocker taxonomy split, silent-loss counters surfaced, `write_atomic` settings backup/restore hardened, VAD diagnostics aligned to the active profile, input preflight no longer hard-rejects convertible formats. Deferred pending target-PC evidence or a product decision: capture-callback hot-path consolidation (C1), delivery-tail drain semantics, model-byte SHA-256 pinning, post-build Setup hook scan, context/tone absence policy.

## Observed Target-PC Test Evidence

1. Fresh-clone attempt 1 failed in `build_release.ps1` at third-party notice generation because ignored release inputs were absent. A plain Git clone intentionally does not contain the private runtime/models required by the release build.
2. PR #36 / commit `9307258ca613cdc10db16091e5e6a41f292be902` fixed the root runner so fresh-clone acceptance stages the existing controlled release inputs and license material before build. R3 source-contract CI passed before merge.
3. The next staging run showed `uv` hardlink fallback to full copy. This is a performance/storage warning, not a failure. The observed dependency convergence updated Transformers 4.50.0 → 4.57.6 and Tokenizers 0.21.4 → 0.22.2, matching current authority.
4. Fresh-clone attempt 2 failed because Windows PowerShell 5.1 does not support `Set-Content -Encoding utf8NoBOM`.
5. PR #37 / commit `baac4c3af9ea63b463e0c5c1e1bac206217c402c` added the PowerShell 5.1 staging compatibility boundary while preserving the canonical staging implementation and MiLMMT contract markers. R3 source-contract and canonical MiLMMT validation passed before merge.
6. **No target-PC success claim yet.** The PowerShell 5.1 fix has not yet completed a full rerun. Setup, installed private runtime, CUDA/BF16, ASR/MiLMMT execution, VB-CABLE, microphone, My Voice, Meeting delivery, uninstall/reinstall, and clean-machine acceptance remain unproven until reached on the Windows PC.

## Current Entry Points

```text
Run-Local-Test.ps1
EngineData/Frontend/RustApp/scripts/run_local_test.ps1
EngineData/Frontend/RustApp/scripts/run_target_pc_acceptance.ps1
EngineData/Frontend/RustApp/scripts/build_release.ps1
EngineData/Frontend/RustApp/scripts/stage_release_inputs.ps1
EngineData/Frontend/RustApp/scripts/stage_release_inputs_impl.ps1
EngineData/Frontend/RustApp/scripts/stage_release_license_material.py
```

Local ignored evidence, when generated, is under `EngineData/Frontend/RustApp/src-tauri/target/` (`translateit-r3-release-build.json`, target-PC preinstall/installed-runtime JSON, and local-test session JSON). Missing evidence must not be fabricated or replaced by hosted/static claims.

## Closed Development Boundary

Do not reopen model selection, MiLMMT tuning, dependency convergence, worker architecture, R3 payload representation, installer lifecycle, naming cleanup, or retired workflow cleanup without a concrete target-PC defect or new explicit requirement. Do not cosmetically migrate compatibility-bound `voice_lab_*` identifiers. Diagnose the first reproducible local failure before changing source.

## Next Step

**Sync `D:\Work\AI Stuff\TranslateIT` to current `Local` (this handoff commit or newer), keep tracked source clean, then run only `.\Run-Local-Test.ps1` from the repository root. Preserve the first failing console output and generated JSON evidence, and continue by diagnosing that first failing boundary rather than applying manual runtime/model repairs.**
