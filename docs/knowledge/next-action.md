# Next Action

## Current Status

- `Local` is the sole active repository authority for development, governance, CI, proof, continuation, and release-source validation.
- Architecture: Tauri 2 + Svelte 5 + Rust + one canonical Python worker.
- Code Health covers frontend/bridge checks, Linux + hosted-Windows Python and Rust compiler/static/Clippy/unit gates, plus production npm audit.
- Meeting incoming deferral, incoming processing, committed-turn ownership, and required outbound finalized-WAV ASR -> ID->EN translation -> TTS -> Meeting delivery have focused private ownership modules.
- Runtime-session tests prove duplicate/stale/revoke/cleanup-incomplete authority semantics; helper scheduler/bridge tests prove lane priority, admission/timeouts, stale rejection, readiness isolation, bounded retry policy, and request/session cleanup ownership.
- Audio pure-contract coverage proves rolling-buffer bounds/reset, max-two finalized incoming backlog with oldest eviction/FIFO retained order, overlong fail-closed observability, finalized WAV staging validation, and guarded Meeting-output parser boundaries before CPAL execution. Finalized-producer ownership also rejects stale outbound waiters without clearing a newer generation, discards matching pending work after authority loss, resets old pre-roll/boundary state on source-rate change, bounds pre-roll storage, normalizes non-finite samples, and resamples 8 kHz finalized speech into the canonical 16 kHz mono target format.
- WorkerRuntime now enforces rolling translation context as outbound-only authority: only ID->EN Meeting lane `you` with a non-empty session id and positive Meeting generation may forward the capped last-three context pairs. Incoming EN->ID, standalone translation, reverse-direction requests, and spoofed/incomplete outbound metadata remain context-free even if a caller supplies `context_pairs`.
- Required outbound remains fail-closed and higher priority; optional incoming remains degradable.

## Active Boundary

`LOCAL_CODE` / `TARGET_WINDOWS` execution remains intentionally deferred. Current proof is `REMOTE_GITHUB`: source contracts and hosted CI only. Physical microphone/GPU/VB-CABLE/meeting-app reception/real latency/clean-machine claims remain target-Windows work.

Remote work should continue until pure runtime contracts, Python/frontend tests, packaging, dependency/security checks, and handoff state are exhausted.

## Next Step

Continue canonical Python WorkerRuntime hardening without changing its external JSON protocol. Audit request framing and bounded fields, normalize provider/model exceptions into bounded stable blockers/notes, prove translated-output bounds and standalone chunk failure semantics, then align Code Health with configured Ruff import rules and `ruff format --check` when the current source is clean enough. Keep model semantic quality, GPU practicality, and real latency for `TARGET_WINDOWS`.
