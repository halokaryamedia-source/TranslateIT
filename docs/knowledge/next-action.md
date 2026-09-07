# Next Action

## Current Status

- `Local` is the sole active repository authority for development, governance, CI, proof, continuation, and release-source validation.
- Architecture: Tauri 2 + Svelte 5 + Rust + one canonical Python worker.
- Code Health covers frontend/bridge checks, Linux + hosted-Windows Python and Rust compiler/static/Clippy/unit gates, plus production npm audit.
- Meeting incoming deferral, incoming processing, committed-turn ownership, and required outbound finalized-WAV ASR -> ID->EN translation -> TTS -> Meeting delivery now have focused private ownership modules.
- Runtime-session regression coverage proves competing-owner exclusion, duplicate Meeting claim retention, stale Live-commit rejection, revoke-before-cleanup invalidation, stale revoke/clear isolation, and cleanup-incomplete retry semantics.
- Helper scheduler/bridge coverage now proves `MeetingOutbound > MeetingIncoming > Text > Diagnostic`, reserved admission headroom, wait-timeout cleanup, priority-order entry, bounded per-lane deadlines, production payload classification, stale generation/session rejection, optional incoming readiness isolation, transport-failure classification, retry-safe ASR/translation only, TTS no-auto-retry policy, exact request-id cleanup, session-scoped hard cancel, and blocked-state metadata cleanup.
- Required outbound remains fail-closed and higher priority; optional incoming remains degradable.

## Active Boundary

`LOCAL_CODE` / `TARGET_WINDOWS` execution remains intentionally deferred. Current proof is `REMOTE_GITHUB`: source contracts and hosted CI only. Physical microphone/GPU/VB-CABLE/meeting-app reception/real latency/clean-machine claims remain target-Windows work.

Remote work should continue until pure runtime contracts, Python/frontend tests, packaging, dependency/security checks, and handoff state are exhausted.

## Next Step

Audit and harden Rust audio-engine pure contracts in `engine/` and the audio-facing command layer. Prioritize bounded buffers/queues, finalized-utterance ordering, generation cancellation, staging/cleanup, resampling/format invariants, and output-route state transitions that can be proved without physical devices. Keep CPAL hardware enumeration, actual microphone/output stability, VB-CABLE delivery, meeting-app reception, and real latency for `TARGET_WINDOWS`. Refactor only where ownership boundaries materially reduce coupling; do not redesign audio routing.
