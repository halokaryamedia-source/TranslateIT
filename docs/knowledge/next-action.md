# TranslateIT — Next Action

## Current Mode

**Developing / VoiceLab A5 — Canonical Worker Trained Voice Actor Inference: CLOSED SOURCE-SIDE**

A1 single-runtime compatibility, A2 actor/build contracts, A3 guided recording, and A4 GPT-SoVITS build/evaluation remain closed. A5 now gives the **existing canonical Python worker** a bounded daily-inference path for the one explicitly approved `MyVoice` actor. It does not change Meeting lifecycle or create a second inference runtime.

## A5 Result

The active worker now owns this internal path:

```text
UserData/SavedProject/VoiceLab/MyVoice
-> validate actor.json + gpt.ckpt + sovits.pth + reference.wav
-> validate exact GPT-SoVITS engine/revision contract
-> load one GPT-SoVITS V2ProPlus runtime
-> prepare/cache canonical English reference state
-> reuse runtime while actor package identity is unchanged
-> synthesize bounded English text
-> write local WAV under allowed CacheData output roots
```

The new worker protocol is intentionally separate from the existing Meeting TTS commands:

```text
voice_actor_preflight
voice_actor_synthesize
```

Existing `tts_preflight` and `synthesize` remain unchanged for now. This preserves the pre-existing Meeting C4/C5 activation contract until A6 rewires Meeting atomically.

### Actor authority

A5 accepts only the canonical approved actor location:

```text
UserData/SavedProject/VoiceLab/MyVoice
```

The Python inference owner revalidates the same essential actor contract already enforced by Rust promotion:

```text
schema_version = 1
engine = gpt-sovits-v2proplus
engine_revision = d523079fc05d9a8028d6085bffe4a2757c32abb6
gpt_weight_file = gpt.ckpt
sovits_weight_file = sovits.pth
reference_wav_file = reference.wav
held_out_evaluation_complete = true
reference = mono PCM16 / 32 kHz / 3–10 seconds
```

Symlinked/missing/empty actor assets are rejected. The actor package is revalidated after a runtime load before the runtime is cached, so an externally changed actor is not silently accepted during the load boundary.

A bounded file identity tuple `(name, size, mtime_ns)` is used only to invalidate the in-process actor cache when the approved package changes. It is not a release checksum, package registry, or new identity framework.

### Runtime reuse

A5 extends the existing A4 `voice_lab_gpt_sovits.py` provider instead of adding another provider owner. Real GPT-SoVITS model construction occurs under the pinned GPT-SoVITS source root because upstream V2ProPlus contains cwd-relative runtime asset paths. The prior working directory is restored immediately after construction.

The provider now shares one TTS-construction boundary between A4 held-out evaluation and A5 daily actor inference. The canonical reference is prepared once with upstream `set_ref_audio()` and the loaded runtime is reused for later utterances while the actor package remains unchanged.

Pinned upstream V2ProPlus also loads the speaker-verification model when Pro/ProPlus SoVITS weights are initialized, so that asset remains a real runtime requirement rather than an evaluation-only dependency.

### Fail-closed behavior

`voice_actor_synthesize` does **not** call the legacy Piper/SAPI selection path. If `MyVoice`, GPT-SoVITS source assets, model loading, reference preparation, or synthesis fails:

```text
request fails as My Voice unavailable/failed
stale output WAV is removed
no alternate voice is selected
```

A5 therefore does not create an accidental voice substitution policy before Meeting integration.

## Proof

Product source commit:

```text
d8a73bf684cfbca8e6b10ed5a47d3de92b4deb53
Implement VoiceLab A5 trained actor inference
```

Before commit, the hosted exact-patch builder produced these Git blob identities; the committed branch was then verified to contain the same blobs:

```text
realtime_local_worker.py      bfd69011dff492a543896184d437f822a48dc00b
voice_lab_gpt_sovits.py       6230b3d09588f92c775f827d8eb7d74669cefb20
test_voice_actor_inference.py c06fdcd0c2df954404415d8fa8630bd53f85ced0
```

Final accepted hosted Windows worker proof:

```text
run 31739723535
Windows Server 2022 / Python 3.12
uv lock --check -> PASS
uv sync --frozen --no-install-project -> PASS
pyproject.toml + uv.lock remain unchanged -> PASS
A5 Python syntax gate -> PASS
Python tests -> 31 PASS / 0 FAIL
A5_FINAL_SOURCE_PROOF -> PASS
```

The six new A5 tests cover:

```text
approved actor-package contract validation
wrong engine revision rejection
GPT-SoVITS source cwd restoration
actor runtime reuse + reload after package identity change
MyVoice-only synthesis path
failure removes stale output and never invokes legacy voice fallback
worker protocol registration
```

The canonical Python dependency lock remains the A4 lock; A5 did not add another dependency graph or provider surface.

## Not Proven Yet

A5 source closure does **not** prove:

```text
real approved MyVoice weights generated from the user's recordings
actual GPT-SoVITS source/pretrained asset placement on the target installation
real model load or synthesis on the user's target PC
speaker similarity or subjective voice fidelity
GPU/CUDA/VRAM practicality
actual daily-inference latency
long-session inference stability
Meeting Start readiness with MyVoice
Meeting translated-audio routing through MyVoice
physical VB-Cable / meeting-app reception
installer / clean-machine packaging
```

No user-local-PC testing occurred. Hosted Windows source tests use deterministic contract/mocked inference boundaries where real user model assets are unavailable; they do not constitute target voice-quality or hardware proof.

## Next Step

**VoiceLab A6 — Meeting Atomic Custom-TTS Readiness**

Integrate the A5 trained-actor commands into the existing Meeting authority without creating another lifecycle. Replace only the required outbound TTS portion of the C4/C5 Start transaction:

```text
Meeting generation owns Starting
-> existing microphone readiness
-> existing ASR preload / real ASR fixture
-> existing ID -> EN translation fixture
-> voice_actor_preflight loads/warm-caches approved MyVoice
-> bounded real English voice_actor_synthesize fixture succeeds
-> existing native Meeting output callback is ready
-> existing outbound consumer is ready
-> same generation may commit Live
```

A6 must keep generation-bound cache invalidation and fail closed if the approved actor becomes unavailable or changes. When MyVoice is the required outbound authority, do not silently fall back to Piper/SAPI. Keep VoiceLab training mutually exclusive with an active Meeting.

Do not add profile selection, another TTS engine, second worker, background actor loading service, generic readiness framework, or target-PC tuning in A6.