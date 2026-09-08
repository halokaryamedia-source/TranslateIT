# Next Action

## Current Status

- `Local` remains the sole active authority for development, governance, CI, proof, continuation, and release-source validation.
- REMOTE_GITHUB latency hardening is complete at source identity `a098b81e23f3cc2496259085be4f19c3d7cb72cf`; Rust/audio-preparation proof remains owned by `417302f5365978d1822bacf4c0d01383ebff73b3`.
- Realtime capture, finalized-ASR WAV batching, Faster-Whisper text-only decoding, MiLMMT KV cache, deterministic decoding and last-3 outbound context remain intact.
- Warm Meeting TTS now skips repeated actor-package disk validation when the exact resident actor token matches the Meeting binding.
- GPT-SoVITS V2ProPlus now caches the static reference speaker embedding once per actor runtime and only reuses it for the exact same upstream reference-audio object; other references fall back to normal computation.
- MiLMMT no longer requests an unused result wrapper; model/prompt/context/generation quality settings are unchanged.
- Code Health run `34262942632` passed Python compile/static/format/pytest on Linux and hosted Windows. MiLMMT Repository Contract run `34262942664` passed.
- The full generation-bound Start functional probe remains intact; GPT-SoVITS remains full-WAV/non-streaming.

## Active Boundary

REMOTE_GITHUB work for safe, behavior-preserving per-inference latency reduction is complete.

Physical mic/driver scheduling, real CUDA throughput, CPU/RAM/GPU/VRAM pressure, Meeting Microphone reception, Start → Live time, speaker quality and actual end-of-speech → first translated playback remain **TARGET WINDOWS PROOF REQUIRED**.

Do not weaken model/beam/context/VAD/voice quality settings. Do not add broad realtime architecture before target stage timing identifies the measured owner.

## Next Step

Run `docs/knowledge/operations/target-windows-performance.md` on TARGET_WINDOWS using the built-in voice outbound-only baseline first. Judge perceived latency as `speech_boundary_ms + outbound_latency_ms`.

Route the next optimization by evidence: dominant `tts_ms` → quality-preserving GPT-SoVITS `return_fragment=True` transport; continuous-speech queue/delivery growth → persistent output stream + bounded serialized playback queue; dominant Start → strengthen identity/invalidation proof and reuse it rather than weakening readiness.
