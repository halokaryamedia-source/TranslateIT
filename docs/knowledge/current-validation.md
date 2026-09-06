# Current Validation

This file owns **proof interpretation**, not a per-run diary. `next-action.md` owns continuation; exact GitHub run metadata remains authoritative in GitHub and is copied here only when it changes a cross-session proof boundary.

## Current Source Proof

Repository: `halokaryamedia-source/TranslateIT`

Working branch: `Local`.

Stable branch: `main`.

Current source claims must be supported by completed checks on the exact source/candidate SHA being discussed. Path-targeted development checks are intentionally narrow; a stable `Local → main` promotion uses `Stable Release Gate` as the broad source boundary.

## Verification surfaces

```text
Repository Verify
→ governance/routing/authority/skills/workflow/supply-chain static contracts

Code Health
→ Svelte/TypeScript source checks + Python lint/compile + Rust compiler/dead-code checks

MiLMMT Repository Contract
→ canonical translation provider/repository contract

WorkerRuntime Lock Consistency
→ Python dependency lock integrity

R3 Release Contract
→ release-source and controlled-payload structure

Stable Release Gate
→ deliberate Local → main source/stable promotion boundary
```

A green check on one SHA does not prove another SHA. A skipped/queued/running/cancelled/superseded check is not PASS.

## Proof Boundaries

### REMOTE_GITHUB

Can establish repository/source/static/CI behavior that actually ran. It cannot establish physical microphone capture, real target GPU practicality, Windows device delivery, meeting-app reception, installed runtime, speaker fidelity, real end-to-end latency or clean-machine success.

### LOCAL_CODE

Can additionally establish exact local checkout/toolchain/filesystem/build/generator behavior that actually ran. It still does not automatically establish target-device behavior.

### TARGET_WINDOWS

Required for claims that depend on the user's real Windows hardware/install/audio/device/meeting environment.

## Target Windows

Current target-Windows claims remain scenario-specific. Do not infer them from old run notes or source presence. When target proof is requested, execute only the owning scenario(s) from `docs/foundation/03-acceptance-scenarios.md` and record evidence outside tracked user-private data.

## Evidence rule

```text
claim
→ owning verifier/scenario
→ exact source identity
→ completed matching evidence
→ only then PASS
```
