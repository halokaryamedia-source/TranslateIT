# Next Action

## Current Status

- `Local` is the sole active repository authority for development, governance, CI, proof, continuation, and release-source validation.
- Architecture: Tauri 2 + Svelte 5 + Rust + one canonical Python worker.
- Code Health covers frontend/bridge checks, Linux + hosted-Windows Python and Rust compiler/static/Clippy/unit gates, plus production npm audit.
- Meeting incoming deferral, incoming processing, committed-turn ownership, and required outbound finalized-WAV ASR -> ID->EN translation -> TTS -> Meeting delivery have focused private ownership modules.
- Runtime-session tests prove duplicate/stale/revoke/cleanup-incomplete authority semantics; helper scheduler/bridge tests prove lane priority, admission/timeouts, stale rejection, readiness isolation, bounded retry policy, and request/session cleanup ownership.
- Audio pure-contract coverage proves rolling-buffer bounds/reset, max-two finalized incoming backlog with oldest eviction/FIFO retained order, overlong fail-closed observability, finalized WAV staging validation, and guarded Meeting-output parser boundaries before CPAL execution. Finalized-producer ownership now also rejects stale outbound waiters without clearing a newer generation, discards matching pending work after authority loss, resets old pre-roll/boundary state on source-rate change, bounds pre-roll storage, normalizes non-finite samples, and resamples 8 kHz finalized speech into the canonical 16 kHz mono target format.
- Required outbound remains fail-closed and higher priority; optional incoming remains degradable.

## Active Boundary

`LOCAL_CODE` / `TARGET_WINDOWS` execution remains intentionally deferred. Current proof is `REMOTE_GITHUB`: source contracts and hosted CI only. Physical microphone/GPU/VB-CABLE/meeting-app reception/real latency/clean-machine claims remain target-Windows work.

Remote work should continue until pure runtime contracts, Python/frontend tests, packaging, dependency/security checks, and handoff state are exhausted.

## Next Step

Audit and harden the canonical Python WorkerRuntime without changing its external JSON protocol. Prioritize deterministic contracts for request validation, ID<->EN direction handling, outbound last-three-own-turn context versus context-free incoming, chunk/EOS behavior, timeout/error normalization, model/provider failure cleanup, and bounded text/output fields. Split large provider/runtime files only where cohesive ownership materially reduces coupling. Align Code Health with configured Ruff import rules and formatting checks when the existing source can satisfy them without local-only dependencies. Keep model semantic quality, GPU practicality, and real latency for `TARGET_WINDOWS`.
