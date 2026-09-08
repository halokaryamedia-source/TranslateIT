# Current Validation

This file owns **proof interpretation**, not a per-run diary. `next-action.md` owns continuation; GitHub remains authoritative for exact run/job metadata.

## Current Source Proof

Repository: `halokaryamedia-source/TranslateIT`

**Local-only source authority:** `Local` is the sole active branch for development, governance, CI, proof, continuation, and release-source validation.

Current source claims require completed checks on the exact source-changing `Local` SHA being discussed: **one SHA does not prove another SHA**. A later documentation-only SHA may record proof without changing the validated source identity.

Current latency-hardening source identity: `a098b81e23f3cc2496259085be4f19c3d7cb72cf`.

Rust/audio-preparation identity `417302f5365978d1822bacf4c0d01383ebff73b3` passed frontend, Python and Rust selected gates on Linux and hosted Windows in Code Health run `34259551481`.

Current Python identity `a098b81...` retains that Rust source and adds the final inference-side latency reductions. Code Health run `34262942632` passed compile, Ruff/static correctness, formatting and pytest on Linux and hosted Windows. MiLMMT Repository Contract run `34262942664` also passed.

Current source proof establishes:
- realtime capture uses bounded/preallocated rolling storage, reusable callback scratch, mono-F32 fast path and allocation-reduced finalized/VAD evidence;
- finalized ASR PCM16 WAV preparation uses one bounded byte write instead of tiny per-sample file writes;
- Faster-Whisper text-only transcription keeps explicit language, beam=1 and VAD while skipping unused timestamp-token decoding;
- MiLMMT keeps the pinned model, prompt, last-3 outbound context, generation budget and deterministic `do_sample=False`, explicitly enables KV cache, and consumes the direct generated sequence without an unused result wrapper;
- warm Meeting TTS reuses the resident actor when its exact bound actor token matches, avoiding repeated package reads/hashing while cold-load and token-mismatch validation remain fail-closed;
- GPT-SoVITS V2ProPlus computes the static reference speaker embedding once per actor runtime and reuses it only for the exact same upstream reference-audio object; any different reference object falls back to normal computation;
- no model, voice seed, translation context, beam, VAD, or TTS quality mode was reduced;
- bounded queue/drop, generation authority, cancellation and at-most-once output contracts remain unchanged.

Older identity `d246f9bba69966780c346e0e31938b9d4ca69c73` remains valid for the preceding ASR/MiLMMT latency proof. Release identity `42f6591b47d5d66ec796cd0cc8421dcc817849a4` remains the controlled-payload proof; this pass did not change controlled payload inputs.

## Verification surfaces

```text
Repository Verify
→ governance / Local-only routing / skills / workflow supply-chain contracts

Code Health
→ frontend: typecheck + build + runtime-policy/source contracts + npm audit
→ Rust: compiler/dead-code + Clippy + unit tests on Linux/hosted Windows when selected
→ Python: compile + Ruff + format + pytest on Linux/hosted Windows when selected

MiLMMT Repository Contract
→ canonical translation-provider/repository contract

WorkerRuntime Lock Consistency
→ Python dependency-lock integrity

R3 Release Contract
→ release-source + controlled Windows payload proof when payload inputs change
```

Checks are path-targeted. Skipped unrelated jobs are intentional and are not evidence for those domains.

## Proof Boundaries

### REMOTE_GITHUB

REMOTE_GITHUB is complete for the current behavior-preserving latency pass. It proves the selected source contracts and the new cache/fallback rules; it does not prove target-device timing.

It does **not** establish physical microphone scheduling, real CUDA throughput, CPU/RAM/GPU/VRAM pressure, Meeting Microphone reception, Start → Live time, speaker fidelity, or actual end-of-speech → first translated playback latency on TARGET_WINDOWS.

The full generation-bound Meeting Start functional probe remains intact because the present cache alone is not sufficient proof for a new Meeting generation. GPT-SoVITS also remains full-WAV/non-streaming.

The next larger candidates are intentionally measurement-gated: (1) Start-proof rebinding with stronger identity/invalidation contracts, (2) persistent Meeting output stream plus bounded serialized playback queue so next-turn AI preparation can overlap prior playback, and (3) quality-preserving GPT-SoVITS fragment delivery using upstream `return_fragment=True`. None should be introduced until target timing identifies its owner.

### LOCAL_CODE

Can additionally establish exact checkout/toolchain/filesystem/build behavior that actually ran. It still does not automatically establish target-device behavior.

### TARGET_WINDOWS

Required for claims that depend on the user's real Windows hardware/install/audio/device/meeting environment.

## Target Windows

Use `docs/knowledge/operations/target-windows-performance.md`. Judge perceived latency as `speech_boundary_ms + outbound_latency_ms`; the internal `outbound_latency_ms` starts only after finalization.

Run outbound-only first, record stage timing and hardware pressure, then return the measured first bottleneck. If `tts_ms` dominates, quality-preserving fragment delivery is the next focused candidate; if queue/delivery dominates during continuous speech, persistent output/playback separation owns the next change; if Start dominates, strengthen and reuse functional proof rather than weakening readiness.

## Evidence Rule

```text
claim
→ owning verifier/scenario
→ exact relevant source identity
→ completed matching evidence
→ only then PASS
```
