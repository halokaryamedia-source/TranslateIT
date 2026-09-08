# Current Validation

This file owns **proof interpretation**, not a per-run diary. `next-action.md` owns continuation; exact GitHub run metadata remains authoritative in GitHub and is copied here only when it changes a cross-session proof boundary.

## Current Source Proof

Repository: `halokaryamedia-source/TranslateIT`

**Local-only source authority:** `Local` is the sole active branch for development, governance, CI, proof, continuation, and release-source validation.

Current source claims must be supported by completed checks on the exact source-changing `Local` SHA being discussed: **one SHA does not prove another SHA**. Documentation-only commits may advance `Local` without changing the already-proved source tree; record that distinction explicitly instead of rerunning unrelated source jobs.

## Verification surfaces

```text
Repository Verify
→ governance/routing/Local-only authority/skills/workflow/supply-chain static contracts
→ anti-regression guards preserve selective Code Health, release-only R3 triggers, and registered frontend policy tests

Code Health
→ changed-source classifier selects only the relevant frontend, Python, and/or Rust domains
→ frontend: strict Svelte/TypeScript checking + production Vite build + bridge/source contracts + deterministic runtime-policy tests
→ policy coverage includes safe-close, compact setup/resume, Meeting-voice readiness/blocker ownership, and diagnostic privacy/redaction
→ source-size budget prevents new oversized TS/Svelte/Rust ownership and growth of grandfathered coordinators
→ production npm vulnerability audit
→ Linux/hosted-Windows Python compile + Ruff + pytest only when WorkerRuntime changes
→ Linux/hosted-Windows Rust compiler/dead-code + Clippy correctness + unit tests only when Rust changes

MiLMMT Repository Contract
→ canonical translation provider/repository contract

WorkerRuntime Lock Consistency
→ Python dependency lock integrity

R3 Release Contract
→ release-source contract + controlled Windows payload staging/validation/evidence from Local
→ trigger scope is restricted to actual release/package inputs
→ builder and installer must expose the exact same canonical payload-root closure
→ built-in Meeting voice references are part of transactional install/uninstall ownership
→ payload builder rejects symlink/junction filesystem indirection before archive creation
→ FFmpeg acquisition remains integrity-bound to the selected BtbN release digest and validated LGPL profile
```

Checks are path-targeted where appropriate. A broader source claim requires the relevant checks for the changed domains; skipped unrelated jobs are intentional and are not evidence for those domains.

The source-changing identity `29eebb61df5e9105c44822e2eb4d2674a1e86444` has completed REMOTE_GITHUB Code Health frontend proof: changed-domain detection, Svelte/TypeScript checking, production build, deterministic policy tests including diagnostic privacy, source-size, bridge type safety, command parity, virtual-route contract, and production npm audit passed; unchanged Python/Rust jobs were intentionally skipped. Its R3 source contract also passed, including PowerShell parsing, package-contract validation, and canonical MiLMMT repository validation. Controlled Windows payload evidence for this exact SHA is not claimed PASS until that job completes.

## Proof Boundaries

### REMOTE_GITHUB

Can establish repository/source/static/unit/CI behavior that actually ran against `Local`. Hosted Windows Code Health establishes Windows-selected Rust/Python source behavior only when those domains change. Frontend policy tests establish deterministic orchestration/privacy policy, not rendered/native or physical-device behavior.

Meeting Voice changes refresh the App-owned snapshot immediately after successful built-in selection or My Voice approval; Meeting mount reuses that snapshot and probes only route-specific status. Diagnostic surfaces share bounded redaction before exposing local paths/credentials. Built-in voice replacement uses staged atomic swap/rollback. These are source-level claims.

Release source contracts now keep builder/installer payload roots aligned, require BuiltInVoices to be installed and removed symmetrically, and reject source-tree filesystem indirection. Hosted payload staging can establish only the controlled work that runner executed; it does not prove a clean-machine installed application or real meeting behavior.

The source-size budget prevents known oversized coordinators from accumulating more responsibility before a measured baseline exists. No hosted surface establishes physical microphone capture, target GPU practicality, VB-CABLE delivery/reception, meeting-app reception, speaker fidelity, real end-to-end latency, or clean-machine success.

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
