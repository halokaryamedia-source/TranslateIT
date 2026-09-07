# Next Action

## Current Status

- `Local` is the sole active repository authority for development, governance, CI, proof, continuation, and release-source validation.
- Architecture: Tauri 2 + Svelte 5 + Rust + one canonical Python worker.
- Code Health covers frontend/bridge checks, Linux + hosted-Windows Python and Rust compiler/static/Clippy/unit gates, plus production npm audit.
- Optional incoming deferral state is isolated in `meeting_session/incoming_deferred.rs`; incoming ASR -> translation -> deferred-drain processing is isolated in `meeting_session/incoming_pipeline.rs`.
- Committed Meeting-turn storage/order/bounds/delivery-state/timing ownership is isolated in `meeting_session/committed_turns.rs` with deterministic ordering/retention/terminal-state/context tests.
- Required outbound finalized-WAV ASR -> ID->EN translation -> TTS -> Meeting delivery is isolated in `meeting_session/outbound_pipeline.rs`; `meeting_session.rs` retains consumer lifecycle, Meeting authority, shared status, self-output suppression ownership, and public command surfaces.
- Runtime-session regression coverage proves competing-owner exclusion, duplicate Meeting claim generation/session retention, stale Live-commit rejection, revoke-before-cleanup authority invalidation, stale revoke/clear isolation, and cleanup-incomplete retained-generation retry semantics.
- Required outbound priority, generation checks, committed-turn semantics, cleanup behavior, and audio routing remain unchanged.

## Active Boundary

Required outbound remains fail-closed and higher priority; optional incoming remains degradable. `LOCAL_CODE` / `TARGET_WINDOWS` execution is intentionally deferred, so current work stays within `REMOTE_GITHUB` source and hosted-CI proof.

Remote work should continue until architecture, contract tests, hosted-Windows packaging, dependency/security checks, and handoff state are exhausted. Physical microphone/GPU/VB-CABLE/meeting-app reception/real latency/clean-machine claims remain target-Windows work.

## Next Step

Audit and harden helper scheduler/bridge ownership in `helper_bridge.rs` and `helper_bridge_runtime.rs`. Preserve `MeetingOutbound > MeetingIncoming > Text > Diagnostic` priority and existing worker protocol while adding deterministic coverage for admission limits, priority/preemption decisions, timeout/cancellation permit release, stale Meeting generation/session rejection, and transport failure cleanup. Extract focused private modules only where ownership boundaries materially reduce coupling; do not redesign the scheduler or introduce local-only workflow dependencies.
