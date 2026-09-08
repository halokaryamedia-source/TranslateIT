# Current Validation

This file owns **proof interpretation**, not a per-run diary. `next-action.md` owns continuation; exact GitHub run metadata remains authoritative in GitHub and is copied here only when it changes a cross-session proof boundary.

## Current Source Proof

Repository: `halokaryamedia-source/TranslateIT`

**Local-only source authority:** `Local` is the sole active branch for development, governance, CI, proof, continuation, and release-source validation.

Current source claims must be supported by completed checks on the exact source-changing `Local` SHA being discussed: **one SHA does not prove another SHA**. Later changes in another domain do not rewrite the proof identity of unchanged Rust/Python/frontend source.

## Verification surfaces

```text
Repository Verify
→ governance/routing/Local-only authority/skills/workflow/supply-chain static contracts
→ selective Code Health + release-only R3 trigger anti-regression
→ every scripts/tests/*.test.ts must be registered in the frontend runtime-policy suite

Code Health
→ changed-source classifier selects only relevant frontend, Python, and/or Rust domains
→ frontend: Svelte/TypeScript check + production build + runtime-policy/source contracts + npm audit
→ policy coverage includes safe-close, setup/resume, Meeting-voice gate, diagnostic privacy, and fail-closed Meeting bridge fallback
→ Linux/hosted-Windows Rust compiler/dead-code + Clippy correctness + unit tests when Rust changes
→ Linux/hosted-Windows Python compile + Ruff + pytest when WorkerRuntime changes
→ source-size budgets prevent new oversized ownership and grandfathered coordinator growth

MiLMMT Repository Contract
→ canonical translation provider/repository contract

WorkerRuntime Lock Consistency
→ Python dependency lock integrity

R3 Release Contract
→ release-source contract + controlled Windows payload staging/validation/evidence
→ exact builder/installer payload-root closure
→ BuiltInVoices transactional install/uninstall ownership
→ symlink/junction payload-source rejection
→ integrity-bound FFmpeg/model/runtime staging
```

Checks are path-targeted where appropriate. Skipped unrelated jobs are intentional and are not evidence for those domains.

Rust operational identity `dd18c27f0557f2816bbeb5a32341d8134e5ae278` completed frontend, Linux Rust, and hosted-Windows Rust Code Health including compiler/dead-code, Clippy, and unit tests; unchanged Python jobs were skipped. Its Rust tree includes settings backup recovery after an interrupted atomic replacement, generic-settings audio ownership locking during Meeting/Mic Test, actionable Text timeout/scheduler-busy failure mapping, and Meeting-voice-neutral outbound failure copy.

Frontend bridge identity `78cb55a99f522b34143a8edbe118ae95323048d9` completed the full frontend Code Health surface. Unknown Meeting ownership after a Tauri bridge failure is now represented fail-closed as potentially active until a later authoritative probe proves idle; the policy lives in a pure tested module wired into `runtimeApi`.

Release identity `29eebb61df5e9105c44822e2eb4d2674a1e86444` completed R3 source contract and Controlled Windows payload proof: staging, validation/optimization, bounded 7z evidence generation, and evidence upload all passed for that exact release source.

Repository-governance identity `788aeb623607f29586fde370ca6c302b96abd06f` completed Repository Verify including the generic frontend runtime-policy test registration check.

## Proof Boundaries

### REMOTE_GITHUB

Can establish repository/source/static/unit/CI behavior that actually ran against `Local`. Hosted Windows Code Health establishes Windows-selected Rust/Python source behavior only when those domains change. Frontend policy tests establish deterministic orchestration/privacy/fallback policy, not rendered/native or physical-device behavior.

Meeting Voice changes refresh the App-owned snapshot after successful built-in selection or My Voice approval. Diagnostic surfaces share bounded redaction. Built-in voice replacement uses staged atomic swap/rollback. Runtime settings recover a previous-good backup after the atomic-write crash window, and audio preference mutation cannot bypass active runtime ownership through the generic settings command.

Text translation distinguishes worker transport timeout and lower-priority scheduler contention from model/language failure. Meeting voice failure copy is valid for both built-in and My Voice actors. A temporarily unavailable Meeting bridge no longer fabricates idle ownership.

Release source contracts keep builder/installer payload roots aligned, install/remove BuiltInVoices symmetrically, and reject source-tree filesystem indirection. Hosted controlled payload proof for `29eebb61df5e9105c44822e2eb4d2674a1e86444` remains bounded to the runner work that executed.

No hosted surface establishes physical microphone capture, target GPU practicality, VB-CABLE delivery/reception, meeting-app reception, speaker fidelity, real end-to-end latency, installed-runtime success, or clean-machine success.

### LOCAL_CODE

Can additionally establish exact `Local` checkout/toolchain/filesystem/build/generator behavior that actually ran. It still does not automatically establish target-device behavior.

### TARGET_WINDOWS

Required for claims that depend on the user's real Windows hardware/install/audio/device/meeting environment.

## Target Windows

Current target-Windows claims remain scenario-specific. Do not infer them from old run notes, hosted CI, or source presence. When target proof is requested, execute only the owning scenario(s) from `docs/foundation/03-acceptance-scenarios.md` and record evidence outside tracked user-private data.

Large ownership-preserving refactors of realtime Meeting/audio coordinators should wait until the first target-Windows baseline exists unless a source-health failure makes a smaller correction necessary.

## Evidence rule

```text
claim
→ owning verifier/scenario
→ exact relevant source identity
→ completed matching evidence
→ only then PASS
```
