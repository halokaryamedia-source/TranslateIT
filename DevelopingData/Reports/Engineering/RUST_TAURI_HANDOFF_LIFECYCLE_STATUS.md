# Rust/Tauri Handoff Lifecycle Status

## Scope

This report tracks the current safe runtime handoff state for the Rust/Tauri migration branch.

The goal is to make the migration status explicit without claiming that real microphone capture, ASR inference, translation inference, TTS, playback, or final validation are complete.

## Current implemented flow

1. Frontend calls `analyze_realtime_handoff_plan`.
2. Backend analyzes stream ownership, frame pipeline, segment flow, native execution readiness, and transcript save planning.
3. Backend records the latest handoff result as a runtime snapshot.
4. Snapshot is valid for 120 seconds.
5. `start_capture` routes through `analyze_start_lifecycle_gate` before allowing preparation.
6. If Start is allowed, backend records an active runtime session snapshot in `preparing` phase.
7. `analyze_start_gate` now blocks duplicate Start while an active runtime session exists.
8. `analyze_stop_gate` is session-aware and reports whether it is clearing an active session, a handoff-only state, or nothing useful.
9. `stop_capture` clears both active runtime session state and stored handoff snapshot.
10. `get_runtime_session_state` exposes the active runtime session state for frontend/QA.
11. `analyze_runtime_readiness` exposes a single readiness bundle for dashboard/QA usage and includes active runtime session state.
12. `analyze_migration_closure` exposes a final migration closure gate that requires explicit manual validation and owner approval flags.
13. Runtime diagnostics includes runtime handoff state, runtime session state, and their blockers.

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
  - stores active runtime session ownership after Start gate approval;
  - exposes latest and clear operations for handoff and runtime session state.

- `engine/adapters/realtime_handoff_logic.rs`
  - aggregates stream, frame, segment, native execution, and transcript save readiness.

- `engine/adapters/runtime_lifecycle_logic.rs`
  - exposes Start and Stop lifecycle preflight reports;
  - Start gate checks both handoff readiness and duplicate active session state;
  - Stop gate reports active-session, handoff-only, or idle stop state.

- `engine/adapters/runtime_readiness_bundle_logic.rs`
  - bundles diagnostics, handoff state, active session state, Start gate, Stop gate, staged blockers, and readiness booleans;
  - exposes one report for dashboard/QA usage without claiming final runtime readiness.

- `engine/adapters/migration_closure_gate_logic.rs`
  - gates ready-for-review and release-candidate claims behind manual build validation, runtime smoke validation, UI review, packaging review, explicit owner approval, and transition permissions;
  - hard-blocks production release claims by design.

- `engine/diagnostics.rs`
  - includes runtime handoff state and runtime session state in diagnostic output.

- `src/runtimeLifecycle.ts`
  - mirrors frontend helper types for lifecycle gate, active session state, readiness bundle, and closure gate calls;
  - exposes frontend summaries for future UI wiring;
  - defaults closure-gate request flags to blocked/false.

## Current Start/Stop contract

Start is allowed only when:

- a runtime handoff snapshot exists;
- the snapshot is not stale;
- the handoff report is ready;
- no active runtime session is already recorded;
- `analyze_start_lifecycle_gate` allows the transition.

When Start is allowed, the backend records a runtime session snapshot with:

- owner id;
- session id;
- handoff timestamp;
- `preparing` phase;
- `safe_to_stop = true`;
- explicit note that real microphone stream creation is still pending.

Stop can clear:

- active runtime session state;
- stored handoff snapshot state;
- handoff-only state when no active session exists.

## Current runtime readiness bundle contract

`analyze_runtime_readiness` reports:

- Start command readiness;
- Stop command readiness;
- active runtime session state;
- live capture runtime readiness;
- native inference runtime readiness;
- transcript persistence readiness;
- user-facing runtime readiness;
- stage-level blockers;
- consolidated blockers from diagnostics and runtime gates.

The bundle intentionally keeps `ready_for_user_facing_runtime` false until real capture, native inference, persistence, UI, and final validation are actually complete.

## Current migration closure gate contract

`analyze_migration_closure` requires an explicit request containing:

- manual build validation status;
- manual runtime smoke status;
- manual UI review status;
- manual packaging review status;
- explicit owner approval;
- permission to transition ready-for-review;
- permission to claim release-candidate status.

The default frontend helper request sets all of these flags to `false`.

The gate may allow ready-for-review only when runtime Start gate and required manual checks are explicitly passed. It may allow release-candidate wording only when runtime user-facing readiness, UI review, packaging review, and release-candidate permission are explicitly passed.

Production release remains blocked by design in this migration gate and must not be claimed from this report.

## Remaining work before ready-for-review

- Wire frontend Start button to show `analyze_start_gate` or `analyze_runtime_readiness` before calling `start_capture`.
- Wire frontend Stop button to show `analyze_stop_gate` before calling `stop_capture`.
- Wire frontend Diagnostics dashboard to render `analyze_runtime_readiness` and active session state.
- Wire frontend QA/closure dashboard to render `analyze_migration_closure`.
- Add real microphone stream ownership and CPAL stream creation.
- Connect real ASR native runner.
- Connect real translation native runner.
- Connect real TTS/playback runner.
- Simplify the frontend debug-heavy UI into the final clean TranslateIT UI.
- Run final build, tests, and validation only after migration closure approval.

## Status

Draft migration state. This report documents readiness contracts and runtime state ownership only; it is not a production readiness claim.
