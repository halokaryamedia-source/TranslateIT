# TranslateIT — Next Action

## Current Mode

**Maintenance / VoiceLab Source Closed — WAITING FOR TARGET-WINDOWS AUTHORIZATION**

VoiceLab A1 through A6 are closed source-side. A6 completes the required Meeting custom-TTS integration without adding another Meeting lifecycle, worker, TTS authority, provider registry, or fallback voice path.

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

## Remaining Uncertainty — Target Windows Only

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

No user-local-PC or target-Windows validation was performed while closing A6.

## Next Step

**Target Windows Validation (Requires Explicit Authorization)**

Do not start this step until the user explicitly authorizes target/local Windows testing. Until then, do not add speculative backend, provider, readiness, packaging, or tuning waves. If target evidence later exposes a concrete blocker, reopen only the owner required by that evidence.
