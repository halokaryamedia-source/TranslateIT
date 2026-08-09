# TranslateIT — Source Ownership And Reconciliation Map

**Status:** current source map  
**Updated:** 2026-08-10  
**Branch:** `New`

This file maps product responsibilities to the source that currently owns or
competes for them. It is not a backlog, task log, plan, or runtime-readiness report.
`docs/knowledge/next-action.md` owns the active consolidation plan.

Status vocabulary:

```text
ALIGNED   -> one current owner substantially matches approved behavior
PARTIAL   -> useful owner exists but required behavior is incomplete
CONFLICT  -> more than one active/current path competes for the same responsibility
MISSING   -> approved capability has no complete current owner
STALE     -> source still expresses superseded behavior
RETIRED   -> inherited concept is no longer approved product scope
```

Static source alignment never becomes model, latency, Windows-device, audio,
rendered-UI, installed-runtime, or release proof.

## Executive Ownership Map

| Boundary | Current owner(s) | Status | Current truth |
|---|---|---|---|
| Product shell/navigation | `src/main.ts`, `FirstSetupBootstrap.ts`, `SimpleLauncherController.ts`, active shell | **ALIGNED / VISUAL PARTIAL** | Normal app is Meeting / Text / History / Settings; rendered quality is local proof later. |
| First Setup | `FirstSetupBootstrap.ts`, `RuntimeSettings`, `runtimeProductFacade.ts`, audio commands | **ALIGNED SOURCE / WINDOWS PROOF LATER** | Five-step flow, defer/resume facts, and safe candidate-check -> commit device selection exist. |
| Settings | `launcherSettingsRenderer.ts`, `SimpleLauncherController.ts`, `RuntimeSettings`, History/audio owners | **ALIGNED HIERARCHY / PARTIAL MEETING RUNTIME** | Meeting / History & Privacy / Advanced -> Diagnostics is the normal hierarchy. |
| Text UI | `SimpleLauncherController.ts`, `runtimeProductFacade.ts` | **ALIGNED UI / ENGINE CONFLICT BELOW** | Familiar source/target workspace and Recent write exist; AI execution underneath is not yet canonical. |
| History / Saved | `engine/history_store.rs`, `commands/history.rs`, frontend History owners | **TEXT ALIGNED / MEETING PARTIAL** | Canonical store is `UserData/SavedProject/History/{Recent,Saved}`. |
| Meeting application session | `engine/runtime_state.rs`, `commands/meeting_session.rs` | **ALIGNED AUTHORITY / DOWNSTREAM AI PARTIAL** | `session_id + generation + authority_active` is the canonical Meeting authority. |
| Local AI / Translate Engine | helper bridge + multiple Python/Rust translation/capture/fallback paths | **CONFLICT** | Audit proves there is not yet one canonical execution engine. Do not call this optimized or production-ready. |
| AI capability/readiness truth | worker status, model inventory/manifests, legacy gates, product mapper, Meeting preflight | **CONFLICT** | Static/model-presence/dev-gate evidence overlaps current runtime truth. Consolidation required. |
| Meeting outbound route | `virtual_audio_route_runtime.rs`, virtual-route selection/provider | **PARTIAL / WINDOWS PROOF REQUIRED** | Generation-aware cancellation contract exists; real meeting delivery is unproved. |
| Incoming Meeting assistance | audio/capture/runtime candidates | **MISSING / PARTIAL** | Meeting Sound preference exists; loopback -> EN ASR -> ID text and self-output suppression do not. |
| Translation tone/context | settings + inherited adapters | **MISSING / PARTIAL** | Approved tone and bounded committed Meeting context do not yet reach canonical inference. |
| Document Translation | no active workspace | **RETIRED** | Do not revive Documents or file-attachment translation. |
| Audio Studio | explicit entry + backend contracts | **PARTIAL / POST-CORE** | Preserve as post-core; it is not a current core blocker. |
| Packaging/runtime assets | Tauri/NSIS direction + path/assets owners | **PARTIAL / STALE ASSUMPTIONS** | Repo-root/system-Python assumptions remain; clean installed proof is later. |

## Product Shell, Setup, Settings, Text, History

### Product shell

```text
index.html
└─ src/main.ts
   -> startDesktopWithFirstSetup
      ├─ new      -> focused First Setup shell
      └─ deferred/completed -> SimpleLauncherController
                               -> Meeting / Text / History / Settings
```

`src/audioStudioEntry.ts` remains the explicit post-core Audio Studio entry.
Documents and top-level Saved are not active navigation.

### First Setup / Meeting devices

Current device preference authority remains:

```text
RuntimeSettings.audio.input_device_id
RuntimeSettings.audio.output_device_id
```

First Setup and Meeting Settings use the same candidate-check -> save path. Explicit
missing devices do not silently switch to Windows Default. Endpoint/config checks do
not prove real signal, loopback, capture permission, or long-session stability.

### Text

The active frontend path remains:

```text
SimpleLauncherController
-> runtimeProductFacade
-> runtimeApi.translateText
-> Rust `translate_text`
```

The frontend is aligned, but `translate_text` currently has competing downstream
execution/fallback behavior. Therefore the source map no longer labels the AI path
behind Text as canonical until engine consolidation is implemented.

### History / Saved

Canonical product persistence:

```text
src-tauri/src/engine/history_store.rs
src-tauri/src/commands/history.rs

UserData/SavedProject/History/
├─ Recent/
└─ Saved/
```

`engine/session_chat.rs` and `engine/session_store.rs / SavedTranscript` are not
canonical product History.

## Canonical Meeting Authority That Survives Consolidation

Keep the application/session authority already established in:

```text
src-tauri/src/engine/runtime_state.rs
src-tauri/src/commands/meeting_session.rs
```

Product lifecycle commands:

```text
get_meeting_session_status
start_meeting_translation
stop_meeting_translation
```

The session snapshot owns:

```text
session_id
generation
authority_active
phase
```

Generation checks already guard the current finalized-segment stage boundary and
Meeting route. This authority is not the engine conflict; competing AI execution and
readiness paths underneath/alongside it are.

`Start Translation` remains fail-closed while a safe continuous runtime is not
connected. Rolling `ready_for_target_asr_frame` remains **not final speech**.

## Local AI / Translate Engine — Current Ownership Conflict

The following current paths overlap or compete and therefore require consolidation.
The disposition itself is owned by `next-action.md`; this table records the current
source responsibility/conflict only.

| Current path / owner | Current behavior | Ownership state |
|---|---|---|
| `commands/helper_bridge.rs` + `helper_bridge_runtime.rs` | Persistent Python process, JSON request/response, preload/status/task bridge | **KEEP-CANDIDATE / INTERNALS PARTIAL** |
| `bridge_paths.rs` | Prefers `realtime_local_worker_entry.py`, then base worker; can search several Python runtimes | **STALE / PACKAGING + ENTRYPOINT CONFLICT** |
| `realtime_local_worker.py` | Real `status / transcribe / translate / synthesize` implementation and model caches | **KEEP-CANDIDATE** |
| `realtime_local_worker_entry.py` | Wraps base worker and registers migration/dev handoff handlers | **CONFLICT / MIGRATION SCAFFOLD** |
| `realtime_local_worker_accelerated.py` | Separate accelerated/CT2 translation execution candidate | **CONFLICT / PARALLEL WORKER** |
| `commands/text_translate.rs` | Uses running helper, otherwise falls back to engine translation | **CONFLICT / MULTI-PATH** |
| `engine/manual_translation_accelerated.rs` | Spawns one-shot worker; can fall back again | **CONFLICT / ONE-SHOT ENGINE** |
| `engine/manual_translation.rs` + `adapters/translation_logic.rs` | Additional worker path plus deterministic/preview non-model translation | **CONFLICT / FAKE-SUCCESS RISK** |
| `engine/capture_lifecycle.rs` | Legacy capture -> one-shot ASR -> Translate -> TTS pipeline and mode fallback | **CONFLICT / LEGACY VOICE ENGINE** |
| `commands/runtime_capture.rs` migration/helper handoffs | Capture/asr migration previews/stubs plus fallback into legacy capture | **CONFLICT / MIGRATION SCAFFOLD** |
| `commands/meeting_session.rs` finalized AI stages | Uses canonical task names with generation checks after each stage | **KEEP-CANDIDATE / WAITS FOR ENGINE CONSOLIDATION** |

No new AI worker/service may be added while these overlaps exist.

## AI Readiness / Model Truth — Current Conflict

Current readiness inputs are not equivalent and must not be merged into one `Ready`
label without preserving what each actually proves.

| Current owner/input | What it really proves today | State |
|---|---|---|
| `WorkerRuntime/model_manifest.json` | Declarative expected model inventory | **KEEP-CANDIDATE / NEEDS REPRODUCIBLE METADATA** |
| `commands/runtime_inventory.rs` | Mostly model path/file presence and native candidate visibility | **PARTIAL / STATIC INSTALL EVIDENCE** |
| `RuntimeContracts/MODEL_RUNTIME_MANIFEST.json` | Previous machine/runtime snapshot stored in source tree | **STALE AS CURRENT READINESS** |
| `realtime_stack_manifest.json` | Declared profiles/latency/model intentions | **STALE AS EXECUTION PROOF** |
| worker `status` | Current process imports/assets/provider availability plus loaded-cache flags | **KEEP-CANDIDATE / SEMANTICS NEED SPLIT** |
| helper `provider_ready` | Currently mixes process/capability/request outcomes | **CONFLICT / TOO COARSE** |
| legacy internal/live/professional/migration gates | Planning/migration/source readiness | **STALE AS PRODUCT READINESS** |
| `runtimeProductFacade.ts` | Product presentation mapper | **KEEP / INPUTS MUST BE REPLACED** |
| `MeetingSessionPreflight` | Transactional Meeting Start gate | **KEEP / MUST CONSUME CANONICAL CAPABILITIES** |

Required future distinction:

```text
Installed
!= Loaded
!= Inference verified
!= Product capability Ready
!= Meeting Start safe
```

## Audio Boundary

Physical microphone capture, VAD/finalized utterance production, Windows devices,
Meeting Sound capture, and Meeting Microphone delivery remain owned by the Windows
audio boundary. AI consolidation must not absorb these responsibilities.

The generation-aware Meeting route remains useful source and is retained. Actual
Windows delivery stays `LOCAL PROOF REQUIRED`.

## Retired / Non-Canonical Product Concepts

```text
Documents workspace / file-attachment translation
top-level Saved
General / Translation / Audio as normal Settings destinations
session_chat.rs as product History
session_store.rs / SavedTranscript as product History
rule-based/preview translation as successful product inference
dev seed/smoke/handoff success as product inference proof
stale source/runtime manifest state as current Ready
rolling ASR-ready audio treated as finalized speech
```

## Current Mode / Continuation

Current project mode is **Plan**, execution channel `ChatGPT -> GitHub`.

Further Meeting feature expansion, including the finalized outbound utterance
producer, is deferred until the Engine Consolidation Plan is approved and the active
AI execution/readiness ownership is unambiguous.

The single current continuation is `docs/knowledge/next-action.md`.