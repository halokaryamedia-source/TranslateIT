# Current Validation

This file owns **proof interpretation**, not a per-run diary. `next-action.md` owns continuation; GitHub remains authoritative for exact run/job metadata.

## Current Source Proof

Repository: `halokaryamedia-source/TranslateIT`

**Local-only source authority:** `Local` is the sole active branch for development, governance, CI, proof, continuation, and release-source validation.

Current source claims require completed checks on the exact source-changing `Local` SHA being discussed: **one SHA does not prove another SHA**. A later documentation-only SHA may record proof without changing the validated source identity.

Validated performance source identity: `a6431b2b6d13e0c71a34283adc5bbb1f2dc83fdf`.

Code Health run `34255751440` passed on that exact source identity:
- frontend source health: typecheck, production build, runtime-policy tests, source-size, Rust↔TypeScript bridge contract, reachability, virtual-route contract, and production dependency audit;
- Linux Rust: compiler/dead-code, Clippy, and unit tests;
- hosted-Windows Rust: compiler/dead-code, Clippy, and unit tests.

Python jobs were intentionally skipped because WorkerRuntime Python source and its dependency lock did not change. A skipped unrelated domain is not proof for that domain.

Repository Verify run `34255116890` passed on preceding delivery `cc667607a35297d23bcce3e70d8cf52c0f2a690e`, which changed the same performance-hardening set plus current operations/continuation documentation. Corrective child `a6431b2...` changed only `live_capture.rs` to satisfy the existing Rust dead-code contract while preserving the native mono-F32 fast path.

Current source proof establishes:
- rolling preview audio is bounded/preallocated instead of trimming a `Vec` by shifting the retained tail;
- capture conversion/downmix reuses callback-owned scratch storage and native mono-F32 avoids downmix allocation;
- finalized-utterance observation avoids a sanitized duplicate `Vec` per callback chunk;
- audio evidence avoids temporary normalized/frame-energy vectors;
- inactive My Voice guided recording can reject Meeting callback work before its capture mutex;
- existing bounded drop/queue, generation-authority, and fail-closed Meeting semantics remain owned by their prior contracts.

Older identity `1ccc24246c591451ea7c4dd92356f02dd522d8d6` remains valid for the frontend/CI cleanup claims it proved. Release identity `42f6591b47d5d66ec796cd0cc8421dcc817849a4` remains the controlled-payload proof; performance hardening did not change controlled payload inputs.

## Verification surfaces

```text
Repository Verify
→ governance / Local-only routing / skills / workflow supply-chain contracts

Code Health
→ frontend: typecheck + build + runtime-policy/source contracts + npm audit
→ Rust: compiler/dead-code + Clippy + unit tests on Linux/hosted Windows when selected
→ Python: compile + Ruff + pytest on Linux/hosted Windows when selected

MiLMMT Repository Contract
→ canonical translation-provider/repository contract

WorkerRuntime Lock Consistency
→ Python dependency-lock integrity

R3 Release Contract
→ release-source + controlled Windows payload proof when payload inputs change
```

Checks are path-targeted. Skipped unrelated jobs are intentional and are not evidence for those domains.

## Proof Boundaries

### REMOTE_GITHUB

REMOTE_GITHUB is complete for the current performance-hardening source claims. It proves the optimized callback/buffer source compiles under the repository dead-code policy, satisfies Clippy and unit contracts on Linux and hosted Windows, and preserves retained frontend/source gates.

It does **not** establish physical microphone stability, real callback scheduling under the target driver, target GPU practicality, CPU/RAM/GPU/VRAM pressure, Meeting Microphone reception, actual Start → Live time, speaker fidelity, real end-to-end latency, installed-runtime success, or repeated-session behavior on the user's machine.

The current source intentionally retains the full generation-bound Meeting Start functional check, resident AI-model behavior, and temporary-WAV transport until target evidence identifies one of them as a material first bottleneck.

### LOCAL_CODE

Can additionally establish exact checkout/toolchain/filesystem/build behavior that actually ran. It still does not automatically establish target-device behavior.

### TARGET_WINDOWS

Required for claims that depend on the user's real Windows hardware/install/audio/device/meeting environment.

## Target Windows

Use `docs/knowledge/operations/target-windows-performance.md`. It starts outbound-only with a built-in voice, records stage timing and hardware pressure, then covers optional incoming isolation, Stop, and repeated-session stability.

Target results must name the measured first bottleneck before additional performance architecture changes.

## Evidence Rule

```text
claim
→ owning verifier/scenario
→ exact relevant source identity
→ completed matching evidence
→ only then PASS
```
