# TranslateIT — Source Ownership

This map points to current semantic owners. File existence alone does not make a capability active.

| Responsibility | Canonical owner | Current status |
|---|---|---|
| Product scope + familiar UI policy | `docs/foundation/01-product-overview.md`, `02-product-requirements.md` including PR-110..119 and PR-166 | ACTIVE / VOICELAB APPROVED |
| Stable context | `CONTEXT.md` | ACTIVE |
| Continuation | `docs/knowledge/next-action.md` | ACTIVE |
| Durable decisions | `docs/knowledge/decision-log.md` | ACTIVE / D-020 VOICELAB |
| Frontend entry | `EngineData/Frontend/RustApp/src/main.ts` | ACTIVE / ONE SVELTE MOUNT |
| Frontend application owner | `src/App.svelte` | ACTIVE SOURCE / COHERENT SNAPSHOT + GATED LIVE TRANSCRIPT |
| First Setup UI | `src/pages/FirstSetup.svelte` | ACTIVE SOURCE / FIVE PERSISTED CHECKPOINTS / ATOMIC DEVICE SELECTION |
| Meeting Ready UI | `src/pages/Meeting.svelte` | ACTIVE SOURCE / FAMILIAR SPEAK -> HEAR FLOW / PRE-VOICELAB TTS |
| Meeting live transcript/activity | `src/components/meeting/MeetingActivity.svelte` | ACTIVE SOURCE / LISTENING-TRANSLATING-SPEAKING |
| Text UI | `src/pages/Text.svelte` | ACTIVE SOURCE / FROM-TO + SWAP + TRANSLATE + EDIT + COPY / USER-SAFE FAILURES |
| VoiceLab UI | future `src/pages/VoiceLab.svelte` under existing Svelte app | APPROVED / NOT IMPLEMENTED / A2 BACKEND CONTRACT GROUNDED |
| Settings / Diagnostics UI | `src/pages/Settings.svelte` | ACTIVE SOURCE / MEETING-ADVANCED TABS / DIAGNOSTICS REFRESH ON OPEN |
| Primary navigation | `src/components/layout/Sidebar.svelte` | ACTIVE SOURCE / CURRENTLY MEETING-TEXT-SETTINGS / VOICELAB TARGET PENDING |
| Shared status badge | `src/components/ui/StatusBadge.svelte` | ACTIVE SOURCE / ATTENTION STATES |
| Shared readiness/status row | `src/components/ui/StatusRow.svelte` | ACTIVE SOURCE / OPTIONAL HEALTHY BADGE |
| Semantic visual tokens | `src/styles/tokens.css` | ACTIVE / SINGLE TOKEN OWNER |
| Base/layout/component styling | `src/styles/app.css` | ACTIVE / TAILWIND + BOUNDED SHARED CLASSES |
| Frontend Tauri bridge | `src/app/bridge/runtimeApi.ts` | ACTIVE / TRANSPORT BOUNDARY / VOICELAB COMMANDS NOT YET PRESENT |
| Product facade/readiness projection | `src/app/bridge/runtimeProductFacade.ts` | ACTIVE / CURRENT MEETING-PREFLIGHT PROJECTION / VOICELAB READINESS NOT YET PRESENT |
| Shared frontend settings/error helpers | `src/app/shared/state.ts`, `types.ts`, `tauriBridge.ts` | ACTIVE / RETAINED |
| Tauri invoke registration | `src-tauri/src/commands/registry.rs` | ACTIVE / PRUNED / VOICELAB NOT YET REGISTERED |
| VoiceLab build lifecycle + actor contract | `src-tauri/src/commands/voice_lab.rs` | ACTIVE A2 SOURCE CONTRACT / INTERNAL ONLY / NOT A GENERIC SERVICE FRAMEWORK |
| VoiceLab recording capture | existing Rust/CPAL audio ownership extended only where guided recording requires it | APPROVED RESPONSIBILITY / NEXT A3 / NOT IMPLEMENTED / NO SECOND AUDIO ENGINE |
| Voice Actor temporary build data | `UserData/CacheData/VoiceLab` through existing path semantics | ACTIVE A2 CONTRACT / TAKES + FROZEN DATASET + CANDIDATE OWNERSHIP |
| Approved persistent Voice Actor | `UserData/SavedProject/VoiceLab/MyVoice` through existing path semantics | ACTIVE A2 CONTRACT / VALIDATED PROMOTION + PREVIOUS-ACTOR PRESERVATION |
| Meeting authority | `commands/meeting_session.rs`, `commands/runtime.rs`, `engine/runtime_state.rs` | ACTIVE / ATOMIC START + PUBLIC START BLOCKS WHILE VOICELAB BUILD IS ACTIVE |
| Physical microphone + Meeting Sound | `engine/audio/*` | ACTIVE |
| Audio-device selection transaction | `commands/settings.rs` + `commands/audio.rs` + `engine/audio/input.rs` | ACTIVE / FUNCTIONAL MIC PROBE + PRESERVE + SAVE OWNER |
| Mic Test lifecycle | `engine/capture_lifecycle.rs`, `commands/runtime_capture.rs` | ACTIVE / BOUNDED |
| Meeting Microphone route | `commands/virtual_mic_route.rs`, `engine/audio/meeting_output.rs` | ACTIVE / MATCHED ROUTE + PRE-LIVE SILENT CALLBACK PROBE + RUST/CPAL DELIVERY |
| Outbound latency instrumentation | `engine/audio/finalized_utterance.rs`, `commands/meeting_session.rs`, `engine/audio/meeting_output.rs` | ACTIVE / PR-052 TRANSIENT STAGE TIMING + CPAL PREDICTED FIRST PLAYBACK |
| Local worker/scheduler | `helper_bridge.rs`, `helper_bridge_runtime.rs`, `realtime_local_worker.py` | ACTIVE / ONE DAILY AI INFERENCE OWNER / CURRENT PRE-VOICELAB TTS |
| Trained Voice Actor daily TTS inference | existing canonical Python local worker; GPT-SoVITS V2ProPlus must replace current TTS stage in this owner | APPROVED TARGET / NOT IMPLEMENTED / NO SECOND DAILY WORKER |
| VoiceLab training execution | GPT-SoVITS V2ProPlus build operation invoked by VoiceLab outside active Meeting | APPROVED TARGET / NOT IMPLEMENTED / A2 LIFECYCLE CONTRACT ONLY |
| Installed worker interpreter path | `engine/paths.rs`, `commands/bridge_paths.rs` | SOURCE ALIGNED: `LocalWorker/PythonRuntime/python.exe` / ONE-RUNTIME COMPATIBILITY PREFERRED |
| Worker dependency graph | `EngineData/Backend/LocalWorker/WorkerRuntime/pyproject.toml` + `uv.lock` | ACTIVE / A1 SINGLE-RUNTIME CORE COMPATIBILITY PASSED / GPT-SOVITS DEPS NOT YET COMMITTED |
| Voice runtime assets | `EngineData/Backend/RuntimeAssets/Voice/` | ACTIVE CURRENT PIPER SLOT / TARGET GPT-SOVITS ASSET OWNERSHIP NOT YET IMPLEMENTED |
| Full-product-release asset presence inventory | `runtime_inventory.rs` + `WorkerRuntime/model_manifest.json` | ACTIVE / FRESH EXPLICIT VERIFY / DOES NOT GATE MEETING START |
| Text translation | `text_translate.rs` -> helper -> worker | ACTIVE / TYPED RESULT: TRANSLATED TEXT + USER MESSAGE + BLOCKER |
| Persisted settings | `engine/settings.rs`, `engine/runtime_settings.rs`, `commands/settings.rs` | ACTIVE / SCHEMA V6 / DO NOT REVIVE OLD VOICE PROFILE SETTINGS WITHOUT NEED |
| Source validation | small validators under `scripts/` | ACTIVE / SVELTE + PR-166 + RUNTIME-EFFICIENCY CONTRACT AWARE |
| Local frontend proof | dependency install + Svelte autofixer + `svelte-check` + Vite build/render | DEFERRED BY USER / REQUIRED BEFORE RELEASE |
| Target runtime proof | real GPT-SoVITS training/inference + Windows model/audio/device/package checks | DEFERRED UNTIL VOICELAB SOURCE CLOSES / REQUIRED BEFORE RELEASE |

## VoiceLab Ownership Boundary

VoiceLab now has an **active bounded A2 backend contract**, but it is not yet an end-user feature. `commands/voice_lab.rs` owns only the Voice Actor data/lifecycle boundary needed by the approved guided-flow direction. It is deliberately not registered as a Tauri command surface yet because there is no recording/training executor for the UI to truthfully invoke.

The ownership graph is:

```text
future VoiceLab.svelte
-> existing runtimeApi.ts
-> bounded Rust VoiceLab lifecycle/data owner
-> future approved GPT-SoVITS V2ProPlus build operation
-> UserData/CacheData/VoiceLab build workspace
-> user review / approval
-> validated promotion to UserData/SavedProject/VoiceLab/MyVoice

Meeting
-> existing Meeting authority
-> existing helper/scheduler
-> existing canonical Python worker
-> future trained GPT-SoVITS V2ProPlus My Voice inference
-> existing Rust/CPAL Meeting output
```

This graph explicitly excludes:

```text
no second daily TTS worker
no OpenVoice sidecar
no Piper/SAPI fallback after migration
no Qwen quick-clone path
no provider registry
no generic model manager
no VoiceLab database
no second settings store
no background training scheduler
no simultaneous VoiceLab training + Meeting
no generic imported-audio branch
no generic audio-conversion framework
```

A1 proved that the V2ProPlus model core can coexist with the current one-private-`PythonRuntime` package identities on hosted Windows with only a bounded candidate dependency set. That proof did not authorize copying the whole upstream dependency graph, and A2 intentionally adds no Python dependency or model package.

## Voice Actor Data Ownership

VoiceLab persistent semantics are intentionally narrower than general Saved/History:

```text
UserData/CacheData/VoiceLab/
├─ Takes/
│  └─ take_<line-id>.wav
├─ Build/
│  └─ Dataset/
│     ├─ exact accepted WAV copies
│     └─ dataset.json
└─ Candidate/
   ├─ actor.json
   ├─ gpt.ckpt
   ├─ sovits.pth
   └─ reference.wav

UserData/SavedProject/VoiceLab/
└─ MyVoice/
   ├─ actor.json
   ├─ gpt.ckpt
   ├─ sovits.pth
   └─ reference.wav
```

A2 deliberately does **not** create a user-configurable profile root, profile database, model registry, or multiple-actor selector. The first product still has one approved `MyVoice` actor.

The first guided-capture build input contract is deliberately narrow:

```text
RIFF/WAVE
PCM integer format
mono
32,000 Hz
16-bit
non-empty
```

A2 validates that format and freezes only explicitly listed accepted take filenames. It does not add `torchaudio`, `librosa`, FFmpeg wrappers, a generic resampler, or imported-audio transcoding. A3 recording/audio ownership must produce this canonical guided WAV format from the app's own capture flow. This is an internal build contract, not a claim that arbitrary external audio is supported.

The dataset manifest owns:

```text
schema version
authorized-voice confirmation
exact known English text per accepted take
canonical take filename
held-out evaluation lines kept separate from training IDs/text
```

No ASR model is added for dataset labeling. No arbitrary recording-count, training-duration, epoch-count, similarity-score, silence-ratio, or clipping threshold is promoted as product truth by A2. Signal-quality checks that require actual captured audio remain a later guided-capture/training concern and must be evidence-driven.

The native first Voice Actor package contract is intentionally only:

```text
actor.json
+ gpt.ckpt
+ sovits.pth
+ canonical English reference.wav
+ exact reference text
```

The reference WAV must satisfy the approved 3–10 second product contract. Candidate promotion requires the native weights/reference contract plus a completed held-out-evaluation marker. **Calling promotion is the explicit approval boundary**; training completion alone never promotes the actor.

Promotion stages the exact four actor files, validates the staged package, preserves the previous `MyVoice` until replacement is ready, and has rollback/recovery handling for interrupted replacement. A rejected/invalid rebuild candidate must not replace the current approved actor.

The old historical `AudioStudio` take concepts may be reused only where they map directly to the approved guided flow (`guided_reading`, `accepted`, `needs_retry`). Do not restore its provider parity, professional/broadcast tiers, import branch, performance-control surface, or broad project metadata framework.

## VoiceLab Build Lifecycle

`commands/voice_lab.rs` owns one in-process generation-bound A2 lifecycle:

```text
idle
-> preparing
-> training
-> evaluating
-> terminal finish

active phase
-> cancelling
-> terminal finish

stage failure
-> terminal fail
```

Only one build may be active. A stale generation cannot mutate a newer build. A cancellation request changes the lifecycle to `cancelling`; it does **not** claim that a real Python training process has been terminated because the training executor does not exist yet. Actual child-process cancellation/join semantics belong to the later training implementation.

The A2 lifecycle is intentionally transient rather than persisted. Persisting speculative half-built job state before there is a real training child/resume contract would add complexity without a current recovery requirement.

Mutual exclusion is already wired at the public Meeting Start boundary: `commands/runtime.rs::start_meeting_translation()` returns `voice_lab_build_active` before virtual-route preparation when an A2 build is active. Starting a VoiceLab build also fails closed when the canonical application Meeting owner is active. This prevents a future caller from silently running the two authorities concurrently without inventing a GPU-arbitration framework.

## Frontend Ownership

The active frontend path is currently singular:

```text
index.html
-> src/main.ts
-> mount(App.svelte)
-> FirstSetup / Meeting / Text / Settings
```

The target adds `VoiceLab` to that same path after its backend recording/build actions are truthfully invokable. A2 intentionally does not create the page, router, placeholder status, or empty command bridge just because the backend data contract now exists.

Runtime ownership stays separate:

```text
Svelte UI
-> runtimeProductFacade.ts / runtimeApi.ts as appropriate
-> Tauri commands
-> Rust / Python runtime owners
```

Svelte owns page/dialog/input/presentation state. It does not become a second authority for Meeting lifecycle, VoiceLab build process truth, persisted settings, models, audio capability, or worker truth.

Normal application settings have one active frontend projection through `ProductRuntimeSnapshot.settings`. `setupSettings` is only the bootstrap/First Setup holder before the normal snapshot exists.

## Runtime-Efficiency And Consistency Boundary

The frontend/backend boundary keeps these source-level rules:

```text
settings transport failure
-> explicit unavailable
-> never fabricate default settings / First Setup

Meeting status
-> canonical Meeting preflight owns Meeting readiness
-> App recomputes Meeting-facing product readiness with each current status

Live Meeting poll
-> lightweight Meeting status polling remains bounded
-> committed transcript snapshot is fetched only when Meeting status revision signals change

Start / Stop
-> consume authoritative status already returned by the Rust Meeting command
-> no immediate full product refetch solely to rediscover that result

audio-device change
-> one Rust transaction: load current -> probe candidate -> preserve or save -> return canonical settings
-> frontend does not own probe/save rollback semantics

Text translation
-> Rust returns translated text, normal-user message, and diagnostic blocker separately
-> normal Text UI does not display worker/model/device blocker detail

VoiceLab build
-> future long-running explicit job outside Meeting
-> one canonical generation-bound build state already exists in A2
-> UI may observe it only after real build commands exist
-> no polling that reruns training/model preparation
-> training success alone is not actor approval
```

This is deliberately not a new frontend state framework, event bus, global store, model registry, or parallel readiness owner.

## Familiar Translation Interaction Ownership

PR-166 owns the product-level rule. Current source implements it through Meeting/Text/Settings/First Setup. VoiceLab must align with the same visual/product principles when added:

```text
VoiceLab
-> My Voice
-> one Create/Rebuild flow
-> guided line
-> Record / Replay / Retry / Accept
-> Training
-> Preview
-> Approve
```

Healthy/Ready rows may omit a redundant badge. Technical GPT-SoVITS names, submodels, checkpoints, epochs, sampling internals, and dependency information belong only in bounded diagnostics when useful, not normal VoiceLab UI.

## Product-State Mapping

`runtimeProductFacade.ts` remains the single frontend product-state mapper for normal product snapshots. VoiceLab may add a focused build-state contract rather than forcing hour-long training state through the recurring Meeting snapshot.

Current visible vocabulary includes:

```text
Checking
Ready
Live
Starting
Stopping
Setup Needed
Unavailable
In Use
```

Approved VoiceLab user-facing states may add bounded concepts such as `Recording`, `Training`, `Needs Review`, and `Ready`; do not expose engine/process internals as product states.

`App.svelte` safe close remains Meeting-safe-close owned. VoiceLab real training close/cancel behavior must extend the bounded build lifecycle rather than reusing Meeting Stop blindly.

## Visual System Ownership

Approved implementation remains intentionally small:

```text
Svelte 5 + TypeScript + Vite
Tailwind CSS 4
semantic CSS custom properties
selective Bits UI
@lucide/svelte icons
```

`tokens.css` owns durable surfaces, text, actions, state colors, shape/elevation, and desktop composition. `app.css` owns Tailwind loading, focus/reduced-motion rules, page composition, and the bounded shared panel/button/field/pill vocabulary.

The UI deliberately favors whitespace, typography, and alignment over nested cards and repeated badges. VoiceLab must not become an AI-styled dashboard with gradients, glow, model cards, progress theater, arbitrary percentages, or decorative training graphs.

## Backend / Release Ownership

Rust/Python ownership stays singular for normal inference. The one private packaged interpreter remains:

```text
<runtime root>/EngineData/Backend/LocalWorker/PythonRuntime/python.exe
```

Packaged execution fails closed when that interpreter is missing; repository Python alternatives remain development-only.

Dependency and asset ownership is intentionally split:

```text
WorkerRuntime pyproject.toml + committed uv.lock
-> canonical resolved Python dependency graph
-> A1 proved a bounded V2ProPlus core compatibility direction
-> A2 does not mutate this lock
-> permanent VoiceLab dependencies enter only when the actual training/inference adapter consumes them

Worker status / functional preflight
-> current Meeting-required AI runtime capability
-> later includes trained Voice Actor TTS readiness

model_manifest.json + runtime_inventory.rs
-> full-product-release asset presence only
-> never substitutes for functional Meeting Start readiness
```

## Proof Boundary

Remote Windows proof run `31699857917` covers the A2 Rust contract only after materializing the canonical frontend dist needed by Tauri compile-time context.

It proved:

```text
frontend production dist prerequisite -> PASS
cargo check -> PASS
cargo test --no-run -> PASS
five bounded commands::voice_lab::tests -> PASS
public Meeting Start VoiceLab exclusion source guard -> PASS
VoiceLab Tauri command registration absent -> PASS
```

The five bounded A2 tests cover authorization/held-out dataset separation, generation-bound cancellation semantics, canonical guided-WAV dataset freeze, native actor-package/evaluation validation, and preservation of the current actor when a rebuild candidate is rejected.

A2 intentionally leaves its future caller-facing functions unregistered until A3/A4 consume them. Rust therefore reports staged `dead_code` warnings for those not-yet-reachable internal APIs. Do not silence those warnings with fake Tauri commands, placeholder callers, or blanket lint suppression merely to make the warning count look clean; A3/A4 should consume or delete each staged API as the real workflow is wired.

Current VoiceLab proof order is now:

```text
1. canonical scope/ownership alignment -> CLOSED
2. exact single-runtime dependency compatibility proof -> CLOSED (A1)
3. Voice Actor/build lifecycle source contract -> CLOSED (A2)
4. guided recording + accepted-take persistence implementation -> NEXT (A3)
5. GPT-SoVITS training/evaluation implementation
6. canonical-worker daily inference integration
7. Meeting atomic-readiness integration
8. source closure audit
9. target-Windows quality/latency/device acceptance
```

Speaker fidelity, actual training duration, cancellation of a real training process, CUDA/VRAM behavior, native custom-TTS latency, and meeting-app reception remain live/model/device claims and must not be inferred from the A2 source proof.