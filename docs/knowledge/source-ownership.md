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
| VoiceLab UI | future `src/pages/VoiceLab.svelte` under existing Svelte app | APPROVED / NOT IMPLEMENTED / DO NOT CREATE BEFORE COMPATIBILITY GATE |
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
| VoiceLab build lifecycle | future bounded `commands/voice_lab.rs` if compatibility gate confirms one Rust command owner is needed | APPROVED RESPONSIBILITY / NOT IMPLEMENTED / NOT A GENERIC SERVICE FRAMEWORK |
| VoiceLab recording capture | existing Rust/CPAL audio ownership extended only where guided recording requires it | APPROVED RESPONSIBILITY / NOT IMPLEMENTED / NO SECOND AUDIO ENGINE |
| Voice Actor temporary build data | `UserData/CacheData/VoiceLab` through existing path semantics | APPROVED OWNER / NOT IMPLEMENTED |
| Approved persistent Voice Actor | `UserData/SavedProject/VoiceLab` through existing path semantics | APPROVED OWNER / NOT IMPLEMENTED / ATOMIC REBUILD PROMOTION REQUIRED |
| Meeting authority | `commands/meeting_session.rs`, `engine/runtime_state.rs` | ACTIVE / ATOMIC START: MIC + OUTPUT CALLBACK PROBE + OUTBOUND CONSUMER BEFORE LIVE |
| Physical microphone + Meeting Sound | `engine/audio/*` | ACTIVE |
| Audio-device selection transaction | `commands/settings.rs` + `commands/audio.rs` + `engine/audio/input.rs` | ACTIVE / FUNCTIONAL MIC PROBE + PRESERVE + SAVE OWNER |
| Mic Test lifecycle | `engine/capture_lifecycle.rs`, `commands/runtime_capture.rs` | ACTIVE / BOUNDED |
| Meeting Microphone route | `commands/virtual_mic_route.rs`, `engine/audio/meeting_output.rs` | ACTIVE / MATCHED ROUTE + PRE-LIVE SILENT CALLBACK PROBE + RUST/CPAL DELIVERY |
| Outbound latency instrumentation | `engine/audio/finalized_utterance.rs`, `commands/meeting_session.rs`, `engine/audio/meeting_output.rs` | ACTIVE / PR-052 TRANSIENT STAGE TIMING + CPAL PREDICTED FIRST PLAYBACK |
| Local worker/scheduler | `helper_bridge.rs`, `helper_bridge_runtime.rs`, `realtime_local_worker.py` | ACTIVE / ONE DAILY AI INFERENCE OWNER / CURRENT PRE-VOICELAB TTS |
| Trained Voice Actor daily TTS inference | existing canonical Python local worker; GPT-SoVITS V2ProPlus must replace current TTS stage in this owner | APPROVED TARGET / NOT IMPLEMENTED / NO SECOND DAILY WORKER |
| VoiceLab training execution | GPT-SoVITS V2ProPlus build operation invoked by VoiceLab outside active Meeting | APPROVED TARGET / NOT IMPLEMENTED / MUTUALLY EXCLUSIVE WITH MEETING |
| Installed worker interpreter path | `engine/paths.rs`, `commands/bridge_paths.rs` | SOURCE ALIGNED: `LocalWorker/PythonRuntime/python.exe` / ONE-RUNTIME COMPATIBILITY PREFERRED |
| Worker dependency graph | `EngineData/Backend/LocalWorker/WorkerRuntime/pyproject.toml` + `uv.lock` | ACTIVE / GPT-SOVITS NOT YET ADOPTED / COMPATIBILITY GATE REQUIRED |
| Voice runtime assets | `EngineData/Backend/RuntimeAssets/Voice/` | ACTIVE CURRENT PIPER SLOT / TARGET GPT-SOVITS ASSET OWNERSHIP NOT YET IMPLEMENTED |
| Full-product-release asset presence inventory | `runtime_inventory.rs` + `WorkerRuntime/model_manifest.json` | ACTIVE / FRESH EXPLICIT VERIFY / DOES NOT GATE MEETING START |
| Text translation | `text_translate.rs` -> helper -> worker | ACTIVE / TYPED RESULT: TRANSLATED TEXT + USER MESSAGE + BLOCKER |
| Persisted settings | `engine/settings.rs`, `engine/runtime_settings.rs`, `commands/settings.rs` | ACTIVE / SCHEMA V6 / DO NOT REVIVE OLD VOICE PROFILE SETTINGS WITHOUT NEED |
| Source validation | small validators under `scripts/` | ACTIVE / SVELTE + PR-166 + RUNTIME-EFFICIENCY CONTRACT AWARE |
| Local frontend proof | dependency install + Svelte autofixer + `svelte-check` + Vite build/render | DEFERRED BY USER / REQUIRED BEFORE RELEASE |
| Target runtime proof | real GPT-SoVITS training/inference + Windows model/audio/device/package checks | DEFERRED UNTIL VOICELAB SOURCE CLOSES / REQUIRED BEFORE RELEASE |

## VoiceLab Ownership Boundary

VoiceLab is an approved product capability but has **no active product source yet**. The current task is deliberately architecture/dependency-first so the repository does not accumulate empty pages, placeholder commands, fake readiness, model registries, or unused profile abstractions before the engine boundary is known.

The intended ownership graph is:

```text
VoiceLab.svelte
-> existing runtimeApi.ts
-> one bounded Rust VoiceLab command/lifecycle owner
-> approved GPT-SoVITS V2ProPlus build operation
-> UserData/CacheData/VoiceLab build workspace
-> user review / approval
-> atomic promotion to UserData/SavedProject/VoiceLab/My Voice

Meeting
-> existing Meeting authority
-> existing helper/scheduler
-> existing canonical Python worker
-> trained GPT-SoVITS V2ProPlus My Voice inference
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
```

The current one-private-`PythonRuntime` architecture remains the preferred integration boundary. Do not create a second packaged Python environment merely because upstream GPT-SoVITS ships a large requirements file. First isolate the exact English inference + training dependency set and prove whether it can coexist with the canonical WorkerRuntime lock.

## Voice Actor Data Ownership

VoiceLab persistent semantics are intentionally narrower than general Saved/History:

```text
UserData/CacheData/VoiceLab/
-> temporary guided takes
-> exact-text dataset preparation
-> training checkpoints
-> generated held-out evaluations
-> temporary build evidence

UserData/SavedProject/VoiceLab/
-> explicitly approved Voice Actor only
```

A training/build process exiting successfully does not automatically make its output persistent or `Ready`. Promotion requires successful evaluation plus explicit user approval. A rebuild keeps the currently approved actor until the new candidate is approved.

The old historical `AudioStudio` take concepts may be reused only where they map directly to the approved guided flow (`guided_reading`, `accepted`, `needs_retry`). Do not restore its provider parity, professional/broadcast tiers, import branch, performance-control surface, or broad project metadata framework.

## Frontend Ownership

The active frontend path is currently singular:

```text
index.html
-> src/main.ts
-> mount(App.svelte)
-> FirstSetup / Meeting / Text / Settings
```

The target adds `VoiceLab` to that same path after its backend contract is grounded. It does not justify a frontend router, second mount, dashboard shell, or new state framework.

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
-> long-running explicit job outside Meeting
-> UI observes one canonical build state
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

`App.svelte` safe close remains Meeting-safe-close owned. VoiceLab training close/cancel behavior must be designed inside the future bounded build lifecycle rather than reusing Meeting Stop blindly.

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
-> VoiceLab dependencies enter only after compatibility proof

Worker status / functional preflight
-> current Meeting-required AI runtime capability
-> later includes trained Voice Actor TTS readiness

model_manifest.json + runtime_inventory.rs
-> full-product-release asset presence only
-> never substitutes for functional Meeting Start readiness
```

## Proof Boundary

Existing remote Windows proof covers the pre-VoiceLab frontend/build/runtime baseline only. It does not substitute for VoiceLab evidence.

Current VoiceLab proof order is:

```text
1. canonical scope/ownership alignment
2. exact single-runtime dependency compatibility proof
3. Voice Actor/build lifecycle source contract
4. guided recording + persistence implementation
5. GPT-SoVITS training/evaluation implementation
6. canonical-worker daily inference integration
7. Meeting atomic-readiness integration
8. source closure audit
9. target-Windows quality/latency/device acceptance
```

Speaker fidelity, actual training duration, CUDA/VRAM behavior, native custom-TTS latency, and meeting-app reception remain live/model/device claims and must not be inferred from source or upstream benchmark text.
