# Rust/Tauri Handoff Lifecycle Status

## Scope

This report tracks the current safe runtime handoff state for the Rust/Tauri migration branch.

The goal is to make the migration status explicit without claiming that real microphone capture, ASR inference, translation inference, TTS, playback, or final validation are complete.

## Current implemented flow

1. Frontend calls `analyze_realtime_handoff_plan`.
2. Backend analyzes stream ownership, frame pipeline, segment flow, native execution readiness, and transcript save planning.
3. Backend records the latest handoff result as a runtime snapshot.
4. Snapshot is valid for 120 seconds.
5. `start_capture` checks the latest fresh snapshot before allowing preparation.
6. `stop_capture` clears the stored handoff snapshot.
7. `analyze_start_gate` and `analyze_stop_gate` expose explicit lifecycle preflight reports.
8. Runtime diagnostics now includes runtime handoff state and handoff blockers.

## Important safety boundaries

The current implementation still does not execute:

- real microphone stream creation;
- real ASR inference;
- real translation inference;
- real TTS generation;
- real playback;
- final export or final validation.

## Runtime state modules

- `engine/runtime_state.rs`
  - stores the latest runtime handoff snapshot;
  - applies the 120-second stale snapshot guard;
  - exposes latest and clear operations.

- `engine/adapters/realtime_handoff_logic.rs`
  - aggregates stream, frame, segment, native execution, and transcript save readiness.

- `engine/adapters/runtime_lifecycle_logic.rs`
  - exposes Start and Stop lifecycle preflight reports.

- `engine/diagnostics.rs`
  - includes runtime handoff state in diagnostic output.

## Current Start/Stop contract

Start is allowed only when:

- a runtime handoff snapshot exists;
- the snapshot is not stale;
- the handoff report is ready.

Stop is always allowed and clears the stored snapshot.

## Remaining work before ready-for-review

- Wire frontend Start button to show `analyze_start_gate` before calling `start_capture`.
- Wire frontend Stop button to show `analyze_stop_gate` before calling `stop_capture`.
- Add real microphone stream ownership and CPAL stream creation.
- Connect real ASR native runner.
- Connect real translation native runner.
- Connect real TTS/playback runner.
- Simplify the frontend debug-heavy UI into the final clean TranslateIT UI.
- Run final build, tests, and validation only after migration closure approval.

## Status

Draft migration state. This report documents readiness contracts and runtime state ownership only; it is not a production readiness claim.
