# Current Validation

This file owns **proof interpretation**, not a per-run diary. `next-action.md` owns continuation; GitHub remains authoritative for exact run/job metadata.

## Current Source Proof

Repository: `halokaryamedia-source/TranslateIT`

**Local-only source authority:** `Local` is the sole active branch for development, governance, CI, proof, continuation, and release-source validation.

Current source claims require completed checks on the exact source-changing `Local` SHA being discussed: **one SHA does not prove another SHA**. A later documentation-only SHA may record proof without changing the validated source identity.

Current latency-hardening head: `d246f9bba69966780c346e0e31938b9d4ca69c73`.

Rust/audio-preparation identity `417302f5365978d1822bacf4c0d01383ebff73b3` changed finalized-ASR WAV preparation plus the first Python TTS-validation optimization. Code Health run `34259551481` passed frontend source health, Python compile/static/format/pytest on Linux and hosted Windows, and Rust compiler/dead-code, Clippy and unit tests on Linux and hosted Windows.

Python latency identity `d246f9bba69966780c346e0e31938b9d4ca69c73` retains that Rust blob and adds the final Python inference changes. Code Health run `34260288389` passed Python compile/static/format/pytest on Linux and hosted Windows; unrelated Rust/frontend jobs were intentionally skipped. MiLMMT Repository Contract run `34260288382` passed for the same head.

Current source proof establishes:
- realtime capture uses bounded/preallocated rolling storage, reusable downmix/conversion scratch, a native mono-F32 fast path, allocation-reduced finalized/VAD evidence, and an inactive My Voice atomic fast gate;
- finalized ASR PCM16 WAV bytes are assembled in bounded memory and written once instead of issuing a tiny file write per sample, while atomic temp-file promotion and cleanup remain intact;
- warm My Voice synthesis reuses one already-validated actor package snapshot when resolving the resident runtime, while cold-load post-validation still detects an actor changing during load;
- deterministic MiLMMT generation explicitly enables KV cache without changing the pinned model, prompt/context policy, generation budget, or `do_sample=False` contract;
- Faster-Whisper text-only transcription disables unused timestamp-token decoding while preserving beam=1, explicit language, VAD filtering, and the same transcript consumer contract;
- existing bounded queue/drop, generation authority, cancellation, and fail-closed Meeting semantics remain unchanged.

Older identity `a6431b2b6d13e0c71a34283adc5bbb1f2dc83fdf` remains valid for the preceding realtime-callback hardening it proved. Release identity `42f6591b47d5d66ec796cd0cc8421dcc817849a4` remains the controlled-payload proof; this latency pass did not change controlled payload inputs.

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

REMOTE_GITHUB is complete for the current behavior-preserving latency hardening. It proves the changed source satisfies its selected repository contracts and preserves the existing safety/correctness boundaries.

It does **not** establish physical microphone scheduling, real CUDA performance, CPU/RAM/GPU/VRAM pressure, Meeting Microphone reception, Start → Live time, speaker fidelity, or real end-of-speech → first translated playback latency on TARGET_WINDOWS.

The full generation-bound Meeting Start functional check and resident AI-model policy remain unchanged. GPT-SoVITS also remains full-WAV/non-streaming; streaming TTS must not be introduced unless target timing shows `tts_ms` is the material first bottleneck because that change affects output/cancellation ownership.

### LOCAL_CODE

Can additionally establish exact checkout/toolchain/filesystem/build behavior that actually ran. It still does not automatically establish target-device behavior.

### TARGET_WINDOWS

Required for claims that depend on the user's real Windows hardware/install/audio/device/meeting environment.

## Target Windows

Use `docs/knowledge/operations/target-windows-performance.md`. For perceived latency, evaluate `speech_boundary_ms + outbound_latency_ms`: the internal `outbound_latency_ms` starts only after finalization.

Run outbound-only with a built-in voice first, record stage timing and hardware pressure, then isolate optional incoming, Stop, and repeated-session behavior. Return only the measured first bottleneck; consider streaming TTS only when `tts_ms` is demonstrably dominant.

## Evidence Rule

```text
claim
→ owning verifier/scenario
→ exact relevant source identity
→ completed matching evidence
→ only then PASS
```
