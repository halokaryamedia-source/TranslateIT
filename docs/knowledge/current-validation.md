# Current Validation

This file owns **proof interpretation**, not a per-run diary. `next-action.md` owns continuation; exact GitHub run metadata remains authoritative in GitHub and is copied here only when it changes a cross-session proof boundary.

## Current Source Proof

Repository: `halokaryamedia-source/TranslateIT`

**Local-only source authority:** `Local` is the sole active branch for development, governance, CI, proof, continuation, and release-source validation.

Current source claims must be supported by completed checks on the exact source-changing `Local` SHA being discussed. A green check on one source identity does not prove different source content. Documentation-only commits may advance `Local` without changing the already-proved source tree; record that distinction explicitly instead of rerunning unrelated source jobs.

## Verification surfaces

```text
Repository Verify
→ governance/routing/Local-only authority/skills/workflow/supply-chain static contracts

Code Health
→ changed-source classifier selects only the relevant frontend, Python, and/or Rust domains
→ frontend: strict Svelte/TypeScript checking + production Vite build + bridge/source contracts + deterministic runtime-policy tests
→ frontend runtime-policy coverage includes safe-close precedence, compact setup checkpoint/resume behavior, and selected Meeting-voice readiness gating
→ source-size budget: new TS/Svelte/Rust files stay within normal ownership bounds; explicitly grandfathered large coordinators cannot silently grow
→ production npm vulnerability audit
→ Linux Python compile + Ruff E4/E7,E9,F,I static gate + Ruff format check + contract/unit tests when WorkerRuntime changes
→ hosted Windows Python compile + Ruff E4,E7,E9,F,I static gate + Ruff format check + contract/unit tests when WorkerRuntime changes
→ Linux Rust compiler/dead-code checks + Clippy correctness gate + Rust unit tests when Rust source/contracts change
→ hosted Windows Rust compiler/dead-code checks + Clippy correctness gate + Rust unit tests when Rust source/contracts change

MiLMMT Repository Contract
→ canonical translation provider/repository contract

WorkerRuntime Lock Consistency
→ Python dependency lock integrity

R3 Release Contract
→ release-source contract + controlled Windows payload staging/validation/evidence from Local
→ trigger scope is restricted to actual release/package inputs; ordinary frontend source/tests do not rebuild the controlled payload
→ FFmpeg acquisition is integrity-bound to the selected BtbN GitHub release asset digest and validated LGPL build profile instead of a dated ephemeral autobuild URL
```

Checks are path-targeted where appropriate. A broader source claim requires the relevant checks for the changed domains; skipped unrelated jobs are intentional and are not evidence for those domains.

The source-changing identity `72065dace3fd5bdee5502b2ae0717c2454fa274e` has completed REMOTE_GITHUB frontend proof: changed-domain detection, Svelte/TypeScript checking, production frontend build, deterministic frontend policy tests, source-size budget, bridge type safety, command parity, virtual-route contract, and production npm audit all passed. Rust and Python jobs were intentionally skipped because that source change was frontend-only.

## Proof Boundaries

### REMOTE_GITHUB

Can establish repository/source/static/unit/CI behavior that actually ran against `Local`. Hosted Windows Code Health can establish Windows-selected Rust/Python source behavior when those domains change; frontend-only changes do not spend hosted Windows Rust/Python runners merely to repeat unchanged proof. Frontend runtime-policy tests establish deterministic policy behavior such as safe-close precedence, setup resume mapping, and Meeting-voice readiness gating, but not rendered/native behavior.

Meeting Voice changes now refresh the application product snapshot immediately after successful built-in selection or My Voice approval. Meeting page mount reuses the App-owned product snapshot and probes only the Meeting microphone route instead of immediately repeating the full product snapshot. These are source-level orchestration claims, not physical audio proof.

The source-size budget prevents known oversized coordinators from accumulating more responsibility before they can be decomposed against a measured baseline. Hosted Windows payload staging can establish only the controlled payload work that runner executed. Neither hosted surface establishes physical microphone capture, real target GPU practicality, Windows device delivery, meeting-app reception, installed runtime behavior on the user's machine, speaker fidelity, real end-to-end latency, or clean-machine success.

### LOCAL_CODE

Can additionally establish exact `Local` checkout/toolchain/filesystem/build/generator behavior that actually ran. It still does not automatically establish target-device behavior.

### TARGET_WINDOWS

Required for claims that depend on the user's real Windows hardware/install/audio/device/meeting environment.

## Target Windows

Current target-Windows claims remain scenario-specific. Do not infer them from old run notes, hosted CI, or source presence. When target proof is requested, execute only the owning scenario(s) from `docs/foundation/03-acceptance-scenarios.md` and record evidence outside tracked user-private data.

Large ownership-preserving refactors of the realtime Meeting/audio coordinators should wait until the first target-Windows baseline exists unless a source-health failure makes a smaller correction necessary. The baseline is the behavior reference for later decomposition.

## Evidence rule

```text
claim
→ owning verifier/scenario
→ exact relevant source identity
→ completed matching evidence
→ only then PASS
```
