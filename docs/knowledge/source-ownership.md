# TranslateIT — Source Ownership

This map points to current semantic owners. File existence alone does not make a capability active.

| Responsibility | Canonical owner | Current status |
|---|---|---|
| Product scope + familiar UI policy | `docs/foundation/01-product-overview.md`, `02-product-requirements.md` including PR-110..119 and PR-166 | ACTIVE / VOICELAB REQUIRED |
| Stable context | `CONTEXT.md` | ACTIVE |
| Continuation | `docs/knowledge/next-action.md` | ACTIVE |
| Durable decisions | `docs/knowledge/decision-log.md` | ACTIVE / D-020 VOICELAB |
| Frontend entry | `EngineData/Frontend/RustApp/src/main.ts` | ACTIVE / ONE SVELTE MOUNT |
| Frontend application owner | `src/App.svelte` | ACTIVE / MEETING + TEXT + VOICELAB + SETTINGS |
| First Setup UI | `src/pages/FirstSetup.svelte` | ACTIVE / FIVE PERSISTED CHECKPOINTS |
| Meeting UI | `src/pages/Meeting.svelte`, `src/components/meeting/MeetingActivity.svelte` | ACTIVE / PRE-VOICELAB TTS |
| Text UI | `src/pages/Text.svelte` | ACTIVE |
| VoiceLab guided-recording UI | `src/pages/VoiceLab.svelte` | ACTIVE A3 / RECORD-REPLAY-RETRY-ACCEPT ONLY / NO TRAINING UI YET |
| Primary navigation | `src/components/layout/Sidebar.svelte` | ACTIVE / MEETING-TEXT-VOICELAB-SETTINGS |
| Frontend VoiceLab bridge | `src/app/bridge/voiceLabApi.ts` | ACTIVE A3 / FOCUSED COMMAND BRIDGE |
| Product facade/readiness projection | `src/app/bridge/runtimeProductFacade.ts` | ACTIVE / MEETING READINESS STILL PRE-VOICELAB TTS |
| Tauri invoke registration | `src-tauri/src/commands/registry.rs` | ACTIVE / A3 GUIDED COMMANDS REGISTERED |
| VoiceLab actor/build contract | `src-tauri/src/commands/voice_lab.rs` | ACTIVE A2 INTERNAL CONTRACT / REAL TRAINING EXECUTOR NOT IMPLEMENTED |
| VoiceLab guided-recording commands | `src-tauri/src/commands/voice_lab_recording.rs` | ACTIVE A3 / EXACT SCRIPT + DRAFT + REPLAY + RETRY + ACCEPT |
| Canonical microphone capture | `engine/audio/live_capture.rs` | ACTIVE / ONE CPAL STREAM / FEEDS OPTIONAL GUIDED SINK |
| VoiceLab guided audio sink | `engine/audio/guided_take.rs` | ACTIVE A3 / MONO BUFFER + RUBATO FFT RESAMPLE TO 32 KHZ |
| PCM16 WAV writer | `engine/audio/live_segment_writer.rs::write_pcm16_wav` | ACTIVE / REUSED BY MEETING + VOICELAB / NO DUPLICATE WRITER |
| Mic Test lifecycle | `engine/capture_lifecycle.rs`, `commands/runtime_capture.rs` | ACTIVE / CANNOT CONTROL ACTIVE VOICELAB TAKE |
| Voice Actor temporary data | `UserData/CacheData/VoiceLab` through `VoiceLabStoragePaths` | ACTIVE / DRAFT + ACCEPTED TAKES + A2 BUILD/CANDIDATE CONTRACT |
| Approved persistent Voice Actor | `UserData/SavedProject/VoiceLab/MyVoice` | ACTIVE A2 CONTRACT / NO REAL TRAINED ACTOR YET |
| Meeting authority | `commands/meeting_session.rs`, `commands/runtime.rs`, `engine/runtime_state.rs` | ACTIVE / ATOMIC START / VOICELAB BUILD EXCLUSION |
| Meeting Microphone route | `commands/virtual_mic_route.rs`, `engine/audio/meeting_output.rs` | ACTIVE |
| Local worker/scheduler | `helper_bridge.rs`, `helper_bridge_runtime.rs`, `realtime_local_worker.py` | ACTIVE / ONE DAILY AI OWNER / CURRENT PRE-VOICELAB TTS |
| VoiceLab training execution | future bounded GPT-SoVITS V2ProPlus child execution through A2 lifecycle | NEXT A4 / NOT IMPLEMENTED |
| Trained Voice Actor daily TTS inference | existing canonical Python worker | APPROVED TARGET / NOT IMPLEMENTED |
| Rust dependency graph | `src-tauri/Cargo.toml` + `Cargo.lock` | ACTIVE / RUBATO `=0.16.2` EXACT-PINNED FOR A3 RESAMPLING |
| Worker Python dependency graph | `WorkerRuntime/pyproject.toml` + `uv.lock` | ACTIVE / A1 CORE COMPATIBILITY PROVED / GPT-SOVITS PERMANENT DEPS NOT YET ADOPTED |
| Voice runtime assets | `EngineData/Backend/RuntimeAssets/Voice/` | CURRENT PRE-VOICELAB ASSETS / GPT-SOVITS ASSET OWNERSHIP NEXT A4 |
| Persisted settings | `engine/settings.rs`, `engine/runtime_settings.rs`, `commands/settings.rs` | ACTIVE / SCHEMA V6 / NO VOICE PROFILE SELECTOR |
| Target runtime proof | target Windows model/audio/device/package checks | DEFERRED UNTIL VOICELAB SOURCE CLOSES |

## VoiceLab Ownership Boundary

VoiceLab now has a real end-user **guided recording** path, but not a training or daily custom-TTS path yet.

```text
VoiceLab.svelte
-> voiceLabApi.ts
-> commands/voice_lab_recording.rs
-> existing live_capture.rs CPAL stream
-> optional guided_take.rs sink
-> local review WAV
-> Retry or Accept
-> UserData/CacheData/VoiceLab/Takes
-> A2 dataset/build contract

A4 build
-> commands/voice_lab.rs lifecycle
-> future bounded GPT-SoVITS V2ProPlus build child
-> Candidate
-> held-out evaluation + user approval
-> A2 promotion
-> SavedProject/VoiceLab/MyVoice

Meeting later
-> existing Meeting authority
-> existing helper/scheduler
-> existing canonical Python worker
-> trained MyVoice inference
-> existing Rust/CPAL Meeting output
```

The graph still explicitly excludes:

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
no generic audio-conversion framework
no training dashboard/progress theater
```

## Guided Recording Ownership

The first recording script is backend-owned in `commands/voice_lab_recording.rs`; each line has an exact English text and stable line ID. The current script has 16 lines only to make the recording/review workflow real. **Sixteen accepted lines are not Voice Actor quality proof and are not a permanent recording-volume requirement.** A4 owns deciding/expanding corpus coverage from fidelity-first training needs.

Recording uses the same configured microphone and the same `live_capture.rs` CPAL stream already used by TranslateIT. `guided_take.rs` is only an optional capture sink: when no VoiceLab take is armed, the callbacks continue normal behavior without a second device/thread owner.

Input is downmixed to mono in the guided sink and converted to the A2 training format after Stop:

```text
source microphone format
-> mono float buffer
-> Rubato 0.16.2 FftFixedInOut
-> 32,000 Hz mono samples
-> shared PCM16 WAV writer
-> review draft
```

Rubato is exact-pinned because fidelity-first accepted audio did not justify the earlier hand-written linear resampler. Version `0.16.2` preserves compatibility with the current Rust 1.77 project; adopting newer Rubato only to obtain a newer version would force unrelated MSRV churn.

A3 deliberately does not reuse all Mic Test heuristics as VoiceLab quality policy. It automatically blocks only unmistakably silent/empty capture. Noise, clipping, corpus sufficiency, speaker similarity, and generated-voice quality belong to A4 model/evaluation evidence rather than arbitrary A3 thresholds.

## Take Persistence

A3 adds the active portion of the existing A2 storage contract:

```text
UserData/CacheData/VoiceLab/
├─ Draft/
│  └─ take_<line-id>.wav
└─ Takes/
   └─ take_<line-id>.wav
```

`Stop` creates the review draft. `Replay` returns local WAV bytes through Tauri IPC. `Retry` removes the draft and keeps any previous accepted take. `Accept` replaces the same line's accepted take while preserving/rolling back the previous file on normal replacement failure.

A deadlock found during A3 review was fixed before closure: command responses no longer rebuild VoiceLab state while still holding the pending-draft mutex.

A2 continues to own later build/promotion storage:

```text
CacheData/VoiceLab/Build/Dataset
CacheData/VoiceLab/Candidate
SavedProject/VoiceLab/MyVoice
```

There is still one `MyVoice`; A3 does not add profile roots, multiple actors, or selection settings.

## Resource And Close Ownership

VoiceLab recording uses the existing direct live-capture runtime claim. `capture_lifecycle.rs` prevents Mic Test Start/Stop from controlling an armed guided take, and existing runtime-session exclusion prevents Meeting from claiming the microphone concurrently.

`App.svelte` prevents normal navigation away from VoiceLab while recording. Native `main.rs` also prevents process exit while a guided take is active, so browser/UI close state is not the only safety boundary.

Pending-review state is transient in-process state. A current bridge-read failure can still project an empty VoiceLab display state; active recording remains protected natively. Do not introduce a generic state-recovery framework solely for that narrow edge. A4 should reconcile close/recovery semantics when a real long-running build process exists.

## Build Lifecycle

`commands/voice_lab.rs` still owns the A2 generation-bound lifecycle:

```text
idle -> preparing -> training -> evaluating -> terminal
active -> cancelling -> terminal
```

A3 does not fake child-process training or expose training commands. Real process start/cancel/join, pretrained assets, candidate checkpoints, held-out synthesis, and approval are A4 responsibilities.

## Dependency Ownership

The first attempt to add Rubato used broad `cargo generate-lockfile` output and was rejected because it rewrote hundreds of unrelated dependency lines. The accepted lock was restored to the A2 baseline and resolved only the bounded Rubato delta: 79 added lock lines and no removals relative to A2.

This establishes a durable rule for the remaining VoiceLab work: dependency adoption must be **bounded to what the active path consumes**. Do not accept upstream/tool-generated lock churn merely because it compiles.

The Python worker lock remains unchanged by A3. A1 proved only that the V2ProPlus model core can coexist with the current worker stack; A4 must earn each permanent Python dependency from real training/evaluation code.

## Proof Boundary

Accepted A3 source proof is hosted Windows run `31711094448`:

```text
npm ci -> PASS
svelte-check -> 0 errors / 0 warnings
Vite production build -> PASS
cargo check -> PASS
cargo test --no-run -> PASS
guided take tests -> 2 PASS / 0 FAIL
ownership guard -> PASS
```

The guided tests cover 48 kHz stereo -> exact one-second 32 kHz mono FFT-resampled output and silent-take rejection.

Run `31708868923` is explicitly **not** accepted as evidence even though GitHub marked it successful; its log contained Svelte errors and the temporary workflow failed to propagate that command failure. A3 was corrected and rerun before closure.

The bounded lock correction was separately proved by run `31710755948` with `A3_LOCK_DELTA_LINES=79`.

Current VoiceLab proof order:

```text
1. canonical scope/ownership alignment -> CLOSED
2. single-runtime GPT-SoVITS core compatibility -> CLOSED A1
3. Voice Actor/build lifecycle contract -> CLOSED A2
4. guided recording + accepted-take persistence -> CLOSED A3 SOURCE-SIDE
5. GPT-SoVITS real build + held-out evaluation -> NEXT A4
6. canonical-worker daily trained-actor inference
7. Meeting atomic custom-TTS readiness
8. source closure audit
9. target-Windows speaker-quality/latency/device acceptance
```

A3 hosted proof does not prove physical microphone behavior, recording-room quality, replay fidelity, sufficient corpus size, trained-voice similarity, CUDA/VRAM practicality, real training cancellation, Meeting TTS latency, or meeting-app audio reception.