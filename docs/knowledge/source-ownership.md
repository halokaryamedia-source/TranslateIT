# TranslateIT — Source Ownership

This map points to current semantic owners. File existence or hosted source proof alone does not establish target-PC capability.

| Responsibility | Canonical owner | Current status |
|---|---|---|
| Product scope + familiar UI policy | `docs/foundation/01-product-overview.md`, `02-product-requirements.md` including PR-110..119 and PR-166 | ACTIVE / VOICELAB REQUIRED |
| Stable context | `CONTEXT.md` | ACTIVE |
| Continuation | `docs/knowledge/next-action.md` | ACTIVE / A5 NEXT |
| Durable decisions | `docs/knowledge/decision-log.md` | ACTIVE / D-020 VOICELAB |
| Frontend entry | `EngineData/Frontend/RustApp/src/main.ts` | ACTIVE / ONE SVELTE MOUNT |
| Frontend application owner | `src/App.svelte` | ACTIVE / MEETING + TEXT + VOICELAB + SETTINGS |
| First Setup UI | `src/pages/FirstSetup.svelte` | ACTIVE / FIVE PERSISTED CHECKPOINTS |
| Meeting UI | `src/pages/Meeting.svelte`, `src/components/meeting/MeetingActivity.svelte` | ACTIVE / PRE-VOICELAB DAILY TTS |
| Text UI | `src/pages/Text.svelte` | ACTIVE |
| VoiceLab page | `src/pages/VoiceLab.svelte` | ACTIVE A4 / GUIDED RECORDING + BUILD/EVALUATION ENTRY |
| VoiceLab build/evaluation UI | `src/components/voice-lab/VoiceLabBuild.svelte` | ACTIVE A4 / CREATE-STOP-PREVIEW-APPROVE |
| Primary navigation | `src/components/layout/Sidebar.svelte` | ACTIVE / MEETING-TEXT-VOICELAB-SETTINGS |
| VoiceLab recording bridge | `src/app/bridge/voiceLabApi.ts` | ACTIVE A3 / RECORD-REPLAY-RETRY-ACCEPT |
| VoiceLab build bridge | `src/app/bridge/voiceLabBuildApi.ts` | ACTIVE A4 / STATUS-START-CANCEL-APPROVE-EVALUATION AUDIO |
| Product facade/readiness projection | `src/app/bridge/runtimeProductFacade.ts` | ACTIVE / MEETING READINESS STILL PRE-VOICELAB DAILY TTS |
| Tauri invoke registration | `src-tauri/src/commands/registry.rs` | ACTIVE / A3 + A4 VOICELAB COMMANDS REGISTERED |
| VoiceLab actor/build contract | `src-tauri/src/commands/voice_lab.rs` | ACTIVE A2/A4 / DATASET-LIFECYCLE-PROMOTION CONTRACT |
| VoiceLab guided-recording commands | `src-tauri/src/commands/voice_lab_recording.rs` | ACTIVE A3 |
| VoiceLab build/evaluation commands | `src-tauri/src/commands/voice_lab_build.rs` | ACTIVE A4 SOURCE-SIDE / PROCESS-STATUS-CANCEL-EVALUATE-APPROVE |
| Canonical microphone capture | `engine/audio/live_capture.rs` | ACTIVE / ONE CPAL STREAM / FEEDS OPTIONAL GUIDED SINK |
| VoiceLab guided audio sink | `engine/audio/guided_take.rs` | ACTIVE A3 / MONO + RUBATO FFT RESAMPLE TO 32 KHZ |
| PCM16 WAV writer | `engine/audio/live_segment_writer.rs::write_pcm16_wav` | ACTIVE / SHARED BY MEETING + VOICELAB |
| Mic Test lifecycle | `engine/capture_lifecycle.rs`, `commands/runtime_capture.rs` | ACTIVE / CANNOT CONTROL ACTIVE VOICELAB TAKE |
| VoiceLab one-shot build child | `WorkerRuntime/voice_lab_build.py` | ACTIVE A4 SOURCE-SIDE / NOT A SERVER OR DAILY WORKER |
| GPT-SoVITS provider adapter | `WorkerRuntime/voice_lab_gpt_sovits.py` | ACTIVE A4 / PINNED V2PROPLUS BUILD + HELD-OUT SYNTHESIS |
| Headless upstream stage boundary | `WorkerRuntime/voice_lab_upstream_stage.py` | ACTIVE A4 / EXCLUDES GRADIO WEBUI SURFACE |
| Voice Actor temporary data | `UserData/CacheData/VoiceLab` through `VoiceLabStoragePaths` | ACTIVE / DRAFT + TAKES + BUILD + CANDIDATE + EVALUATION |
| Approved persistent Voice Actor | `UserData/SavedProject/VoiceLab/MyVoice` | ACTIVE CONTRACT / CREATED ONLY AFTER USER APPROVAL |
| Meeting authority | `commands/meeting_session.rs`, `commands/runtime.rs`, `engine/runtime_state.rs` | ACTIVE / ATOMIC START / VOICELAB BUILD EXCLUSION |
| Meeting Microphone route | `commands/virtual_mic_route.rs`, `engine/audio/meeting_output.rs` | ACTIVE |
| Local worker/scheduler | `helper_bridge.rs`, `helper_bridge_runtime.rs`, `realtime_local_worker.py` | ACTIVE / ONE DAILY AI OWNER / TRAINED-ACTOR INFERENCE NEXT A5 |
| VoiceLab training execution | `voice_lab_build.rs` -> `voice_lab_build.py` -> `voice_lab_gpt_sovits.py` | CLOSED A4 SOURCE-SIDE / TARGET TRAINING PERFORMANCE UNPROVEN |
| Trained Voice Actor daily TTS inference | existing canonical Python worker | NEXT A5 / NOT IMPLEMENTED |
| Rust dependency graph | `src-tauri/Cargo.toml` + `Cargo.lock` | ACTIVE / RUBATO `=0.16.2` FOR GUIDED RESAMPLING |
| Worker Python dependency graph | `WorkerRuntime/pyproject.toml` + `uv.lock` | ACTIVE A4 / PERMANENT SINGLE-RUNTIME GPT-SOVITS DEPENDENCIES |
| Voice runtime assets | `EngineData/Backend/RuntimeAssets/Voice/` | GPT-SOVITS OWNERSHIP DEFINED / TARGET PACKAGED BYTES UNPROVEN |
| Release model inventory | `WorkerRuntime/model_manifest.json` | ACTIVE / REQUIRED GPT-SOVITS VOICELAB + PIPER MANUAL/RELEASE ASSETS |
| Persisted settings | `engine/settings.rs`, `engine/runtime_settings.rs`, `commands/settings.rs` | ACTIVE / SCHEMA V6 / NO VOICE PROFILE SELECTOR |
| Target runtime proof | target Windows model/audio/device/package checks | DEFERRED UNTIL VOICELAB SOURCE CHAIN CLOSES |

## VoiceLab Ownership Boundary

VoiceLab now has a source-complete creation path through A4. Daily trained-actor inference and Meeting integration remain separate later owners.

```text
VoiceLab recording
-> VoiceLab.svelte
-> voiceLabApi.ts
-> voice_lab_recording.rs
-> existing live_capture.rs CPAL stream
-> optional guided_take.rs sink
-> local review WAV
-> Retry or Accept
-> UserData/CacheData/VoiceLab/Takes

A4 creation
-> VoiceLabBuild.svelte
-> voiceLabBuildApi.ts
-> voice_lab_build.rs
-> A2 generation-bound lifecycle
-> voice_lab_build.py one-shot child
-> voice_lab_gpt_sovits.py
-> voice_lab_upstream_stage.py headless boundary
-> pinned GPT-SoVITS V2ProPlus
-> Candidate
-> held-out evaluation
-> explicit user approval
-> atomic promotion
-> UserData/SavedProject/VoiceLab/MyVoice

A5 next
-> existing canonical Python worker
-> approved MyVoice native artifacts
-> cached reference state
-> English daily inference

Meeting later
-> existing Meeting authority
-> existing helper/scheduler
-> trained MyVoice inference
-> functional custom-TTS readiness before Live
-> existing Rust/CPAL Meeting output
```

The graph explicitly excludes:

```text
no browser microphone capture path
no second CPAL audio engine
no imported-audio VoiceLab mode
no ASR-based guided-line labeling
no OpenVoice/Qwen/Piper alternate custom-voice path
no provider/model registry
no VoiceLab database
no second settings store
no background training scheduler
no simultaneous VoiceLab training + Meeting
no second daily Python inference worker
no generic audio-conversion framework
no training dashboard/progress theater
no Gradio/FunASR/ModelScope dependency surface
```

## Guided Recording Ownership

The guided script is backend-owned in `commands/voice_lab_recording.rs`; each line has exact English text and a stable line ID. The current script is the product recording workflow, not a claim that a particular line count alone guarantees high speaker fidelity.

Recording uses the configured microphone and the existing `live_capture.rs` CPAL stream. `guided_take.rs` is an optional sink, not a second capture engine.

```text
source microphone format
-> mono float buffer
-> Rubato 0.16.2 FftFixedInOut
-> 32,000 Hz mono samples
-> shared PCM16 WAV writer
-> review draft
```

A3 automatically blocks only unmistakably silent/empty capture. Voice quality is not reduced to a fabricated score. A4 requires held-out generated samples and explicit listening approval before promotion.

## Build And Promotion Ownership

`commands/voice_lab.rs` owns the generation-bound lifecycle:

```text
idle -> preparing -> training -> evaluating -> terminal
active -> cancelling -> terminal
```

A4 connects that lifecycle to a real one-shot child process. `voice_lab_build.rs` is the desktop/process authority; Python does not become a second application lifecycle owner.

The child publishes bounded status through the A4 status contract. Rust reconciles child `preparing / training / evaluating` state into the existing lifecycle instead of fabricating immediate training progress. Cancellation terminates the child process tree and waits for lifecycle convergence.

Build start is blocked while a guided recording is active and remains mutually exclusive with Meeting runtime authority. No background training scheduler or GPU arbitration framework is introduced.

A candidate is not the approved actor. Promotion requires the native A2 actor contract:

```text
gpt.ckpt
sovits.pth
reference.wav
actor.json
held-out evaluation complete
```

and explicit user approval. An invalid rebuild candidate cannot replace the currently approved actor.

## Storage Ownership

```text
UserData/CacheData/VoiceLab/
├─ Draft/
├─ Takes/
├─ Build/
│  ├─ Dataset/
│  └─ Runtime/
├─ Candidate/
└─ Evaluation/

UserData/SavedProject/VoiceLab/
└─ MyVoice/
```

`CacheData` is temporary/build evidence. `SavedProject/VoiceLab/MyVoice` is the one explicitly approved persistent actor. There is no profile-root selector, multiple-actor database, or reintroduced legacy `voice_actor_profile_id` setting.

## GPT-SoVITS And Dependency Ownership

The A4 source pin is:

```text
d523079fc05d9a8028d6085bffe4a2757c32abb6
```

TranslateIT does not accept the full upstream application surface as product dependencies. `voice_lab_upstream_stage.py` supplies the small headless compatibility boundary needed by the approved training/evaluation scripts so upstream Gradio-only helper imports do not force WebUI dependencies into the product.

Permanent Python dependencies are owned only by:

```text
WorkerRuntime/pyproject.toml
WorkerRuntime/uv.lock
```

The accepted `uv.lock` was generated cleanly from canonical `pyproject.toml`. Its tracked Git blob is:

```text
93c34e63a4e2dc793606f84ed498a10b09ea40a3
```

The permanent Windows resolution includes Torch/TorchAudio `2.11.0+cu126`, Transformers `4.50.0`, and NumPy `1.26.4`. The provider proof and final frozen-sync proof both passed without Gradio, FunASR, ModelScope, or `onnxruntime-gpu`.

English G2P/NLTK data is an explicit local asset requirement. Runtime code must not download language data on demand.

The full-product model inventory lists GPT-SoVITS VoiceLab and Piper as required manual/release assets. `prepare_model_assets.py` remains a revision-pinned Hugging Face developer downloader and does not fabricate those manual release assets.

## Resource And Close Ownership

VoiceLab recording retains the existing direct live-capture claim. Mic Test cannot seize an active guided take, and Meeting cannot claim conflicting runtime resources while VoiceLab work owns them.

A4 adds a real long-running build process, but does not create a background service. The build status bridge polls the Rust owner while active. Stop/Cancel goes through the A4 Rust process owner.

Normal product UI remains intentionally human-facing: recording, creating, preview, approval, and My Voice. Provider checkpoints, epochs, CUDA internals, and similarity metrics are not promoted to normal controls.

## Proof Boundary

Accepted prior VoiceLab source proofs remain:

```text
A1 provider/core compatibility -> CLOSED
A2 lifecycle/storage contract -> CLOSED
A3 guided recording/persistence -> CLOSED SOURCE-SIDE
```

Accepted A4 provider compatibility proof is hosted Windows run `31724026882`:

```text
current worker compatibility -> PASS
offline English G2P -> PASS
exact pinned headless V2ProPlus imports -> PASS
provider-scope exclusion -> PASS
```

Accepted A4 final current-source proof is hosted Windows run `31733950503`. Its log was inspected directly and shows:

```text
uv lock --check -> PASS
uv sync --frozen -> PASS
Python tests -> 25 PASS / 0 FAIL
permanent worker imports -> PASS
provider-scope exclusion -> PASS
svelte-check -> 0 errors / 0 warnings
Vite production build -> PASS
cargo check --locked -> PASS
cargo test --no-run --locked -> PASS
VoiceLab Rust tests -> 5 PASS / 0 FAIL
A4_FINAL_SOURCE_PROOF -> PASS
```

The Rust compiler still emits a small number of unrelated existing warnings. They are not A4 blockers and are not a reason to create a speculative cleanup wave.

Current VoiceLab proof order is now:

```text
1. canonical scope/ownership alignment -> CLOSED
2. single-runtime GPT-SoVITS core compatibility -> CLOSED A1
3. Voice Actor/build lifecycle contract -> CLOSED A2
4. guided recording + accepted-take persistence -> CLOSED A3 SOURCE-SIDE
5. GPT-SoVITS build + held-out evaluation -> CLOSED A4 SOURCE-SIDE
6. canonical-worker daily trained-actor inference -> NEXT A5
7. Meeting atomic custom-TTS readiness
8. final source closure audit
9. target-Windows speaker-quality/latency/device/package acceptance
```

Hosted A4 proof does not prove physical microphone behavior, room quality, actual target pretrained-asset placement, real target training duration/cancellation, CUDA/VRAM practicality, subjective speaker fidelity, trained-actor daily inference, Meeting TTS latency, meeting-app audio reception, or installer/clean-machine behavior. No user-local-PC testing occurred.