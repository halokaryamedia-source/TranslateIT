# Next Action

## Current Status

- `Local` is the sole active repository authority for development, governance, CI, proof, continuation, and release-source validation.
- Architecture: Tauri 2 + Svelte 5 + Rust + one canonical Python worker.
- Code Health covers frontend/bridge checks, Linux + hosted-Windows Python and Rust compiler/static/Clippy/unit gates, plus production npm audit.
- Meeting incoming deferral, incoming processing, committed-turn ownership, and required outbound finalized-WAV ASR -> ID->EN translation -> TTS -> Meeting delivery have focused private ownership modules.
- Runtime-session tests prove duplicate/stale/revoke/cleanup-incomplete authority semantics; helper scheduler/bridge tests prove lane priority, admission/timeouts, stale rejection, readiness isolation, bounded retry policy, and request/session cleanup ownership.
- Audio pure-contract coverage proves the 2-second rolling mono buffer bound, source-format reset, max-two finalized incoming backlog with oldest eviction/FIFO retained order, shared Meeting sequence identity, and fail-closed finalized WAV staging validation. Meeting output now has a guarded public facade that rejects impossible, truncated, or undersized RIFF declared boundaries before native CPAL delivery; the native runtime retains its existing PCM16 decode/resample, bounded-deadline, and monotonic playback-time tests.
- Required outbound remains fail-closed and higher priority; optional incoming remains degradable.

## Active Boundary

`LOCAL_CODE` / `TARGET_WINDOWS` execution remains intentionally deferred. Current proof is `REMOTE_GITHUB`: source contracts and hosted CI only. Physical microphone/GPU/VB-CABLE/meeting-app reception/real latency/clean-machine claims remain target-Windows work.

Remote work should continue until pure runtime contracts, Python/frontend tests, packaging, dependency/security checks, and handoff state are exhausted.

## Next Step

Revisit finalized-utterance producer pure contracts through its public producer API: outbound generation revocation/cancellation, pending-queue cleanup after authority loss, source-rate transition reset, pre-roll bounds, overflow fail-closed behavior where a deterministic fixture is practical, and target-format/resample invariants. Prefer extending the existing serialized audio contract test module without changing CPAL device behavior. Keep actual microphone/output/VB-CABLE/meeting-app behavior for `TARGET_WINDOWS`.
