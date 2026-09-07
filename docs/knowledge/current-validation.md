# Current Validation

This file owns **proof interpretation**, not a per-run diary. `next-action.md` owns continuation; exact GitHub run metadata remains authoritative in GitHub and is copied here only when it changes a cross-session proof boundary.

## Current Source Proof

Repository: `halokaryamedia-source/TranslateIT`

**Local-only source authority:** `Local` is the sole active branch for development, governance, CI, proof, continuation, and release-source validation.

Current source claims must be supported by completed checks on the exact `Local` SHA being discussed. A green check on one SHA does not prove another SHA. A skipped/queued/running/cancelled/superseded check is not PASS.

## Verification surfaces

```text
Repository Verify
→ governance/routing/Local-only authority/skills/workflow/supply-chain static contracts

Code Health
→ strict Svelte/TypeScript checking + bridge no-any/source contracts
→ production npm vulnerability audit
→ Linux Python compile + E4/E7/E9/full-F static gate + contract/unit tests
→ hosted Windows Python compile + E4/E7/E9/full-F static gate + contract/unit tests
→ Linux Rust compiler/dead-code checks + Clippy correctness gate + Rust unit tests
→ hosted Windows Rust compiler/dead-code checks + Clippy correctness gate + Rust unit tests for Windows-compiled source

MiLMMT Repository Contract
→ canonical translation provider/repository contract

WorkerRuntime Lock Consistency
→ Python dependency lock integrity

R3 Release Contract
→ release-source contract + controlled Windows payload staging/validation/evidence from Local
→ FFmpeg acquisition is integrity-bound to the selected BtbN GitHub release asset digest and validated LGPL build profile instead of a dated ephemeral autobuild URL
```

Checks are path-targeted where appropriate. A broader source claim requires the relevant set of checks to succeed on the same exact `Local` SHA; do not compose different SHAs into one proof statement.

## Proof Boundaries

### REMOTE_GITHUB

Can establish repository/source/static/unit/CI behavior that actually ran against `Local`. Hosted Windows Code Health can establish that Windows-selected Rust source compiles, Rust Clippy correctness runs, Rust unit tests execute, and the Python WorkerRuntime passes its compile/static/contract test suite on GitHub's hosted Windows runner. Hosted Windows payload staging can establish only the controlled payload work that runner executed. Neither hosted surface establishes physical microphone capture, real target GPU practicality, Windows device delivery, meeting-app reception, installed runtime behavior on the user's machine, speaker fidelity, real end-to-end latency, or clean-machine success.

### LOCAL_CODE

Can additionally establish exact `Local` checkout/toolchain/filesystem/build/generator behavior that actually ran. It still does not automatically establish target-device behavior.

### TARGET_WINDOWS

Required for claims that depend on the user's real Windows hardware/install/audio/device/meeting environment.

## Target Windows

Current target-Windows claims remain scenario-specific. Do not infer them from old run notes, hosted CI, or source presence. When target proof is requested, execute only the owning scenario(s) from `docs/foundation/03-acceptance-scenarios.md` and record evidence outside tracked user-private data.

## Evidence rule

```text
claim
→ owning verifier/scenario
→ exact Local source identity
→ completed matching evidence
→ only then PASS
```
