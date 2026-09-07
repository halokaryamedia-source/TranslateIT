# Next Action

## Current Status

- `Local` is the sole active repository authority for development, governance, CI, proof, continuation, and release-source validation.
- Architecture: Tauri 2 + Svelte 5 + Rust + one canonical Python worker.
- Code Health covers strict frontend/bridge checks, Linux + hosted-Windows Python and Rust compiler/static/Clippy/unit gates, plus production npm audit.
- Optional incoming deferral state is isolated in `meeting_session/incoming_deferred.rs`, which owns ASR-deferral classification, bounded FIFO queue state, stale/overflow/WAV cleanup, first-deferral age tracking, and regression tests.
- Optional incoming ASR -> translation -> deferred-drain processing is isolated in `meeting_session/incoming_pipeline.rs`; capture lifecycle and Meeting authority remain in `meeting_session.rs`.
- Committed Meeting-turn storage/order/bounds/delivery-state/timing ownership is isolated in `meeting_session/committed_turns.rs`; pure tests cover shared event ordering, bounded retention, terminal delivery-state immutability, and last-three-own-turn context selection.
- Required outbound behavior, helper scheduler priority, public committed-turn snapshots, and audio routing are unchanged by these extractions.
- Deferred incoming keeps `MAX_DEFERRED_INCOMING_AGE_MS = 20_000` as a hard first-deferral ceiling across ASR and translation retries.

## Active Boundary

Required outbound remains fail-closed and higher priority; optional incoming remains degradable. `LOCAL_CODE` / `TARGET_WINDOWS` execution is intentionally deferred, so current work stays within `REMOTE_GITHUB` source and CI proof.

Remote work should continue until source architecture, contract tests, hosted-Windows packaging, dependency/security checks, and repository handoff state are exhausted. Target-Windows microphone, GPU, VB-CABLE, meeting-app reception, real latency, installed-runtime, and clean-machine claims remain unproved until target testing resumes.

## Next Step

Extract the required outbound finalized-WAV ASR -> translation -> TTS -> delivery pipeline from `meeting_session.rs` into a focused child module. Keep consumer lifecycle, Meeting session authority, shared status stores, self-output suppression ownership, and command surfaces in the parent; preserve generation checks, committed-turn timing/state semantics, helper priority, cleanup, and audio routing behavior.
