# Current Validation

This file owns **proof interpretation**, not a per-run diary. `next-action.md` owns continuation; GitHub remains authoritative for exact run/job metadata.

## Current Source Proof

Repository: `halokaryamedia-source/TranslateIT`

**Local-only source authority:** `Local` is the sole active branch for development, governance, CI, proof, continuation, and release-source validation.

Current source claims require completed checks on the exact source-changing `Local` SHA being discussed: **one SHA does not prove another SHA**. A later documentation-only SHA may record proof without changing the validated source identity.

### Current performance-hardening source identity

Validated source identity: `a6431b2b6d13e0c71a34283adc5bbb1f2dc83fdf`.

That exact source-changing SHA completed Code Health run `34255751440` successfully. Selected proof was:

- frontend source health: typecheck, production build, deterministic frontend runtime-policy tests, source-size budget, Rust↔TypeScript bridge contract, frontend reachability, virtual-route contract, and production dependency audit;
- Linux Rust source health: compiler/dead-code gate, Clippy correctness gate, and Rust unit tests;
- hosted-Windows Rust source health: compiler/dead-code gate, Clippy correctness gate, and Rust unit tests.

Python source/unit jobs were intentionally skipped because neither performance-hardening commit changed WorkerRuntime Python source or its dependency lock. A skipped unrelated domain is not proof for that domain and does not invalidate the selected Rust/frontend proof.

The immediately preceding performance-hardening delivery `cc667607a35297d23bcce3e70d8cf52c0f2a690e` changed the same audio source set plus current operations/continuation documentation and completed Repository Verify run `34255116890` successfully. The corrective child `a6431b2...` changed only `live_capture.rs` to satisfy the existing Rust dead-code contract and preserve the native mono-F32 fast path; repository governance/workflow owners were unchanged, so Repository Verify was not selected again by its trigger scope.

The performance-hardening source proof establishes behavior-preserving source contracts for avoidable realtime capture cost:

- rolling preview audio is bounded/preallocated and no longer trims a `Vec` by shifting its retained tail;
- normal capture conversion/downmix reuses callback-owned scratch storage, with native mono-F32 remaining a no-downmix-allocation path;
- finalized-utterance observation no longer constructs a sanitized duplicate `Vec` for each callback chunk;
- audio evidence calculation avoids temporary normalized/frame-energy vectors;
- inactive My Voice guided recording can reject Meeting callback work through an atomic gate before acquiring its capture mutex;
- bounded finalized-utterance/drop semantics, generation authority, and fail-closed Meeting behavior remain owned by their existing contracts.

The earlier source-cleanup identity `1ccc24246c591451ea7c4dd92356f02dd522d8d6` remains valid evidence for the frontend/CI cleanup claims it originally proved, but it is no longer the newest source identity.

Release identity `42f6591b47d5d66ec796cd0cc8421dcc817849a4` remains the current controlled-payload proof: staged/optimized Windows payload validation, bounded 7z evidence generation, and evidence upload passed for that exact release source. Performance hardening did not change controlled payload inputs, so it does not replace that release proof.

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

For current performance hardening, REMOTE_GITHUB is complete for the source claims above. It establishes that the optimized callback/buffer source compiles cleanly under the repository dead-code policy, satisfies Clippy, preserves unit contracts on Linux and hosted Windows, and does not break the retained frontend/source contract gates.

REMOTE_GITHUB does **not** establish physical microphone stability, real callback scheduling under the user's audio driver, target GPU practicality, real CPU/RAM/GPU/VRAM pressure, VB-CABLE/Meeting Microphone reception, actual Start → Live time, speaker fidelity, real end-to-end latency, installed-runtime success, or repeated-session behavior on the user's target machine.

The current source intentionally retains the full generation-bound Meeting Start functional check, resident AI model behavior, and temporary-WAV transport until target timing/memory evidence identifies one of them as a material first bottleneck. Source presence or theoretical cost is not sufficient reason to weaken those reliability boundaries.

### LOCAL_CODE

Can additionally establish exact `Local` checkout/toolchain/filesystem/build/generator behavior that actually ran. It still does not automatically establish target-device behavior.

### TARGET_WINDOWS

Required for claims that depend on the user's real Windows hardware/install/audio/device/meeting environment.

## Target Windows

The canonical remaining baseline procedure is `docs/knowledge/operations/target-windows-performance.md`. It starts outbound-only with a built-in voice, records real stage timing and hardware pressure, then covers optional incoming isolation, Stop, and repeated-session stability.

Target results must name the measured first bottleneck before additional performance architecture is changed. In particular, do not replace the Start functional check, unload models adaptively, or replace WAV transport merely because those paths are theoretically expensive.

## Evidence rule

```text
claim
→ owning verifier/scenario
→ exact relevant source identity
→ completed matching evidence
→ only then PASS
```
