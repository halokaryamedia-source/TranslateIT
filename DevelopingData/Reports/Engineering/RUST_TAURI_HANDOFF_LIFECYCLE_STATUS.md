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
10. `probe_native_input_config` probes the default CPAL input device and supported input config ranges.
11. `plan_native_capture_stream_state` selects a safe capture stream plan from the probed CPAL config ranges.
12. `analyze_native_capture_bridge_state` checks the native CPAL capture bridge contract without opening a real stream.
13. `analyze_runtime_readiness` includes input config, capture stream plan, and capture bridge readiness/blockers.
14. `get_runtime_status_bundle` exposes engine status, readiness, next action, and summary.
15. `runtimePanel.ts` converts status and closure data into a UI-ready panel model with input config, stream plan, and capture bridge warnings.
16. `runtimePanel.css` provides clean compact runtime panel styling.
17. `analyze_migration_closure` gates review/release claims behind manual validation and owner approval.
18. Runtime diagnostics includes handoff state, session state, and their blockers.

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
- `engine/audio/input_config.rs`: CPAL default input config probe and supported config ranges.
- `engine/audio/capture_plan.rs`: capture stream plan selection, selected rate/channel/format, and resample/downmix flags.
- `engine/adapters/native_capture_bridge_logic.rs`: CPAL capture bridge readiness contract without real stream creation.
- `engine/adapters/runtime_lifecycle_logic.rs`: session-aware Start/Stop gates.
- `engine/adapters/runtime_readiness_bundle_logic.rs`: readiness bundle with handoff, session, input config, capture stream plan, capture bridge, diagnostics, and blockers.
- `engine/adapters/runtime_status_bundle_logic.rs`: compact engine status + readiness + next-action command.
- `engine/adapters/migration_closure_gate_logic.rs`: review/release gate with manual validation and owner approval.
- `src/runtimeLifecycle.ts`: frontend helper types and summary functions.
- `src/runtimePanel.ts`: UI-ready runtime panel model.
- `src/runtimePanel.css`: clean runtime panel styling.

## Current Start/Stop/Capture contract

Start is allowed only when:

- a runtime handoff snapshot exists;
- the snapshot is not stale;
- the handoff report is ready;
- no active runtime session is already recorded;
- `analyze_start_lifecycle_gate` allows the transition.

Input config is considered ready only when default CPAL input device/config exists and target sample rate/channel requirement can be satisfied.

Capture stream plan is considered ready only when a compatible input config can be selected and requested frame duration is valid. It reports whether resample or channel downmix would be required.

Capture bridge is considered ready only when active session, safe stop state, stream plan, and request parameters are all valid.

Stop can clear active session state, stored handoff snapshot state, or handoff-only state when no active session exists.

## Remaining work before ready-for-review

- Wire frontend Start button to show status/readiness before calling `start_capture`.
- Wire frontend Stop button to show `analyze_stop_gate` before calling `stop_capture`.
- Wire `runtimePanel.ts` and `runtimePanel.css` into the final clean UI shell.
- Add real CPAL microphone stream creation after input config, stream plan, and capture bridge contract pass.
- Connect real ASR native runner.
- Connect real translation native runner.
- Connect real TTS/playback runner.
- Simplify the frontend debug-heavy UI into the final clean TranslateIT UI.
- Run final build, tests, and validation only after migration closure approval.

## Status

Draft migration state. This report documents readiness contracts, runtime state ownership, input config probing, capture stream planning, capture bridge preparation, and UI-ready panel preparation only; it is not a production readiness claim.
