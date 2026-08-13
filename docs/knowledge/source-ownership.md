# TranslateIT — Source Ownership

This map points to current semantic owners. File existence or hosted source proof alone does not establish target-PC capability.

| Responsibility | Canonical owner | Current status |
|---|---|---|
| Product scope + familiar UI policy | `docs/foundation/01-product-overview.md`, `02-product-requirements.md` including PR-110..119 and PR-166 | ACTIVE / VOICELAB REQUIRED |
| Stable context | `CONTEXT.md` | ACTIVE |
| Continuation | `docs/knowledge/next-action.md` | ACTIVE / A6 NEXT |
| Durable decisions | `docs/knowledge/decision-log.md` | ACTIVE / D-020 VOICELAB |
| Frontend entry | `EngineData/Frontend/RustApp/src/main.ts` | ACTIVE / ONE SVELTE MOUNT |
| Frontend application owner | `src/App.svelte` | ACTIVE / MEETING + TEXT + VOICELAB + SETTINGS |
| First Setup UI | `src/pages/FirstSetup.svelte` | ACTIVE / FIVE PERSISTED CHECKPOINTS |
| Meeting UI | `src/pages/Meeting.svelte`, `src/components/meeting/MeetingActivity.svelte` | ACTIVE / PRE-A6 TTS ROUTE |
| Text UI | `src/pages/Text.svelte` | ACTIVE |
| VoiceLab page | `src/pages/VoiceLab.svelte` | ACTIVE / GUIDED RECORDING + BUILD/EVALUATION ENTRY |
| VoiceLab build/evaluation UI | `src/components/voice-lab/VoiceLabBuild.svelte` | ACTIVE A4 / CREATE-STOP-PREVIEW-APPROVE |
| Primary navigation | `src/components/layout/Sidebar.svelte` | ACTIVE / MEETING-TEXT-VOICELAB-SETTINGS |
| VoiceLab recording bridge | `src/app/bridge/voiceLabApi.ts` | ACTIVE A3 |
| VoiceLab build bridge | `src/app/bridge/voiceLabBuildApi.ts` | ACTIVE A4 |
| Product facade/readiness projection | `src/app/bridge/runtimeProductFacade.ts` | ACTIVE / MEETING READINESS STILL PRE-A6 TTS |
| Tauri invoke registration | `src-tauri/src/commands/registry.rs` | ACTIVE / A3 + A4 VOICELAB DESKTOP COMMANDS |
| VoiceLab actor/build contract | `src-tauri/src/commands/voice_lab.rs` | ACTIVE A2/A4 / DATASET-LIFECYCLE-PROMOTION CONTRACT |
| VoiceLab guided-recording commands | `src-tauri/src/commands/voice_lab_recording.rs` | ACTIVE A3 |
| VoiceLab build/evaluation commands | `src-tauri/src/commands/voice_lab_build.rs` | CLOSED A4 SOURCE-SIDE |
| Canonical microphone capture | `engine/audio/live_capture.rs` | ACTIVE / ONE CPAL STREAM / FEEDS OPTIONAL GUIDED SINK |
| VoiceLab guided audio sink | `engine/audio/guided_take.rs` | ACTIVE A3 / MONO + RUBATO FFT RESAMPLE TO 32 KHZ |
| PCM16 WAV writer | `engine/audio/live_segment_writer.rs::write_pcm16_wav` | ACTIVE / SHARED BY MEETING + VOICELAB |
| Mic Test lifecycle | `engine/capture_lifecycle.rs`, `commands/runtime_capture.rs` | ACTIVE / CANNOT CONTROL ACTIVE VOICELAB TAKE |
| VoiceLab one-shot build child | `WorkerRuntime/voice_lab_build.py` | CLOSED A4 SOURCE-SIDE / NOT DAILY WORKER |
| GPT-SoVITS provider adapter | `WorkerRuntime/voice_lab_gpt_sovits.py` | ACTIVE A4+A5 / BUILD, HELD-OUT EVAL, TRAINED-ACTOR INFERENCE |
| Headless upstream stage boundary | `WorkerRuntime/voice_lab_upstream_stage.py` | ACTIVE / EXCLUDES GRADIO WEBUI SURFACE |
| Voice Actor temporary data | `UserData/CacheData/VoiceLab` through `VoiceLabStoragePaths` | ACTIVE / DRAFT + TAKES + BUILD + CANDIDATE + EVALUATION |
| Approved persistent Voice Actor | `UserData/SavedProject/VoiceLab/MyVoice` | ACTIVE / ONE APPROVED ACTOR AUTHORITY |
| Meeting authority | `commands/meeting_session.rs`, `commands/runtime.rs`, `engine/runtime_state.rs` | ACTIVE / ATOMIC START / VOICELAB BUILD EXCLUSION |
| Meeting Microphone route | `commands/virtual_mic_route.rs`, `engine/audio/meeting_output.rs` | ACTIVE |
| Local worker/scheduler | `helper_bridge.rs`, `helper_bridge_runtime.rs`, `realtime_local_worker.py` | ACTIVE / ONE DAILY AI OWNER |
| Trained Voice Actor worker commands | `realtime_local_worker.py::handle_voice_actor_preflight`, `handle_voice_actor_synthesize` | CLOSED A5 SOURCE-SIDE / NOT YET MEETING-AUTHORITATIVE |
| Trained Voice Actor runtime cache | `realtime_local_worker.py::get_voice_actor_runtime` + `voice_lab_gpt_sovits.py::load_voice_actor_runtime` | CLOSED A5 SOURCE-SIDE / INVALIDATES WHEN APPROVED PACKAGE CHANGES |
| Meeting custom-TTS readiness | existing helper + Meeting Start transaction | NEXT A6 / NOT IMPLEMENTED |
| Rust dependency graph | `src-tauri/Cargo.toml` + `Cargo.lock` | ACTIVE / RUBATO `=0.16.2` FOR GUIDED RESAMPLING |
| Worker Python dependency graph | `WorkerRuntime/pyproject.toml` + `uv.lock` | ACTIVE A4+A5 / ONE FROZEN RUNTIME GRAPH |
| Voice runtime assets | `EngineData/Backend/RuntimeAssets/Voice/` | GPT-SOVITS OWNERSHIP DEFINED / TARGET PACKAGED BYTES UNPROVEN |
| Release model inventory | `WorkerRuntime/model_manifest.json` | ACTIVE / GPT-SOVITS + PIPER MANUAL/RELEASE ASSET INVENTORY |
| Persisted settings | `engine/settings.rs`, `engine/runtime_settings.rs`, `commands/settings.rs` | ACTIVE / SCHEMA V6 / NO VOICE PROFILE SELECTOR |
| Target runtime proof | target Windows model/audio/device/package checks | DEFERRED UNTIL VOICELAB SOURCE CHAIN CLOSES |

## VoiceLab Ownership Boundary

VoiceLab creation through A4 and daily trained-actor inference through A5 are now source-closed. Meeting authority remains deliberately separate until A6.

```text
A3 recording
-> VoiceLab.svelte
-> voiceLabApi.ts
-> voice_lab_recording.rs
-> existing live_capture.rs
-> guided_take.rs
-> CacheData/VoiceLab/Takes

A4 creation
-> VoiceLabBuild.svelte
-> voiceLabBuildApi.ts
-> voice_lab_build.rs
-> voice_lab_build.py one-shot child
-> voice_lab_gpt_sovits.py
-> pinned GPT-SoVITS V2ProPlus
-> held-out evaluation
-> explicit user approval
-> SavedProject/VoiceLab/MyVoice

A5 daily inference
-> existing realtime_local_worker.py
-> fixed approved MyVoice location
-> actor contract revalidation
-> one loaded GPT-SoVITS runtime
-> cached canonical English reference
-> voice_actor_preflight / voice_actor_synthesize
-> bounded CacheData WAV

A6 next
-> existing helper/scheduler
-> generation-bound Meeting Start readiness
-> functional MyVoice synthesis fixture
-> existing native output callback
-> existing outbound consumer
-> same generation commits Live
```

The graph explicitly excludes:

```text
no browser microphone capture path
no second CPAL audio engine
no imported-audio VoiceLab mode
no ASR-based guided-line labeling
no OpenVoice/Qwen/Piper alternate custom-voice authority
no provider/model registry
no VoiceLab database
no second settings store
no background training scheduler
no simultaneous VoiceLab training + Meeting
no second daily Python inference worker
no generic audio-conversion framework
no training dashboard/progress theater
no Gradio/FunASR/ModelScope dependency surface
no voice-profile selector
```

## Guided Recording And Promotion Ownership

The guided script remains backend-owned in `commands/voice_lab_recording.rs`; each line has exact English text and a stable line ID. Recording uses the configured microphone and the existing `live_capture.rs` CPAL stream. `guided_take.rs` is an optional sink, not a second capture engine.

```text
source microphone format
-> mono float buffer
-> Rubato 0.16.2 FftFixedInOut
-> 32,000 Hz mono samples
-> shared PCM16 WAV writer
-> review draft
```

A4 promotion still requires native actor artifacts plus completed held-out evaluation and explicit approval:

```text
gpt.ckpt
sovits.pth
reference.wav
actor.json
held_out_evaluation_complete = true
```

An invalid rebuild candidate cannot replace the currently approved actor.

## A5 Daily Inference Ownership

A5 deliberately extends the **existing canonical Python worker** instead of replacing it or adding another worker. It introduces internal worker tasks:

```text
voice_actor_preflight
voice_actor_synthesize
```

Existing Meeting tasks `tts_preflight` and `synthesize` are not redirected in A5. That change belongs to A6 so Meeting activation remains atomic rather than partially migrated.

The actor authority is fixed:

```text
UserData/SavedProject/VoiceLab/MyVoice
```

`realtime_local_worker.py` validates this package before reuse. `voice_lab_gpt_sovits.py` validates the same essential package contract used by Rust promotion: exact schema, engine/revision, filenames, held-out approval state, regular nonempty weight/reference files, and canonical 32 kHz mono PCM16 reference duration.

The worker keeps only one in-process actor runtime. A bounded `(name, size, mtime_ns)` package identity is used to invalidate that cache when the approved actor changes. This identity is runtime cache invalidation only; it is not a release checksum or artifact registry.

Runtime load is revalidated after model construction before the cache is published. If the package changes during load, the runtime is discarded and the request fails.

The pinned upstream V2ProPlus TTS implementation contains cwd-relative source/model paths. The shared provider therefore constructs the runtime inside the pinned GPT-SoVITS source directory and restores the previous process directory afterward. This same construction owner is reused by A4 held-out evaluation and A5 daily inference.

The canonical reference is prepared once through upstream `set_ref_audio()` and reused through the loaded TTS prompt cache. A later utterance does not retrain or reconstruct the actor when the approved package is unchanged.

A5 fails closed for MyVoice synthesis. Missing/invalid actor files, source assets, model load, reference preparation, or synthesis do not invoke Piper/SAPI. Any stale destination WAV is removed on failure.

## Storage Ownership

```text
UserData/CacheData/VoiceLab/
├─ Draft/
├─ Takes/
├─ Build/
├─ Candidate/
└─ Evaluation/

UserData/SavedProject/VoiceLab/
└─ MyVoice/
```

`CacheData` is temporary/build/output evidence. `SavedProject/VoiceLab/MyVoice` is the one explicitly approved persistent actor. There is no multiple-actor database or legacy profile-root setting.

## GPT-SoVITS And Dependency Ownership

Pinned source revision:

```text
d523079fc05d9a8028d6085bffe4a2757c32abb6
```

Permanent Python dependencies remain owned only by:

```text
WorkerRuntime/pyproject.toml
WorkerRuntime/uv.lock
```

Canonical `uv.lock` remains the A4 clean resolution with Git blob:

```text
93c34e63a4e2dc793606f84ed498a10b09ea40a3
```

A5 adds no Python dependency and no alternate provider surface. Upstream V2ProPlus itself initializes the speaker-verification model for Pro/ProPlus SoVITS weights, so the existing `sv` pretrained asset remains a genuine daily inference requirement.

English G2P/NLTK data remains explicit local runtime data; runtime code must not download it on demand.

## Proof Boundary

Accepted VoiceLab source proofs:

```text
A1 core compatibility -> CLOSED
A2 lifecycle/storage contract -> CLOSED
A3 guided recording/persistence -> CLOSED SOURCE-SIDE
A4 GPT-SoVITS build + held-out evaluation -> CLOSED SOURCE-SIDE
A5 canonical-worker trained-actor inference -> CLOSED SOURCE-SIDE
```

A4 provider compatibility: hosted Windows run `31724026882`.

A4 final current-source proof: hosted Windows run `31733950503` with 25 Python tests, Svelte build/typecheck, Rust compile, and 5 VoiceLab Rust tests.

A5 product source commit:

```text
d8a73bf684cfbca8e6b10ed5a47d3de92b4deb53
```

Verified A5 product blobs:

```text
realtime_local_worker.py      bfd69011dff492a543896184d437f822a48dc00b
voice_lab_gpt_sovits.py       6230b3d09588f92c775f827d8eb7d74669cefb20
test_voice_actor_inference.py c06fdcd0c2df954404415d8fa8630bd53f85ced0
```

Accepted A5 final hosted Windows proof is run `31739723535`:

```text
uv lock --check -> PASS
uv sync --frozen --no-install-project -> PASS
dependency owners unchanged -> PASS
Python syntax gate -> PASS
Python tests -> 31 PASS / 0 FAIL
A5_FINAL_SOURCE_PROOF -> PASS
```

Current proof order:

```text
1. canonical scope/ownership alignment -> CLOSED
2. single-runtime GPT-SoVITS core compatibility -> CLOSED A1
3. Voice Actor/build lifecycle contract -> CLOSED A2
4. guided recording + accepted-take persistence -> CLOSED A3 SOURCE-SIDE
5. GPT-SoVITS build + held-out evaluation -> CLOSED A4 SOURCE-SIDE
6. canonical-worker daily trained-actor inference -> CLOSED A5 SOURCE-SIDE
7. Meeting atomic custom-TTS readiness -> NEXT A6
8. final source closure audit
9. target-Windows speaker-quality/latency/device/package acceptance
```

Hosted A5 proof does not prove real user actor weights, target GPT-SoVITS asset placement, target model load, speaker fidelity, CUDA/VRAM practicality, real inference latency, long-session stability, Meeting custom-TTS readiness, meeting-app audio reception, installer placement, or clean-machine execution. No user-local-PC testing occurred.