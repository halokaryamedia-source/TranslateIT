# Next Action

## Current Status

- `Local` remains the sole active authority for development, governance, CI, proof, continuation, and release-source validation.
- The previous remote-cleanup freeze was explicitly reopened by the user for REMOTE_GITHUB performance hardening before TARGET_WINDOWS testing.
- Architecture remains Tauri 2 + Svelte 5 + Rust + one canonical persistent Python worker; required outbound remains fail-closed and optional incoming remains degradable.
- Realtime microphone source work now targets avoidable callback cost without changing product speech semantics: rolling preview storage is bounded/preallocated, normal callback conversion/downmix reuses scratch storage, finalized-utterance observation avoids per-chunk sanitization copies, audio evidence avoids temporary normalized/frame-energy vectors, and inactive My Voice recording no longer requires a mutex acquisition on every Meeting callback.
- Existing Meeting timing ownership remains authoritative: speech boundary, finalization, queue, audio preparation, ASR, translation, TTS, delivery, and finalized-to-first-playback latency are already separated in runtime status.
- The full generation-bound Meeting Start functional check is intentionally retained until TARGET_WINDOWS timing proves it is a material repeat cost. Worker/model residency and temporary-WAV transport are likewise unchanged until real RAM/VRAM/stage timing identifies them as first bottlenecks.
- `docs/knowledge/operations/target-windows-performance.md` is the canonical repeatable baseline procedure for the remaining hardware-only decisions.

## Active Boundary

Current proof context is `REMOTE_GITHUB`.

Source/static/CI can establish the behavior-preserving callback/buffer contracts and repository health. Physical microphone stability, real CPU/RAM/GPU/VRAM cost, CUDA practicality, VB-CABLE/Meeting Microphone reception, actual Start → Live time, end-to-end latency, speaker quality, installed-runtime behavior, and repeated-session hardware behavior remain **TARGET WINDOWS PROOF REQUIRED**.

Do not replace the full Start functional check with file/status presence, introduce adaptive model unloading, or replace WAV transport merely because those paths are theoretically expensive. The target baseline must identify the first measured owner before further architecture work.

## Next Step

After the exact current `Local` source checks are green, run `docs/knowledge/operations/target-windows-performance.md` on TARGET_WINDOWS using the built-in voice outbound-only baseline first. Return the measured first bottleneck (or no material bottleneck) to development; do not redo the REMOTE_GITHUB callback hardening unless the target evidence points back to audio capture/VAD.
