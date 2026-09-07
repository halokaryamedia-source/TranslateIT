# Next Action

## Current Status

- `Local` is the sole active repository authority for development, governance, CI, proof, continuation, and release-source validation.
- Architecture: Tauri 2 + Svelte 5 + Rust + one canonical Python worker.
- Code Health covers strict frontend/bridge checks, Linux + hosted-Windows Python and Rust compiler/static/Clippy/unit gates, plus production npm audit.
- Release staging uses the controlled n8.1 LGPL FFmpeg asset with GitHub SHA-256 and staged binary/license/build-profile validation.
- Built-in Male/Female remain the default Meeting voice path; My Voice is optional.
- Optional incoming now handles pre-ASR deferral explicitly, retains deferred WAVs safely, retries FIFO, and cleans them on completion/stale/overflow/disable/session cleanup.
- Deferred incoming preserves the first-deferral timestamp across ASR and translation retries, keeping `MAX_DEFERRED_INCOMING_AGE_MS = 20_000` as a hard age ceiling under repeated outbound preemption.
- Finalized Meeting WAV staging is fail-closed: failed writes do not promote an audio path and partial `.wav.tmp` files are removed.

## Active Boundary

Required outbound remains fail-closed and higher priority; optional incoming remains degradable. `LOCAL_CODE` / `TARGET_WINDOWS` execution is intentionally deferred, so current work stays within `REMOTE_GITHUB` source and CI proof.

Known incoming deferral-ordering, retained-WAV lifecycle, and deferred-age-budget residues are closed without changing scheduler priority. Target-Windows microphone, GPU, VB-CABLE, meeting-app reception, real latency, installed-runtime, and clean-machine claims remain unproved until target testing resumes.

## Next Step

Extract optional-incoming deferred queue/classification/cleanup ownership from `meeting_session.rs` into a focused Rust module. Preserve scheduler priority, command surfaces, status semantics, FIFO/age behavior, and outbound behavior; reuse existing regression coverage.
