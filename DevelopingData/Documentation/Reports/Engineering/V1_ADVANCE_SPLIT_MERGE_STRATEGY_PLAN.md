# TranslateIT V1-Advance Split / Merge Strategy Plan

Branch: `V1-Advance`
Status: superseded as merge strategy; retained as scope analysis reference

## Superseded decision

The earlier plan suggested splitting PR #26 into smaller PRs toward `Developing`.

That strategy is now superseded.

## Current branch strategy

`V1-Advance` is now the primary source branch for TranslateIT V1 development.

`Developing` is no longer the active merge target for this phase and may be discarded later after `V1-Advance` is fully ready.

## Current working rule

Continue all active work directly on:

```text
V1-Advance
```

Do not create new PRs into `Developing` for the current phase.

PR #26 is not the active delivery path. It may remain only as historical/integration reference.

## Scope analysis retained

The PR split buckets below remain useful only as review categories, not as an instruction to create PRs into `Developing`:

```text
Documentation and CI foundation
Runtime contracts retarget
RustApp frontend validation
Rust/Tauri shell and backend bridge
Local-only restoration
```

## Current stabilization order on V1-Advance

1. Keep CI green on `V1-Advance`.
2. Keep source-of-truth docs aligned with `V1-Advance`.
3. Keep Rust as manifest preflight until full cargo check is intentionally restored.
4. Keep local-only scripts deferred until target-PC validation.
5. Later decide whether to rename/default the repository branch to `V1-Advance` or create a final main branch from it.

## Not claimed

This plan does not claim full Rust compile readiness, Tauri package readiness, CUDA readiness, model readiness, microphone capture success, virtual microphone routing success, TTS provider quality, installer readiness, or target-PC latency.
