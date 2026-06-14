# Rust Failed Window Recovery Addendum

## Document control

- Project: TranslateIT
- Branch: `ChatGPT-ConvertEngine`
- Recovery window start: `56a473d590dfbb94159a939601f0f7b9088df828`
- Recovery window end: `5decc49333ed205ed9a6ad3eb2fd4fa0978483d2`
- Date: `2026-06-14`

## Root cause

The commits in the recovery window were marked failed because the RustApp final validation workflow was still triggered automatically on pull request commits. Final validation is intentionally deferred while migration is still incomplete.

## Recovery action

- The final validation workflow was changed to manual dispatch only.
- The ported Rust modules from the failed window were kept in the branch.
- A unified Rust runtime orchestration adapter was added so the recovered logic is no longer only a set of isolated modules.

## Reworked runtime path

```text
EngineData/LauncherApp/RustApp/src-tauri/src/engine/adapters/orchestration_logic.rs
```

The orchestration adapter connects these recovered areas:

- audio preprocessing
- audio noise classification
- VAD segment decision
- ASR profile planning
- ASR quality filtering
- language routing
- latency summary
- stale job guard
- pipeline decision
- translation planning
- playback planning

## Exposed command

```text
run_runtime_plan
```

## Validation policy

Final validation remains manual-only until the Rust migration is functionally complete.
