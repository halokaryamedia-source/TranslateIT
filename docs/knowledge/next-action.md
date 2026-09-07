# Next Action

## Current Status

- `Local` is the sole active repository authority for development, governance, CI, proof, continuation, and release-source validation.
- Architecture: Tauri 2 + Svelte 5 + Rust + one canonical Python worker.
- Code Health covers strict frontend/bridge checks, Linux + hosted-Windows Python and Rust compiler/static/Clippy/unit gates, plus production npm audit.
- Optional incoming deferral state is isolated in `meeting_session/incoming_deferred.rs`, which owns ASR-deferral classification, bounded FIFO queue state, stale/overflow/WAV cleanup, first-deferral age tracking, and regression tests.
- Optional incoming ASR -> translation -> deferred-drain processing is isolated in `meeting_session/incoming_pipeline.rs`; capture lifecycle, Meeting authority, command surfaces, and shared status ownership remain in `meeting_session.rs`.
- Required outbound behavior and helper scheduler priority are unchanged by both extractions.
- Deferred incoming keeps `MAX_DEFERRED_INCOMING_AGE_MS = 20_000` as a hard first-deferral ceiling across ASR and translation retries.
- Finalized Meeting WAV staging remains fail-closed: failed writes do not promote an audio path and partial `.wav.tmp` files are removed.

## Active Boundary

Required outbound remains fail-closed and higher priority; optional incoming remains degradable. `LOCAL_CODE` / `TARGET_WINDOWS` execution is intentionally deferred, so current work stays within `REMOTE_GITHUB` source and CI proof.

Remote work should continue until source architecture, contract tests, hosted-Windows packaging, dependency/security checks, and repository handoff state are exhausted. Target-Windows microphone, GPU, VB-CABLE, meeting-app reception, real latency, installed-runtime, and clean-machine claims remain unproved until target testing resumes.

## Next Step

Extract committed Meeting-turn storage/order/bounds/delivery-state ownership and its pure tests from `meeting_session.rs` into a focused child module. Preserve public snapshots, outbound timing semantics, finalized event ordering, bounded retention, session/generation checks, and all existing Meeting behavior; do not alter scheduler or audio routing.
