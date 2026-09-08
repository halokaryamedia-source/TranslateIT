# Next Action

## Current Status

- `Local` remains the sole active authority for development, governance, CI, proof, continuation, and release-source validation.
- REMOTE_GITHUB behavior-preserving latency hardening is complete at source identity `a098b81e23f3cc2496259085be4f19c3d7cb72cf`; Rust/audio-preparation proof remains owned by `417302f5365978d1822bacf4c0d01383ebff73b3`.
- Current source keeps the canonical models/quality settings while reducing callback allocation, ASR WAV I/O, unused ASR timestamp decoding, MiLMMT decoding overhead, warm actor validation, and repeated V2ProPlus reference-speaker embedding work.
- Code Health run `34262942632` passed Python compile/static/format/pytest on Linux and hosted Windows. MiLMMT Repository Contract run `34262942664` passed.
- D-036 now locks the stability-first latency direction. `docs/foundation/04-realtime-latency-architecture.md` defines four isolated evidence-gated phases: bounded one-ahead playback decoupling, optional persistent output stream, strong Start-proof rebinding, then quality-preserving TTS fragments only if still justified.
- None of those architecture phases is claimed implemented merely because the design is now recorded.

## Active Boundary

REMOTE_GITHUB design and safe per-inference optimization are complete.

Physical mic/driver scheduling, real CUDA throughput, CPU/RAM/GPU/VRAM pressure, Meeting Microphone reception, Start → Live time, speaker quality and actual end-of-speech → first translated playback remain **TARGET WINDOWS PROOF REQUIRED**.

Do not implement all latency phases at once. Do not weaken model/beam/context/VAD/voice quality, output ordering, at-most-once delivery, bounded queues, or functional readiness.

## Next Step

Run `docs/knowledge/operations/target-windows-performance.md` on TARGET_WINDOWS using the built-in voice outbound-only baseline first and return the measured first bottleneck.

Route only that owner into `docs/foundation/04-realtime-latency-architecture.md`: continuous-speech queue growth → Phase A; native delivery/open jitter after A → Phase B; warm Start dominated by repeated AI proof → Phase C; TTS still dominant after safer work → Phase D.
