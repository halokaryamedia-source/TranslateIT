# TranslateIT — Next Action

## Current Status

`MILMMT-46-1B-v1.0 CURRENT / MY VOICE NAMING NORMALIZED / REPO-SIDE CLEANUP CLOSED / WINDOWS R3 HOSTED PAYLOAD PROOF PASSED / AUDIT CLEANUP COMMITTED / WORKSPACE -45 GB / INSTALLER-FREE WORKER SMOKE GREEN EXCEPT APPROVED-ACTOR-MISSING / R3 MEGA-GATE RETIRED FOR SCENARIO SUITE D-031 / A6 + A7 GREEN / NEXT SCENARIO A8 MANUAL MY VOICE`

## Active Boundary

- `Local` is the current development authority. `Developing` remains the GitHub default branch and historical/recovery authority; it is not a silent write target.
- This repository is the continuation authority for another tool/operator. Recover `AGENTS.md` → `GITHUB_RULES.md` → `CONTEXT.md` → this file, then diagnose only the first failing owner.
- Product-facing custom voice is **My Voice**. Existing `voice_lab_*` identifiers and `UserData/.../VoiceLab/...` paths remain only where required for protocol/storage compatibility.
- Translator remains `xiaomi-research/MiLMMT-46-1B-v1.0` revision `4fc480b6c58dec29c159dcdf9fde0f6d5c354995` with Python 3.12.x + Torch 2.11.0/cu126 + Transformers 4.57.6 + Tokenizers 0.22.2 + Accelerate 1.14.0.
- Active **R3 packaging** remains one offline `TranslateIT-Setup.exe` plus colocated `TranslateIT-Payload.7z`. Release evidence is bound to the exact committed source through `source_commit`.
- Acceptance authority is now `docs/foundation/03-acceptance-scenarios.md` (D-031). Scenarios run one at a time in criticality order A→B→C→D on this workspace; Group E (installer/distribution) stays deferred until a distribution-readiness decision.
- Current Windows test workspace: `D:\Work\AI Stuff\TranslateIT`.
- Ignored release inputs stay outside Git. `stage_release_inputs.ps1` is the PowerShell-version compatibility entrypoint over `stage_release_inputs_impl.ps1`; Windows PowerShell 5.1 compatibility is limited to the unsupported `utf8NoBOM` encoding token for a temporary generated Python helper.
- The retired all-in-one gate no longer runs. Installer-bound claims survive only as Group E scenarios using `build_release.ps1` directly; physical microphone, My Voice listening quality, Meeting-app reception, repeated Meeting lifecycle, uninstall/reinstall, and clean-machine proof remain manual evidence per scenario.
- Architecture-audit cleanup (`af36d4dd`, `c484e833`) repaired stale contract validators into CI, single-sourced frontend readiness/close truth, removed dead compat matcher/orphaned helpers, added a standalone-text deadline class, split ASR blockers, hardened settings atomic write, aligned VAD diagnostics and input preflight with runtime reality, and surfaced silent-loss counters. Deferred pending target-PC evidence or product decision: capture-callback hot-path consolidation, delivery-tail drain semantics, model-byte SHA-256 pinning, post-build Setup hook scan, context/tone absence policy.

## Observed Target-PC Test Evidence

1. Fresh-clone attempt 1 failed in `build_release.ps1` at third-party notice generation because ignored release inputs were absent. A plain Git clone intentionally does not contain the private runtime/models required by the release build.
2. PR #36 / commit `9307258ca613cdc10db16091e5e6a41f292be902` fixed the root runner so fresh-clone acceptance stages the existing controlled release inputs and license material before build. R3 source-contract CI passed before merge.
3. The next staging run showed `uv` hardlink fallback to full copy. This is a performance/storage warning, not a failure. The observed dependency convergence updated Transformers 4.50.0 → 4.57.6 and Tokenizers 0.21.4 → 0.22.2, matching current authority.
4. Fresh-clone attempt 2 failed because Windows PowerShell 5.1 does not support `Set-Content -Encoding utf8NoBOM`.
5. PR #37 / commit `baac4c3af9ea63b463e0c5c1e1bac206217c402c` added the PowerShell 5.1 staging compatibility boundary while preserving the canonical staging implementation and MiLMMT contract markers. R3 source-contract and canonical MiLMMT validation passed before merge.
6. **No target-PC success claim yet.** The PowerShell 5.1 fix has not yet completed a full rerun. Setup, installed private runtime, CUDA/BF16, ASR/MiLMMT execution, VB-CABLE, microphone, My Voice, Meeting delivery, uninstall/reinstall, and clean-machine acceptance remain unproven until reached on the Windows PC.
7. Installer-free smoke baseline (2026-08-23): `validate:quick` passed; worker smoke on CUDA BF16 green for ASR preload plus both MiLMMT directions with canonical contract markers and persistent lifecycle. Only red: `voice_actor:approved_actor_missing`. Evidence: `UserData/LogData/RustAppValidation/latest_worker_smoke_result.json`.
8. Scenario A6 (2026-08-23): `-IncludeOverLengthProbe` (smoke schema v9) sent a 3000-char translate; rejected `ok:false`, blocker `translation:text_too_large`, before any compaction (`elapsed_ms=0`).
9. Scenario A7 (2026-08-23): fixture `test_milmmt_continuation_rejects_token_ceiling_without_eos` passed against `_continuation`, blocker `translation:output_hit_token_ceiling_without_eos`. Evidence: `UserData/LogData/RustAppValidation/a7_incomplete_generation_pytest.txt`. Dev-tree unit proof.
10. Full automated sweep (2026-08-23): `validate:quick` PASS; `cargo test` 47/47 after full target rebuild; smoke v9 A1–A7 green. Full `pytest tests/` shows 8 failures, all pre-existing at HEAD before the cleanup wave: 7× `test_voice_actor_inference.py` (`voice_actor_provider` attr mismatch vs exec-composed worker module) plus the gpu-probe monkeypatch gap on this CUDA host. Evidence: `UserData/LogData/RustAppValidation/full_pytest_sweep.txt`.

## Current Entry Points

```text
docs/foundation/03-acceptance-scenarios.md
EngineData/Backend/LocalWorker/WorkerRuntime/run_realtime_worker_smoke.ps1
EngineData/Frontend/RustApp/scripts/build_release.ps1
EngineData/Frontend/RustApp/scripts/stage_release_inputs.ps1
EngineData/Frontend/RustApp/scripts/stage_release_inputs_impl.ps1
EngineData/Frontend/RustApp/scripts/stage_release_license_material.py
```

Scenario evidence lands under `UserData/LogData/RustAppValidation/`; Group E build evidence under ignored `EngineData/Frontend/RustApp/src-tauri/target/`. Missing evidence must not be fabricated or replaced by hosted/static claims.

## Closed Development Boundary

Do not reopen model selection, MiLMMT tuning, dependency convergence, worker architecture, R3 payload representation, installer lifecycle, naming cleanup, or retired workflow cleanup without a concrete target-PC defect or new explicit requirement. Do not cosmetically migrate compatibility-bound `voice_lab_*` identifiers. Diagnose the first reproducible local failure before changing source.

## Next Step

**Execute scenario A8 (My Voice build → evaluate → approve → bind) through the app on this workspace; it is a manual user-driven workflow, and the smoke's only red assertion (`voice_actor:approved_actor_missing`) must flip green before B-group audio scenarios begin.**
