# TranslateIT V1-Advance Primary Source Branch Policy

Branch: `V1-Advance`
Status: active branch strategy policy

## Decision

`V1-Advance` is now the primary source branch for TranslateIT V1 development.

`Developing` is no longer the active merge target for this phase.

## Reason

The current `Developing` branch is treated as empty/legacy for this phase. It may be discarded later after `V1-Advance` is fully ready.

## Current workflow

All active work should continue directly on:

```text
V1-Advance
```

Do not create new PRs into `Developing` for the current phase.

Do not treat PR #26 as the merge path into `Developing`.

## PR #26 status

PR #26 may remain as a historical/integration reference, but it is not the active delivery path.

The active delivery path is direct stabilization of `V1-Advance` until it is ready to become the main source branch.

## Updated strategy

Previous split/merge planning remains useful only as a scope analysis reference.

The new strategy is:

1. Keep stabilizing `V1-Advance`.
2. Keep CI green on `V1-Advance`.
3. Restore local-only scripts only when target-PC validation begins.
4. Later decide whether to rename/default the repository branch to `V1-Advance`, or create a new final main branch from `V1-Advance`.

## Not claimed

This policy does not claim local runtime readiness, CUDA readiness, model readiness, microphone success, virtual microphone routing success, TTS provider quality, Tauri packaging readiness, installer readiness, or target-PC latency.
