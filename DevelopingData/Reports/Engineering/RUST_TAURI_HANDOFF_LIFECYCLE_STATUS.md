# Rust/Tauri Handoff Lifecycle Status

## Scope

This report tracks the current safe runtime handoff state for the Rust/Tauri migration branch.

The goal is to make the migration status explicit without claiming that real microphone capture, ASR inference, translation inference, TTS, playback, final UI integration, or final validation are complete.

## Current implemented flow

1. Frontend calls `analyze_realtime_handoff_plan`.
2. Backend records the latest handoff result as a runtime snapshot.
3. Snapshot is valid for 120 seconds.
4. `start_capture` routes through `analyze_start_lifecycle_gate` before allowing preparation.
5. If Start is allowed, backend records an active runtime session snapshot in `preparing` phase.
6. Duplicate Start is blocked while an active runtime session exists.
7. `analyze_stop_gate` is session-aware.
8. `stop_capture` clears both active runtime session state and stored handoff snapshot.
9. `get_runtime_session_state` exposes active runtime session state.
10. `analyze_runtime_readiness` exposes a readiness bundle for dashboard/QA usage.
11. `get_runtime_status_bundle` exposes engine status, readiness, next action, and summary.
12. `runtimePanel.ts` converts status and closure data into a UI-ready panel model.
13. `runtimePanel.css` provides clean compact runtime panel styling.
14. `analyze_migration_closure` gates review/release claims behind manual validation and owner approval.
15. Runtime diagnostics includes handoff state, session state, and their blockers.

## Important safety boundaries

The current implementation still does not execute:

- real microphone stream creation;
- real ASR inference;
- real translation inference;
- real TTS generation;
- real playback;
- final UI integration;
- final export or final validation.

## Runtime modules

- `engine/runtime_state.rs`: handoff snapshot, stale guard, active runtime session state.
- `engine/adapters/runtime_lifecycle_logic.rs`: session-aware Start/Stop gates.
- `engine/adapters/runtime_readiness_bundle_logic.rs`: readiness bundle with handoff, session, diagnostics, and blockers.
- `engine/adapters/runtime_status_bundle_logic.rs`: compact engine status + readiness + next-action command.
- `engine/adapters/migration_closure_gate_logic.rs`: review/release gate with manual validation and owner approval.
- `engine/diagnostics.rs`: diagnostic output with handoff and session state.
- `src/runtimeLifecycle.ts`: frontend helper types and summary functions.
- `src/runtimePanel.ts`: UI-ready runtime panel model.
- `src/runtimePanel.css`: clean runtime panel styling.

## Current Start/Stop contract

Start is allowed only when:

- a runtime handoff snapshot exists;
- the snapshot is not stale;
- the handoff report is ready;
- no active runtime session is already recorded;
- `analyze_start_lifecycle_gate` allows the transition.

Stop can clear:

- active runtime session state;
- stored handoff snapshot state;
- handoff-only state when no active session exists.

## Remaining work before ready-for-review

- Wire frontend Start button to show status/readiness before calling `start_capture`.
- Wire frontend Stop button to show `analyze_stop_gate` before calling `stop_capture`.
- Wire `runtimePanel.ts` and `runtimePanel.css` into the final clean UI shell.
- Add real microphone stream ownership and CPAL stream creation.
- Connect real ASR native runner.
- Connect real translation native runner.
- Connect real TTS/playback runner.
- Simplify the frontend debug-heavy UI into the final clean TranslateIT UI.
- Run final build, tests, and validation only after migration closure approval.

## Status

Draft migration state. This report documents readiness contracts, runtime state ownership, and UI-ready panel preparation only; it is not a production readiness claim.
