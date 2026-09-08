# Next Action

## Current Status

- `Local` remains the sole active authority for development, governance, CI, proof, continuation, and release-source validation.
- The user-requested REMOTE_GITHUB performance-hardening pass is complete at validated source identity `a6431b2b6d13e0c71a34283adc5bbb1f2dc83fdf`.
- Architecture remains Tauri 2 + Svelte 5 + Rust + one canonical persistent Python worker; required outbound remains fail-closed and optional incoming remains degradable.
- Realtime microphone source work removed avoidable callback cost without changing product speech semantics: rolling preview storage is bounded/preallocated, normal callback conversion/downmix reuses scratch storage, native mono-F32 keeps a no-downmix-allocation fast path, finalized-utterance observation avoids per-chunk sanitization copies, audio evidence avoids temporary normalized/frame-energy vectors, and inactive My Voice recording no longer requires a mutex acquisition on every Meeting callback.
- Code Health on exact source identity `a6431b2...` is green: frontend source health, Linux Rust compiler/dead-code + Clippy + unit tests, and hosted-Windows Rust compiler/dead-code + Clippy + unit tests all passed. Python jobs were correctly skipped because WorkerRuntime Python source/lock did not change.
- Repository Verify is green for the preceding governance/documentation-changing performance delivery `cc667607a35297d23bcce3e70d8cf52c0f2a690e`; the corrective child changed only Rust capture source and did not alter governance/workflow owners.
- Existing Meeting timing ownership remains authoritative: speech boundary, finalization, queue, audio preparation, ASR, translation, TTS, delivery, and finalized-to-first-playback latency are already separated in runtime status.
- The full generation-bound Meeting Start functional check is intentionally retained until TARGET_WINDOWS timing proves it is a material repeat cost. Worker/model residency and temporary-WAV transport are likewise unchanged until real RAM/VRAM/stage timing identifies them as first bottlenecks.
- `docs/knowledge/operations/target-windows-performance.md` is the canonical repeatable baseline procedure for the remaining hardware-only decisions.

## Active Boundary

REMOTE_GITHUB work for the current performance pass is complete.

Physical microphone stability, real callback scheduling under the target audio driver, CPU/RAM/GPU/VRAM pressure, CUDA practicality, VB-CABLE/Meeting Microphone reception, actual Start → Live time, end-to-end latency, speaker quality, installed-runtime behavior, and repeated-session hardware behavior remain **TARGET WINDOWS PROOF REQUIRED**.

Do not reopen broad source optimization before the target baseline identifies the first measured owner. In particular, do not replace the full Start functional check with file/status presence, introduce adaptive model unloading, or replace WAV transport merely because those paths are theoretically expensive.

## Next Step

Run `docs/knowledge/operations/target-windows-performance.md` on TARGET_WINDOWS using the built-in voice outbound-only baseline first, then return the measured first bottleneck (or evidence that no material bottleneck remains) to development.
