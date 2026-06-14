# Pre-Testing Readiness Checklist

## Scope

This checklist records what must be ready before the project enters the testing phase.

It does not claim that build, tests, CI, real microphone capture, ASR, translation, TTS/playback, or final UI validation have been completed.

## Completed before testing

- Rust/Tauri app scaffold exists.
- Active launcher is redirected to the RustApp migration path.
- Runtime handoff snapshot state exists.
- 120-second stale guard exists for handoff snapshots.
- Start gate checks handoff state before recording an active session.
- Duplicate Start is blocked while an active session exists.
- Stop clears active runtime session state and stored handoff state.
- Runtime readiness bundle exists.
- Runtime status bundle exists.
- Migration closure gate exists and keeps review/release claims blocked by default.
- CPAL default input config probe exists.
- Native capture stream planner exists.
- Native capture build/callback contract exists.
- Registered capture gate exists before future real stream opening.
- Capture gate is included in `get_runtime_status_bundle`.
- Frontend runtime panel model exists.
- Frontend pre-testing readiness helper exists.
- Engineering status report is updated for pre-stream readiness.
- PR remains draft.

## Testing-phase items not executed here

- Real CPAL microphone stream opening.
- Real ASR execution.
- Real translation execution.
- Real TTS/playback execution.
- Final UI interaction validation.
- Build validation.
- Automated tests.
- Manual runtime smoke test.
- Packaging validation.
- Owner approval to move PR out of draft.

## Pre-testing conclusion

The migration branch is ready to enter a controlled testing phase from a pre-stream readiness standpoint.

The testing phase must verify compilation, command registration, runtime status bundle shape, CPAL device behavior on the target PC, real stream opening, ASR, translation, TTS/playback, and final UI wiring before any ready-for-review or release-candidate claim.
