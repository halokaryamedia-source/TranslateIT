# TranslateIT — Source Ownership And Reconciliation Map

**Status:** current source map  
**Updated:** 2026-08-10  
**Branch:** `New`

This file maps approved product responsibilities to current semantic/source owners.
It is not a backlog, task log, runtime-readiness report, or substitute for
`docs/knowledge/next-action.md`.

Status vocabulary:

```text
ALIGNED   -> one current owner substantially matches approved behavior
PARTIAL   -> useful owner exists but required behavior is incomplete
CONFLICT  -> multiple current paths still compete for the same responsibility
MISSING   -> approved capability has no complete current owner
STALE     -> source still expresses superseded behavior
RETIRED   -> inherited concept is no longer approved product scope
```

Static source alignment never becomes model, latency, Windows-device, audio,
rendered-UI, installed-runtime, or release proof.

## Executive Ownership Map

| Boundary | Current owner(s) | Status | Current truth |
|---|---|---|---|
| Product shell/navigation | `src/main.ts`, `FirstSetupBootstrap.ts`, `SimpleLauncherController.ts`, active shell | **ALIGNED / VISUAL PARTIAL** | Normal app is Meeting / Text / History / Settings. |
| First Setup / Meeting devices | `FirstSetupBootstrap.ts`, `RuntimeSettings`, `runtimeProductFacade.ts`, audio commands | **SOURCE ALIGNED / WINDOWS PROOF LATER** | Five-step flow, defer/resume facts, and candidate-check -> commit device selection exist. |
| Settings | `launcherSettingsRenderer.ts`, `SimpleLauncherController.ts`, Settings/History/audio owners | **ALIGNED HIERARCHY / PARTIAL MEETING RUNTIME** | Meeting / History & Privacy / Advanced -> Diagnostics is canonical. |
| Text UI | `SimpleLauncherController.ts`, `runtimeProductFacade.ts`, `runtimeApi.ts` | **ALIGNED UI** | Familiar source/target translator and Recent write exist. |
| Text AI execution | `commands/text_translate.rs` -> `helper_bridge.rs` -> `realtime_local_worker.py` | **SOURCE ALIGNED / LOCAL PROOF LATER** | One persistent-worker path; no manual/rule-based/alternate-worker product fallback. |
| History / Saved | `engine/history_store.rs`, `commands/history.rs`, frontend History owners | **TEXT ALIGNED / MEETING PARTIAL** | Canonical store is `UserData/SavedProject/History/{Recent,Saved}`. |
| Meeting application session | `engine/runtime_state.rs`, `commands/meeting_session.rs` | **ALIGNED AUTHORITY / DOWNSTREAM AI PARTIAL** | `session_id + generation + authority_active` remains canonical Meeting authority. |
| Local AI worker process | `commands/helper_bridge.rs`, `helper_bridge_runtime.rs`, `bridge_paths.rs`, `realtime_local_worker.py` | **ONE ENTRY / SCHEDULER + READINESS PARTIAL** | Persistent helper launches the base worker directly; scheduling/cancellation truth remains later. |
| Legacy capture | `engine/capture_lifecycle.rs`, `commands/runtime_capture.rs` | **CAPTURE-ONLY ALIGNED / DIAGNOSTIC STUBS REMAIN** | Normal capture no longer starts ASR/Translate/TTS one-shot work or dispatches helper migration stubs. |
| AI capability/readiness truth | worker status, model inventory/manifests, legacy gates, product mapper, Meeting preflight | **CONFLICT** | This is the active Slice 2 boundary. |
| Meeting outbound route | `virtual_audio_route_runtime.rs` + route provider | **PARTIAL / WINDOWS PROOF REQUIRED** | Generation-aware cancellation contract exists; real meeting delivery is unproved. |
| Incoming Meeting assistance | audio/capture/runtime candidates | **MISSING / PARTIAL** | Meeting Sound preference exists; loopback -> EN ASR -> ID text and self-output suppression do not. |
| Translation tone/context | settings + inherited adapters | **MISSING / PARTIAL** | Approved tone/context do not yet reach canonical inference. |
| Document Translation | no active workspace | **RETIRED** | Do not revive Documents/file-attachment translation. |
| Audio Studio | explicit entry + backend contracts | **PARTIAL / POST-CORE** | Preserve as post-core; not a current core blocker. |
| Packaging/runtime assets | Tauri/NSIS direction + path/assets owners | **PARTIAL / STALE ASSUMPTIONS** | Repo-root/system-Python assumptions remain for later packaging reconciliation. |

## Engine Consolidation Slice 1 — Current Source Truth

Canonical standalone Text execution is:

```text
Text UI
-> runtimeProductFacade
-> runtimeApi.translateText
-> commands/text_translate.rs
-> persistent helper bridge
-> realtime_local_worker.py `translate`
-> one result
```

Current source facts:

- `bridge_paths.rs` resolves the helper process directly to
  `realtime_local_worker.py`;
- `realtime_local_worker_entry.py` is removed;
- `realtime_local_worker_accelerated.py` is removed as a standalone worker;
- `engine/manual_translation.rs` and `manual_translation_accelerated.rs` are removed;
- their engine module registrations are removed;
- `commands/text_translate.rs` starts/uses the persistent helper and returns blocked
  state on helper/model/direction/response failure rather than invoking another
  translation engine;
- canonical Text translation does not retry another translation mode;
- `adapters/translation_logic.rs` no longer contains deterministic phrase/dictionary
  or preview word translation. It can only report passthrough, blocked/pending, or
  planned non-execution state; it cannot manufacture `Completed` model output;
- the reachable translation-flow source validator now checks the persistent-helper
  ownership contract rather than requiring retired manual/migration paths.

Classification: **SOURCE ALIGNED / LOCAL PROOF REQUIRED** for actual helper startup,
model inference, output quality, and latency.

## Legacy Capture After Slice 1

`engine/capture_lifecycle.rs` now owns microphone capture lifecycle only. On Stop it
may create a temporary diagnostic WAV from the existing capture buffer, but it:

```text
does NOT spawn Python
does NOT run ASR
does NOT run translation
does NOT run TTS
does NOT play translated audio
does NOT switch Realtime <-> Quality
```

The temporary segment is removed from the cache after the capture stop path has
recorded its bounded diagnostic note. Stale legacy `latest_audio_pipeline_evidence`
is also removed instead of leaving an old one-shot AI result that could be mistaken
for current proof.

`commands/runtime_capture.rs` keeps inherited capture/helper/asr handoff commands only
as Developer Diagnostics/migration surfaces for now. Normal `start_capture` and
`stop_capture` no longer dispatch those migration stubs or cancel the canonical
helper as a side effect; they call the capture owner directly.

These diagnostic commands remain candidates for later deletion after their direct
Diagnostics consumers are reconciled. They are **not product AI execution**.

## Canonical Meeting Authority That Survives Consolidation

Keep:

```text
src-tauri/src/engine/runtime_state.rs
src-tauri/src/commands/meeting_session.rs
```

Product lifecycle commands remain:

```text
get_meeting_session_status
start_meeting_translation
stop_meeting_translation
```

The session owner keeps:

```text
session_id
generation
authority_active
phase
```

Generation checks remain valid. `Start Translation` remains fail-closed while a safe
continuous runtime and finalized utterance producer are incomplete. Rolling
`ready_for_target_asr_frame` is still not final speech.

## Local AI Worker — Remaining Work

| Owner | Current behavior | State |
|---|---|---|
| `helper_bridge.rs` + `helper_bridge_runtime.rs` | persistent process + JSON request/response | **KEEP / SCHEDULER PARTIAL** |
| `bridge_paths.rs` | base worker entry; dev Python candidate fallback remains | **ENTRY ALIGNED / PACKAGING LATER** |
| `realtime_local_worker.py` | `status / preload / transcribe / translate / synthesize` + model caches | **KEEP / CANONICAL WORKER** |
| `text_translate.rs` | persistent helper only | **ALIGNED SOURCE** |
| removed manual/accelerated Rust/Python translation owners | absent | **RETIRED** |
| capture one-shot AI path | removed | **RETIRED** |
| migration/dev handoff commands | Diagnostics-only remnants | **STALE / PRUNE LATER** |
| `meeting_session.rs` finalized AI stages | canonical task names + generation checks | **KEEP / WAITS FOR SCHEDULER + FINALIZED AUDIO** |

No new AI worker/service may be added while readiness/scheduler ownership remains
incomplete.

## Slice 2 Boundary — Capability / Readiness Truth

Current readiness inputs still prove different things:

| Current owner/input | What it actually proves | State |
|---|---|---|
| `WorkerRuntime/model_manifest.json` | expected install catalog | **KEEP-CANDIDATE / METADATA PARTIAL** |
| `commands/runtime_inventory.rs` | mostly static path/file presence | **PARTIAL / STATIC INSTALL EVIDENCE** |
| `RuntimeContracts/MODEL_RUNTIME_MANIFEST.json` | previous-machine snapshot stored in source | **STALE AS CURRENT READINESS** |
| `realtime_stack_manifest.json` | declared profile/model/latency intentions | **STALE AS EXECUTION PROOF** |
| worker `status` | current process imports/assets/device/load-cache information | **KEEP / SEMANTICS NEED SPLIT** |
| helper `provider_ready` | coarse aggregate mixing capability/request outcomes | **CONFLICT** |
| internal/live/professional/migration gates | planning/source/migration readiness | **STALE AS PRODUCT READINESS** |
| `runtimeProductFacade.ts` | product mapper | **KEEP / INPUTS MUST BE RECONCILED** |
| `MeetingSessionPreflight` | transactional Meeting Start gate | **KEEP / CONSUME CANONICAL CAPABILITIES** |

Required distinction:

```text
Installed
!= Loaded
!= Inference verified
!= Product capability Ready
!= Meeting Start safe
```

## Retired / Non-Canonical Concepts

```text
Documents workspace / attachment translation
top-level Saved
General / Translation / Audio as normal Settings destinations
session_chat.rs as product History
session_store.rs / SavedTranscript as product History
manual/rule-based preview product translation
standalone entry/accelerated Python worker
legacy capture one-shot ASR -> Translate -> TTS
silent Realtime <-> Quality fallback from legacy capture
dev seed/smoke/handoff success as product inference proof
stale source/runtime manifest state as current Ready
rolling ASR-ready audio treated as finalized speech
```

## Current Mode / Continuation

Current mode is **Developing** through `ChatGPT -> GitHub`.

Engine Consolidation Slice 1 is source-aligned. Build/runtime/model proof remains
`LOCAL PROOF REQUIRED`. The single continuation owner is
`docs/knowledge/next-action.md`, which advances to **Slice 2 — capability/readiness
truth**.
