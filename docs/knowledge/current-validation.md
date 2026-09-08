# Current Validation

This file owns **proof interpretation**, not a per-run diary. `next-action.md` owns continuation; GitHub remains authoritative for exact run/job metadata.

## Current Source Proof

Repository: `halokaryamedia-source/TranslateIT`

**Local-only source authority:** `Local` is the sole active branch for development, governance, CI, proof, continuation, and release-source validation.

Current source claims require completed checks on the exact source-changing `Local` SHA being discussed: **one SHA does not prove another SHA**. A later documentation-only SHA may record proof without changing the validated source identity.

Source-cleanup identity `1ccc24246c591451ea7c4dd92356f02dd522d8d6` owns the current frontend/CI cleanup. It completed Repository Verify, R3 source contract, full frontend Code Health, Linux and hosted-Windows Python health, Linux Rust compiler/dead-code + Clippy + unit tests, and hosted-Windows Rust compiler/dead-code + Clippy + unit tests.

For that source identity, frontend proof includes typecheck, production build, deterministic runtime-policy tests, source-size budget, canonical Rust↔TypeScript bridge-contract validation, frontend module reachability, virtual-route contract, and production dependency audit. The R3 controlled Windows payload job was intentionally skipped because no controlled payload input changed.

Release identity `42f6591b47d5d66ec796cd0cc8421dcc817849a4` remains the current controlled-payload proof: staged/optimized Windows payload validation, bounded 7z evidence generation, and evidence upload passed for that exact release source.

## Verification surfaces

```text
Repository Verify
→ governance / Local-only routing / skills / workflow supply-chain contracts
→ canonical frontend source-validation routing
→ release trigger-scope anti-regression

Code Health
→ changed-source classifier selects frontend, Python, and/or Rust domains
→ frontend: typecheck + build + runtime-policy tests + source contracts + npm audit
→ bridge contract: Tauri command parity + selected Rust/TypeScript response-field parity + no explicit any escape
→ reachability: every tracked frontend .ts/.svelte module must be reachable from src/main.ts
→ source-size: frontend coordinators use normal budgets; remaining exemptions are native realtime decomposition debt
→ Rust: compiler/dead-code + Clippy correctness + unit tests on Linux/hosted Windows when selected
→ Python: compile + Ruff + pytest on Linux/hosted Windows when selected

MiLMMT Repository Contract
→ canonical translation provider/repository contract

WorkerRuntime Lock Consistency
→ Python dependency-lock integrity

R3 Release Contract
→ release-source contract + controlled Windows payload proof only when controlled payload inputs change
```

Checks are path-targeted where appropriate. Skipped unrelated jobs are intentional and are not evidence for those domains.

## Proof Boundaries

### REMOTE_GITHUB

Can establish repository/source/static/unit/CI behavior that actually ran against `Local`. Hosted Windows establishes only the Windows-selected source behavior that its runner executed.

The source-cleanup identity proves:
- `App.svelte` and `runtimeProductFacade.ts` no longer require oversized-source exceptions;
- Meeting polling and native-close I/O have explicit frontend runtime owners;
- bridge response fields cannot silently drift across the selected Rust↔TypeScript contracts;
- orphan frontend source modules now fail reachability validation;
- redundant command/type/test-registration proof layers were consolidated without removing compiler, unit, security, release-source, or dependency checks.

It does **not** establish physical microphone capture, target GPU practicality, VB-CABLE delivery/reception, meeting-app reception, speaker fidelity, real end-to-end latency, installed-runtime success, or clean-machine success.

### LOCAL_CODE

Can additionally establish exact `Local` checkout/toolchain/filesystem/build/generator behavior that actually ran. It still does not automatically establish target-device behavior.

### TARGET_WINDOWS

Required for claims that depend on the user's real Windows hardware/install/audio/device/meeting environment.

## Target Windows

Current target-Windows claims remain scenario-specific. Do not infer them from hosted CI or source presence. When target proof is available, execute only the owning scenarios from `docs/foundation/03-acceptance-scenarios.md` and record evidence outside tracked user-private data.

Large ownership-preserving refactors of realtime Meeting/helper/audio coordinators remain intentionally deferred until the first target-Windows baseline exists unless a concrete source-health failure requires a smaller correction.

## Evidence rule

```text
claim
→ owning verifier/scenario
→ exact relevant source identity
→ completed matching evidence
→ only then PASS
```
