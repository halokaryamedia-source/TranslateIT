# Next Action

## Current Status

- `Local` is the sole active repository authority for development, governance, CI, proof, continuation, and release-source validation.
- Architecture: Tauri 2 + Svelte 5 + Rust + one canonical Python worker.
- Code Health covers frontend/bridge checks, Linux + hosted-Windows Python and Rust compiler/static/Clippy/unit gates, plus production npm audit.
- Meeting incoming deferral, incoming processing, committed-turn ownership, and required outbound finalized-WAV ASR -> ID->EN translation -> TTS -> Meeting delivery have focused private ownership modules.
- Runtime-session tests prove duplicate/stale/revoke/cleanup-incomplete authority semantics; helper scheduler/bridge tests prove lane priority, admission/timeouts, stale rejection, readiness isolation, bounded retry policy, and request/session cleanup ownership.
- Audio pure-contract coverage now proves the 2-second rolling mono buffer bound, newest-sample retention, source-format reset, max-two finalized incoming backlog with oldest eviction/FIFO retained order, shared Meeting sequence identity, and fail-closed finalized WAV lane/target-format validation. Transactional failed-WAV staging cleanup is also covered.
- Required outbound remains fail-closed and higher priority; optional incoming remains degradable.

## Active Boundary

`LOCAL_CODE` / `TARGET_WINDOWS` execution remains intentionally deferred. Current proof is `REMOTE_GITHUB`: source contracts and hosted CI only. Physical microphone/GPU/VB-CABLE/meeting-app reception/real latency/clean-machine claims remain target-Windows work.

Remote work should continue until pure runtime contracts, Python/frontend tests, packaging, dependency/security checks, and handoff state are exhausted.

## Next Step

Harden pure Meeting output contracts in `engine/audio/meeting_output.rs`: WAV parser truncation/layout/encoding boundaries, downmix/resample frame-count and channel-replication invariants, non-finite/clamping behavior, bounded delivery deadlines, and generation-scoped cancellation state where it can be tested without CPAL devices. Then revisit finalized-producer generation cancellation/overflow coverage if gaps remain. Do not alter device enumeration/routing or claim physical output behavior from hosted CI.
