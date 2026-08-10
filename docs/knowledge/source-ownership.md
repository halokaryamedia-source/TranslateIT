# TranslateIT — Source Ownership And Reconciliation Map

**Status:** current source map  
**Updated:** 2026-08-10  
**Branch:** `New`

This file maps product responsibilities to current semantic/source owners. It is not
a backlog, task log, plan, or runtime proof report. `docs/knowledge/next-action.md`
owns the single active continuation.

Status vocabulary:

```text
ALIGNED   -> one current owner substantially matches approved behavior
PARTIAL   -> useful owner exists but required behavior is incomplete
CONFLICT  -> more than one active/current path competes for the same responsibility
MISSING   -> approved capability has no complete current owner
STALE     -> source still expresses superseded behavior
RETIRED   -> inherited concept is no longer approved product scope
```

Static source alignment never becomes model-quality, latency, CUDA/CPU, Windows
device/audio, rendered-UI, installed-runtime, or release proof.

## Executive Ownership Map

| Boundary | Current owner(s) | Status | Current truth |
|---|---|---|---|
| Product shell/navigation | `src/main.ts`, `FirstSetupBootstrap.ts`, `SimpleLauncherController.ts`, active shell | **ALIGNED / VISUAL PARTIAL** | Normal app is Meeting / Text / History / Settings. |
| First Setup | `FirstSetupBootstrap.ts`, `RuntimeSettings`, `runtimeProductFacade.ts`, audio commands | **ALIGNED SOURCE / WINDOWS PROOF LATER** | Five-step flow, defer/resume, and candidate-check -> commit device selection exist. |
| Settings | Settings render/controller + `RuntimeSettings` + History/audio owners | **ALIGNED HIERARCHY / PARTIAL MEETING RUNTIME** | Meeting / History & Privacy / Advanced -> Diagnostics. |
| Text UI | `SimpleLauncherController.ts`, `runtimeProductFacade.ts`, `runtimeApi.ts` | **ALIGNED UI** | Familiar source/target workspace and Recent write exist. |
| Text AI execution | `commands/text_translate.rs` -> persistent helper -> `realtime_local_worker.py` | **SOURCE ALIGNED / LOCAL PROOF LATER** | One worker route; no manual/rule/alternate-worker product fallback. |
| Model installation evidence | `WorkerRuntime/model_manifest.json`, `commands/runtime_inventory.rs` | **ALIGNED STATIC OWNER / METADATA PARTIAL** | Reports installation/presence only; no model-load/runtime `PASS`. Optional backup/Quality/TTS assets no longer block unrelated capability readiness. |
| Current AI capability truth | persistent worker `status` -> helper bridge | **SOURCE ALIGNED / LOCAL PROOF LATER** | Worker status owns ASR, Realtime translation, Quality translation, TTS and degraded-device capability truth. Individual task result no longer promotes/demotes whole-provider readiness. |
| Product readiness mapping | `runtimeProductFacade.ts` | **SOURCE ALIGNED / LOCAL PROOF LATER** | Text readiness comes from the capability for the mode currently requested; Meeting readiness comes from canonical `MeetingSessionPreflight`. Static inventory and legacy gates are not promoted to product Ready. |
| Meeting application session/preflight | `engine/runtime_state.rs`, `commands/meeting_session.rs` | **ALIGNED AUTHORITY / OUTBOUND RUNTIME PARTIAL** | `session_id + generation` remains authority; transactional Start preflight is canonical Meeting readiness. |
| Runtime diagnostics aggregate | `runtime_status_bundle_logic.rs` + legacy diagnostic gates | **DIAGNOSTIC ONLY / CLEANUP LATER** | Bundle now exposes canonical `meeting_session`; legacy live/internal gates remain diagnostic evidence only, not normal product readiness. |
| History / Saved | `history_store.rs`, `commands/history.rs`, frontend History owners | **TEXT ALIGNED / MEETING PARTIAL** | Canonical store is `UserData/SavedProject/History/{Recent,Saved}`. |
| Meeting outbound route | `virtual_audio_route_runtime.rs`, virtual-route selection/provider | **PARTIAL / WINDOWS PROOF REQUIRED** | Generation-aware cancellation contract exists; real delivery unproved. |
| Incoming Meeting assistance | audio/capture/runtime candidates | **MISSING / PARTIAL** | Meeting Sound preference exists; loopback -> EN ASR -> ID text and self-output suppression do not. |
| Translation tone/context | settings + inherited adapters | **MISSING / PARTIAL** | Approved tone/context do not yet reach canonical inference. |
| Document Translation | no active workspace | **RETIRED** | Do not revive Documents/file-attachment translation. |
| Audio Studio | explicit entry + backend contracts | **PARTIAL / POST-CORE** | Preserve post-core; not current core blocker. |
| Packaging/runtime assets | Tauri/NSIS direction + path/assets owners | **PARTIAL / STALE ASSUMPTIONS** | Repo/system-Python assumptions remain; clean install proof later. |

## 1. Canonical Text / Local AI Execution

Current standalone Text path:

```text
SimpleLauncherController
-> runtimeProductFacade
-> runtimeApi.translateText
-> commands/text_translate.rs
-> existing persistent helper bridge
-> realtime_local_worker.py `translate`
-> one result
```

Retired from product translation execution:

```text
manual_translation.rs
manual_translation_accelerated.rs
realtime_local_worker_entry.py
realtime_local_worker_accelerated.py
rule/dictionary/preview translation success
legacy capture-owned ASR -> Translate -> TTS one-shot execution
silent Realtime <-> Quality retry in legacy capture
```

`adapters/translation_logic.rs` is now non-executing shaping/legacy adapter code; it
cannot manufacture `Completed` translation output.

Classification: **SOURCE ALIGNED / LOCAL PROOF REQUIRED**.

## 2. Installation Evidence Is Not Runtime Readiness

Canonical declarative asset catalog:

```text
EngineData/Backend/LocalWorker/WorkerRuntime/model_manifest.json
```

Canonical Rust inventory:

```text
src-tauri/src/commands/runtime_inventory.rs
```

Inventory vocabulary now describes installation state such as:

```text
installed
missing_required
missing_optional
metadata incomplete
```

It does not call file presence `PASS`. `verify_models()` remains an inventory
inspection alias. `setup_models()` remains temporarily registered for compatibility
but explicitly reports that it **does not download, install, load, or infer**.

Current required-vs-optional catalog semantics:

- Faster Whisper Large V3 Turbo — primary/core asset candidate;
- Faster Whisper Medium — optional degraded fallback candidate until later benchmark;
- MarianMT ID->EN — primary Meeting Realtime translation asset candidate;
- NLLB Quality — capability-specific optional install item; missing it must make
  Quality Text unavailable rather than blocking unrelated Meeting readiness;
- Piper — optional packaged TTS provider because current runtime may use verified
  Windows SAPI instead.

Revision/checksum/source metadata remains incomplete and belongs to the later
reproducibility/tooling slice.

Classification: **ALIGNED STATIC OWNER / METADATA PARTIAL**.

## 3. Stale Runtime Snapshot Retired

The source-tree snapshot:

```text
EngineData/Backend/RuntimeContracts/MODEL_RUNTIME_MANIFEST.json
```

is **removed**. Previous-machine values such as `ready: true`, old SAPI voices, old
CUDA state, or previous model load results can no longer act as current runtime
truth.

`local_worker_manifest_logic.rs` is retained only as a legacy Diagnostics/static
source-install report while diagnostic consumers are reconciled. It no longer reads
the removed runtime snapshot and explicitly leaves SAPI/CUDA/runtime load truth to
the persistent worker.

`realtime_stack_manifest.json` may still carry inherited declared mode/latency
intent. It is not normal product execution/readiness proof and is scheduled for
later merge/removal under the tooling/reproducibility slice.

## 4. Current Worker Capability Truth

Canonical runtime capability source:

```text
persistent realtime_local_worker.py
-> command `status`
-> readiness {
     asr
     translation_realtime
     translation_quality
     tts
     cuda_degraded
   }
```

Helper lifecycle status and capability status are now semantically separated:

- process `ready` means the persistent process/stdio bridge is alive and ping/status
  can be exchanged;
- capability readiness comes from worker `status`;
- a failed `translate`, `transcribe`, or `synthesize` request describes that request;
- an individual request failure no longer changes the helper process to `blocked` or
  replaces the cached all-capability status;
- actual I/O/process/deadline failure may still block/terminate the helper;
- coarse `provider_ready` remains a compatibility field for the required outbound AI
  set, not a general proof that every capability is Ready.

Scheduler/locking/cancellation is **not** solved by this slice.

Classification: **SOURCE ALIGNED / LOCAL PROOF REQUIRED**.

## 5. Normal Product Readiness

`runtimeProductFacade.ts` is the product presentation mapper, not an independent
runtime authority.

Text readiness:

```text
current requested Text mode
-> current persistent worker capability for that mode
-> Text Ready / Setup Needed
```

Until Slice 3 removes shared mode ownership, the facade intentionally evaluates the
mode the current Text command will actually request from `RuntimeSettings.runtime_profile`.
It does not report `canTranslateText=true` unconditionally.

Meeting readiness:

```text
MeetingSessionPreflight
-> required microphone
-> static required installation check
-> persistent helper/core outbound AI capability
-> managed Meeting route
-> route execution guard
-> finalized-utterance / continuous-outbound contract
-> ready_for_start
```

`runtime_status_bundle_logic.rs` now exposes `meeting_session` so the existing
frontend bridge can consume canonical Meeting preflight without creating a second
frontend readiness owner.

Normal product readiness no longer consumes these as authority:

```text
live_meeting_runtime_gate
runtime_readiness_bundle
internal_validation_gate
professional readiness/progress
local_worker_manifest as runtime proof
stale source/runtime snapshot
native CT2 candidate as AI inference proof
```

Those may remain visible to Developer Diagnostics while still useful, but they do
not make Text or Meeting Ready.

Classification: **SOURCE ALIGNED / LOCAL PROOF REQUIRED**.

## 6. Canonical Meeting Authority That Survives Consolidation

Keep:

```text
src-tauri/src/engine/runtime_state.rs
src-tauri/src/commands/meeting_session.rs
```

Lifecycle commands remain:

```text
get_meeting_session_status
start_meeting_translation
stop_meeting_translation
```

The session snapshot continues to own:

```text
session_id
generation
authority_active
phase
```

`Start Translation` remains fail-closed because a finalized utterance producer and
continuous outbound runtime are still intentionally not connected. Slice 2 does not
weaken that blocker.

## 7. Remaining Engine Work

The AI execution/readiness ownership is substantially cleaner, but the engine is not
runtime-proven or feature-complete.

Still unresolved:

```text
helper lock held through blocking worker task
real Meeting-over-Text scheduling
real cancellation/hard-cancel semantics
caller-owned Meeting Realtime vs Text Quality
silent tokenizer truncation / bounded long-input correctness
canonical dependency lock / Python environment
worker model/provider quality and performance benchmarks
finalized outbound utterance producer
incoming Meeting lane
```

No new AI worker/service/readiness gate should be added to solve these.

## 8. Audio / History / Other Boundaries

Windows audio remains outside AI ownership. Physical microphone capture, VAD/final
utterance production, Meeting Sound loopback, and Meeting Microphone delivery remain
owned by the Windows audio/runtime boundary.

Canonical History remains:

```text
UserData/SavedProject/History/
├─ Recent/
└─ Saved/
```

Documents remains retired. Audio Studio remains post-core. Svelte remains a separate
future frontend architecture decision and is not part of Engine consolidation.

## Current Mode / Continuation

Current mode: **Developing**.  
Execution channel: `ChatGPT -> GitHub`.

Engine Consolidation Slice 1 and Slice 2 are source-aligned at their bounded claims.
No compile/model/Windows runtime proof has been obtained in this channel.

The single continuation is `docs/knowledge/next-action.md`, which advances to
**Engine Consolidation Slice 3 — caller-owned modes + scheduler/cancellation**.
