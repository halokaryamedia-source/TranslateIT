# Next Action

## Current Status

- `Local` remains the sole active authority for development, governance, CI, proof, continuation, and release-source validation.
- REMOTE_GITHUB latency hardening is complete at source head `d246f9bba69966780c346e0e31938b9d4ca69c73`, with Rust/audio-preparation proof owned by unchanged parent blob identity `417302f5365978d1822bacf4c0d01383ebff73b3`.
- Realtime capture hardening remains intact: bounded/preallocated rolling audio, reusable callback scratch, mono-F32 fast path, allocation-reduced finalized/VAD evidence, and inactive My Voice fast rejection.
- Finalized ASR WAV preparation now batches PCM16 bytes into one bounded write instead of per-sample file writes.
- MiLMMT deterministic inference explicitly enables KV cache; the pinned model, prompt, last-3 context policy, generation budget, and sampling policy are unchanged.
- Faster-Whisper text-only inference now skips unused timestamp-token decoding while keeping explicit language, beam=1 and VAD filtering.
- Warm My Voice synthesis avoids a duplicate actor-package validation while retaining cold-load and expected-token change detection.
- Code Health on `417302f...` passed frontend, Python and Rust selected gates on Linux and hosted Windows. Code Health on `d246f9b...` passed final Python gates on Linux and hosted Windows; MiLMMT Repository Contract also passed.
- GPT-SoVITS remains full-WAV/non-streaming and the full Meeting Start functional probe remains intact.

## Active Boundary

REMOTE_GITHUB work for this latency pass is complete.

Physical mic/driver scheduling, real CUDA throughput, CPU/RAM/GPU/VRAM pressure, Meeting Microphone reception, Start → Live time, speaker quality, and actual end-of-speech → first translated playback remain **TARGET WINDOWS PROOF REQUIRED**.

Do not introduce streaming TTS, weaken Start verification, or alter model quality settings before target stage timing identifies the measured owner.

## Next Step

Run `docs/knowledge/operations/target-windows-performance.md` on TARGET_WINDOWS using the built-in voice outbound-only baseline first. Judge perceived latency as `speech_boundary_ms + outbound_latency_ms`. Return the measured first bottleneck; if `tts_ms` dominates, streaming TTS becomes the next focused optimization candidate.
