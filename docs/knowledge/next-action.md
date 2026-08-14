# TranslateIT — Next Action

## Current Mode

**Maintenance / Target Windows Validation — AUTHORIZED, TARGET EXECUTION REQUIRED**

VoiceLab A1 through A6 are closed source-side. The user explicitly authorized the next Target Windows Validation stage on 2026-08-14. This stage must produce evidence from the actual target Windows environment; hosted GitHub proof must not be substituted for local device/model/audio evidence.

## A6 Result

The authoritative outbound Start transaction is now:

```text
refresh cheap worker capability truth
-> prepare exact matched Meeting output endpoint
-> Meeting generation owns Starting authority
-> open required microphone capture
-> preload ASR
-> run real Indonesian -> English translation fixture
-> voice_actor_preflight loads/warm-caches approved MyVoice
-> real bounded English voice_actor_synthesize fixture succeeds
-> generated voice is transcribed as a functional ASR check
-> approved actor identity is rechecked
-> bind that actor identity to this Meeting generation
-> prove native Meeting output callback on the prepared endpoint
-> create serialized outbound consumer
-> recheck final required readiness
-> same generation may commit Live
```

Live translated speech then uses only:

```text
finalized Indonesian speech
-> ASR
-> ID -> EN translation
-> voice_actor_synthesize(expected_actor_token = Start-proven MyVoice)
-> existing Rust/CPAL Meeting output route
```

If the approved actor disappears, changes, cannot load, cannot synthesize, or no longer matches the generation-bound actor token, outbound voice fails closed. Meeting does not silently select Piper, Windows SAPI, or another voice.

Diagnostic/First Setup functional readiness remains distinct from Live authority: it may prove the same local AI/MyVoice path without a Meeting generation, but only the generation-bound Start proof can supply the actor token consumed by Live Meeting synthesis.

## Accepted Source Proof

Final accepted hosted Windows proof:

```text
run 31773954105
exact checkout SHA d682f44d02ddd74a731b55bc1d0da6f738bf27f6
Windows Server 2022
A6 static authority guard -> PASS
frozen WorkerRuntime lock/import proof -> PASS
Python tests -> 28 PASS / 0 FAIL
startup + virtual-route + frontend source validators -> PASS
svelte-check -> 0 errors / 0 warnings
frontend production build -> PASS
cargo check --locked -> PASS
Rust tests -> 42 PASS / 0 FAIL
read-only git diff closure guard -> PASS
A6_FINAL_SOURCE_PROOF -> PASS
```

The proof is source/hosted evidence only. It does not claim execution with the user's real trained actor, target GPU, installed virtual-audio endpoint, or meeting application.

## Target Windows Validation Boundary

The remaining unresolved claims require the actual target Windows environment:

```text
packaged PythonRuntime + GPT-SoVITS source/pretrained asset placement
real approved MyVoice weights produced from user recordings
real MyVoice model load and bounded English synthesis
speaker fidelity / subjective listening acceptance
CUDA availability, VRAM practicality, and CPU fallback behavior on target hardware
real Meeting Start cold/warm timing and ongoing inference latency
physical VB-Cable / equivalent endpoint behavior
actual Zoom / Meet / Teams microphone reception
longer Meeting stability and Stop/resource cleanup on target
installer / clean-machine placement and startup behavior
```

Do not add speculative backend, provider, readiness, packaging, compatibility, or tuning work before target evidence identifies a concrete blocker.

## First Authorized Validation Run

Start with the existing application/runtime owners; do not create a parallel validation application or worker.

From `EngineData/Frontend/RustApp` on the target Windows machine:

```text
npm ci
npm run validate:quick
npm run dev:app
```

The first target run is intentionally bounded to establishing real local prerequisites and one end-to-end MyVoice Meeting Start path. Capture only evidence needed to answer these questions:

```text
1. Does the canonical local worker start on the target machine with the frozen environment?
2. Does the approved MyVoice package load and synthesize real English audio?
3. Does Meeting Start reach Live only after the generation-bound MyVoice proof succeeds?
4. Does the prepared virtual microphone endpoint receive translated output through Rust/CPAL?
5. Does one real meeting application receive that endpoint as microphone audio?
6. Does Stop release owned Meeting/audio resources cleanly?
```

If any item fails, record the exact blocker/stage and reopen only the semantic owner responsible for that evidence. Do not generalize one target failure into a new framework.

## Next Step

**Run the first authorized Target Windows validation on the actual target PC and return the concrete pass/fail evidence for the six bounded checks above.**
