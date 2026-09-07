# Next Action

## Current Status

- `Local` is the sole active repository authority for development, governance, CI, proof, continuation, and release-source validation.
- Architecture: Tauri 2 + Svelte 5 + Rust + one canonical Python worker.
- Code Health covers frontend/bridge checks, Linux + hosted-Windows Python and Rust compiler/static/Clippy/unit gates, plus production npm audit.
- Optional incoming deferral state is isolated in `meeting_session/incoming_deferred.rs`; incoming ASR -> translation -> deferred-drain processing is isolated in `meeting_session/incoming_pipeline.rs`.
- Committed Meeting-turn storage/order/bounds/delivery-state/timing ownership is isolated in `meeting_session/committed_turns.rs` with deterministic ordering/retention/terminal-state/context tests.
- Required outbound finalized-WAV ASR -> ID->EN translation -> TTS -> Meeting delivery is isolated in `meeting_session/outbound_pipeline.rs`; `meeting_session.rs` retains consumer lifecycle, Meeting authority, shared status, self-output suppression ownership, and public command surfaces.
- Required outbound priority, generation checks, committed-turn semantics, cleanup behavior, and audio routing remain unchanged.
- Deferred incoming keeps `MAX_DEFERRED_INCOMING_AGE_MS = 20_000` as a hard first-deferral ceiling.

## Active Boundary

Required outbound remains fail-closed and higher priority; optional incoming remains degradable. `LOCAL_CODE` / `TARGET_WINDOWS` execution is intentionally deferred, so current work stays within `REMOTE_GITHUB` source and hosted-CI proof.

Remote work should continue until architecture, contract tests, hosted-Windows packaging, dependency/security checks, and handoff state are exhausted. Physical microphone/GPU/VB-CABLE/meeting-app reception/real latency/clean-machine claims remain target-Windows work.

## Next Step

Strengthen Meeting lifecycle regression coverage around Start/Stop rollback and authority transitions: duplicate Start/Stop, stale generation, prerequisite loss during Starting, outbound-consumer activation failure, cleanup-incomplete retention/retry, and optional incoming suppression failure. Prefer pure helpers/state-transition tests where possible; preserve command surfaces and production scheduler/audio behavior.
