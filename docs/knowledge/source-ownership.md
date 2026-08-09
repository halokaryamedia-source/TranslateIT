# TranslateIT — Source Ownership And Reconciliation Map

**Status:** current source map  
**Updated:** 2026-08-10  
**Branch:** `New`

This file maps product responsibilities to the source that currently owns or
competes for them. It is not a backlog, task log, plan, or runtime-readiness report.
`docs/knowledge/next-action.md` owns the active consolidation slice.

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
| Text UI | `SimpleLauncherController.ts`, `runtimeProductFacade.ts`, `runtimeApi.ts` | **ALIGNED UI** | Familiar source/target workspace and Recent write exist. |
| Text AI execution | `commands/text_translate.rs` -> helper bridge -> `realtime_local_worker.py` | **SOURCE-ALIGNED / LOCAL PROOF LATER** | Text has one persistent-worker route; manual/one-shot/rule-based product fallback is retired. Current mode selection/readiness semantics remain later slices. |
| History / Saved | `engine/history_store.rs`, `commands/history.rs`, frontend History owners | **TEXT ALIGNED / MEETING PARTIAL** | Canonical store is `UserData/SavedProject/History/{Recent,Saved}`. |
| Meeting application session | `engine/runtime_state.rs`, `commands/meeting_session.rs` | **ALIGNED AUTHORITY / DOWNSTREAM AI PARTIAL** | `session_id + generation + authority_active` is the canonical Meeting authority. |
| Local AI worker process | `commands/helper_bridge.rs`, `helper_bridge_runtime.rs`, `bridge_paths.rs`, `realtime_local_worker.py` | **TEXT PATH CONSOLIDATED / SCHEDULER + READINESS PARTIAL** | Persistent helper launches the base worker directly. Locking/scheduling and capability truth are not yet consolidated. |
| Legacy voice/capture AI execution | `engine/capture_lifecycle.rs`, `commands/runtime_capture.rs`, migration/handoff commands | **CONFLICT** | Legacy one-shot/stub voice paths remain outside Text and must be reconciled in later engine/Meeting slices. |
| AI capability/readiness truth | worker status, model inventory/manifests, legacy gates, product mapper, Meeting preflight | **CONFLICT** | Static/model-presence/dev-gate evidence still overlaps current runtime truth. Slice 2 owns this reconciliation. |
| Meeting outbound route | `virtual_audio_route_runtime.rs`, virtual-route selection/provider | **PARTIAL / WINDOWS PROOF REQUIRED** | Generation-aware cancellation contract exists; real meeting delivery is unproved. |
| Incoming Meeting assistance | audio/capture/runtime candidates | **MISSING / PARTIAL** | Meeting Sound preference exists; loopback -> EN ASR -> ID text and self-output suppression do not. |
| Translation tone/context | settings + inherited adapters | **MISSING / PARTIAL** | Approved tone and bounded committed Meeting context do not yet reach canonical inference. |
| Document Translation | no active workspace | **RETIRED** | Do not revive Documents or file-attachment translation. |
| Audio Studio | explicit entry + backend contracts | **PARTIAL / POST-CORE** | Preserve as post-core; it is not a current core blocker. |
| Packaging/runtime assets | Tauri/NSIS direction + path/assets owners | **PARTIAL / STALE ASSUMPTIONS** | Repo-root/system-Python assumptions remain; clean installed proof is later. |

## Product Shell / Setup / Settings / History

Current frontend shell remains:

```text
index.html
└─ src/main.ts
   -> startDesktopWithFirstSetup
      ├─ new -> focused First Setup shell
      └─ deferred/completed -> SimpleLauncherController
                               -> Meeting / Text / History / Settings
```

`src/audioStudioEntry.ts` remains the explicit post-core Audio Studio entry.
Documents and top-level Saved are not active navigation.

First Setup and Meeting Settings continue to share `RuntimeSettings.audio` candidate
check -> commit behavior. Endpoint/config checks remain source-contract evidence only
and do not prove Windows capture/loopback behavior.

Canonical History remains:

```text
src-tauri/src/engine/history_store.rs
src-tauri/src/commands/history.rs
UserData/SavedProject/History/{Recent,Saved}
```

`engine/session_chat.rs` and `engine/session_store.rs / SavedTranscript` are not
canonical product History.

## Text Translation — Slice 1 Source Ownership

Current product path is now:

```text
SimpleLauncherController
-> runtimeProductFacade
-> runtimeApi.translateText
-> Rust commands/text_translate.rs
-> commands/helper_bridge.rs
-> persistent realtime_local_worker.py `translate`
-> one result
```

Current source guarantees at this boundary:

- `commands/text_translate.rs` no longer calls `engine::translate_text`;
- fresh/stopped helper state may start the existing persistent helper, not a second
  worker implementation;
- the helper bridge script owner resolves directly to `realtime_local_worker.py`;
- `realtime_local_worker_entry.py` is removed;
- `realtime_local_worker_accelerated.py` is removed as a standalone worker owner;
- `engine/manual_translation_accelerated.rs` is removed;
- `engine/manual_translation.rs` is removed;
- those manual modules/re-exports are removed from `engine/mod.rs`;
- worker failure, missing model/direction, invalid response, or unavailable helper
  returns a blocked Text result rather than invoking rule/dictionary preview output;
- the canonical Text command does not retry another translation mode.

`adapters/translation_logic.rs` may still exist as inherited/dead adapter source, but
it is **not an active Text execution fallback** after the manual engine removal. Do
not treat its deterministic preview logic as product inference; remove/reconcile it
only when its remaining direct consumers are inspected in a bounded later cleanup.

`runtime_profile` still reaches Text requests for compatibility. The approved
caller-owned `Text -> Quality` and `Meeting -> Realtime` split belongs to Slice 3;
Slice 1 intentionally does not combine mode migration with execution-owner cleanup.

The reachable source validator
`scripts/validate_translation_flow_integrity.mjs` now checks the real static claim:
Text -> persistent helper -> base worker, while requiring the retired manual/worker
owners to be absent. It no longer requires `engine::translate_text` or migration
handoff markers merely to manufacture a source PASS.

Classification: **SOURCE-ALIGNED / LOCAL PROOF REQUIRED** for actual helper/model
execution.

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

Generation checks remain useful and survive engine consolidation. `Start
Translation` remains fail-closed while a safe continuous runtime is not connected.
Rolling `ready_for_target_asr_frame` remains **not final speech**.

## Local AI Worker — Remaining Engine Work

The Text path now converges on the intended persistent helper/base worker, but the
whole voice/Meeting engine is not yet fully consolidated.

| Current path / owner | Current behavior | Ownership state |
|---|---|---|
| `commands/helper_bridge.rs` + `helper_bridge_runtime.rs` | Persistent Python process and JSON request/response | **KEEP / SCHEDULER PARTIAL** |
| `bridge_paths.rs` | Base worker entry; development Python candidate fallback remains | **ENTRY ALIGNED / PACKAGING LATER** |
| `realtime_local_worker.py` | Real `status / preload / transcribe / translate / synthesize` implementation and model caches | **KEEP / CANONICAL WORKER TARGET** |
| `commands/text_translate.rs` | Persistent helper only | **ALIGNED SOURCE** |
| removed manual/accelerated Rust translation owners | no longer active modules | **RETIRED** |
| removed entry/accelerated Python workers | no longer available as parallel helper entries | **RETIRED** |
| `engine/capture_lifecycle.rs` | Legacy capture -> one-shot ASR -> Translate -> TTS and mode fallback | **CONFLICT / LATER REPLACE** |
| `commands/runtime_capture.rs` + pipeline/asr migration handoffs | migration previews/stubs plus legacy fallback | **CONFLICT / LATER REMOVE/REDUCE** |
| `commands/meeting_session.rs` finalized AI stages | canonical task names + generation checks | **KEEP / WAITS FOR SCHEDULER + FINALIZED AUDIO** |

No new AI worker/service may be added while these remaining overlaps exist.

## AI Readiness / Model Truth — Slice 2 Boundary

Current readiness inputs are still not equivalent:

| Current owner/input | What it really proves today | State |
|---|---|---|
| `WorkerRuntime/model_manifest.json` | declarative expected model inventory | **KEEP-CANDIDATE / METADATA PARTIAL** |
| `commands/runtime_inventory.rs` | mostly model path/file presence and native candidate visibility | **PARTIAL / STATIC INSTALL EVIDENCE** |
| `RuntimeContracts/MODEL_RUNTIME_MANIFEST.json` | previous machine/runtime snapshot stored in source tree | **STALE AS CURRENT READINESS** |
| `realtime_stack_manifest.json` | declared profiles/latency/model intentions | **STALE AS EXECUTION PROOF** |
| worker `status` | current process imports/assets/provider availability plus loaded-cache flags | **KEEP-CANDIDATE / SEMANTICS NEED SPLIT** |
| helper `provider_ready` | mixes process/capability/request outcomes | **CONFLICT / TOO COARSE** |
| legacy internal/live/professional/migration gates | planning/migration/source readiness | **STALE AS PRODUCT READINESS** |
| `runtimeProductFacade.ts` | product presentation mapper | **KEEP / INPUTS MUST BE REPLACED** |
| `MeetingSessionPreflight` | transactional Meeting Start gate | **KEEP / MUST CONSUME CANONICAL CAPABILITIES** |

Required distinction remains:

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
manual/rule-based preview translation as Text product fallback
standalone accelerated/entry Python worker as product worker authority
dev seed/smoke/handoff success as product inference proof
stale source/runtime manifest state as current Ready
rolling ASR-ready audio treated as finalized speech
```

## Current Mode / Continuation

Current project mode is **Developing**, execution channel `ChatGPT -> GitHub`.

Engine Consolidation Slice 1 is source-aligned for the Text execution boundary.
Local compile/helper/model proof remains deferred. The single continuation owner is
`docs/knowledge/next-action.md`; after Slice 1 closure it advances to **Slice 2 —
capability/readiness truth**.
