# Next Action

## Current Status

- `Local` is the sole active repository authority for development, governance, CI, proof, continuation, and release-source validation.
- Architecture: Tauri 2 + Svelte 5 + Rust + one canonical Python worker.
- Code Health covers strict frontend/bridge checks, Linux + hosted-Windows Python and Rust compiler/static/Clippy/unit gates, plus production npm audit.
- Optional incoming deferral state is now isolated in `meeting_session/incoming_deferred.rs`; that module owns ASR-deferral classification, bounded FIFO queue state, stale/overflow/WAV cleanup, first-deferral age tracking, and its regression tests.
- `meeting_session.rs` retains Meeting orchestration and command/session authority; required outbound behavior and scheduler priority were not changed by the extraction.
- Deferred incoming keeps `MAX_DEFERRED_INCOMING_AGE_MS = 20_000` as a hard first-deferral ceiling across ASR and translation retries.
- Finalized Meeting WAV staging remains fail-closed: failed writes do not promote an audio path and partial `.wav.tmp` files are removed.

## Active Boundary

Required outbound remains fail-closed and higher priority; optional incoming remains degradable. `LOCAL_CODE` / `TARGET_WINDOWS` execution is intentionally deferred, so current work stays within `REMOTE_GITHUB` source and CI proof.

The deferred-state extraction at `8004c7f0` is behavior-preserving and passed Code Health #70 across frontend, Python Linux/Windows, and Rust compiler/Clippy/unit gates on Linux and hosted Windows. Target-Windows microphone, GPU, VB-CABLE, meeting-app reception, real latency, installed-runtime, and clean-machine claims remain unproved until target testing resumes.

## Next Step

Extract the optional-incoming ASR/translation/deferred-drain pipeline from `meeting_session.rs` into a focused child module. Leave capture lifecycle, Meeting session authority, command surfaces, and shared status ownership in the parent; preserve scheduler priority, FIFO/age semantics, cleanup behavior, and outbound behavior.
