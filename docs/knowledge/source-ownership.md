# TranslateIT — Source Ownership And Reconciliation Map

**Status:** current source map  
**Updated:** 2026-08-11  
**Branch:** `New`

This file maps the simplified product to current source owners. It is not a backlog or
runtime proof report. `docs/knowledge/next-action.md` owns the single continuation.

Status vocabulary:

```text
ALIGNED  -> current owner matches the simplified source boundary
PARTIAL  -> useful owner exists but behavior/proof is incomplete
STALE    -> source implements behavior removed/deferred from initial core
MISSING  -> required simplified-core behavior has no valid current implementation
PLANNED  -> owner/method is resolved but source implementation is still pending
```

## Executive Map

| Boundary | Current owner(s) | Status | Current truth |
|---|---|---|---|
| Product shell/navigation | `shell.ts`, `lockedReferenceShellParts.ts`, `SimpleLauncherController.ts` | **SOURCE ALIGNED / RENDER PROOF LATER** | Active navigation is Meeting / Text / Settings. Normal Settings exposes Meeting / Advanced only. Normal Meeting/Text has no Mode/Tone surface. |
| Meeting application authority | `runtime_state.rs`, `meeting_session.rs` | **SOURCE ALIGNED / RUNTIME PROOF LATER** | One normal `starting -> live -> stopping` application Meeting path; Pause/Resume removed. |
| Physical microphone capture | `engine/audio/live_capture.rs` | **ALIGNED / WINDOWS PROOF LATER** | Required outbound capture owner. |
| Finalized speech boundary | `engine/audio/finalized_utterance.rs` | **ALIGNED BASE** | Finalized stable speech/event identity and shared Meeting order. |
| Meeting Sound capture | `engine/audio/meeting_sound_capture.rs` | **PARTIAL / OPTIONAL** | Separate optional incoming loopback owner; Windows proof later. |
| Translation worker | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL PROOF LATER** | One persistent worker routes ID->EN to `marianmt-id-en` and EN->ID to `marianmt-en-id`. Worker now separates packaged runtime assets from writable user data using canonical roots supplied by the app. |
| Translation product readiness | worker status -> `runtimeProductFacade.ts` | **SOURCE ALIGNED / EXECUTION PROOF LATER** | Product reads `translation_id_en` / `translation_en_id`; Meeting outbound uses ID->EN; Text follows selected direction. |
| Translation safety | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL PROOF LATER** | No silent truncation; input limit and EOS-completion guards precede promotion. |
| Translation model identity/inventory | `model_manifest.json`, `runtime_inventory.rs` | **SOURCE ALIGNED / INSTALLATION PROOF ONLY** | Both Marian directions match worker paths; old NLLB/mode-based inventory removed. Inventory resolves from canonical runtime root. |
| Installed runtime/user path semantics | `engine/paths.rs` + `app_bootstrap.rs` | **SOURCE ALIGNED / INSTALLED PROOF LATER** | Packaged runtime root comes from Tauri resources; writable data root comes from app-local data. Repository probing is debug-development fallback only. |
| Worker/helper path projection | `bridge_paths.rs` + worker environment contract | **SOURCE ALIGNED / PACKAGED HELPER PROOF LATER** | Worker script/model roots come from `ProjectPaths`; bootstrap exports those canonical roots to child runtime processes. Legacy `UserData/...` labels are mapped into the writable root by the worker. |
| Controlled Windows installer shell | `src-tauri/tauri.conf.json` + NSIS release boundary | **PLANNED / NOT IMPLEMENTED** | Keep one user-run NSIS Setup experience, but do not embed all large AI assets into one monolithic installer. |
| Large local runtime/model payload delivery | release staging + NSIS local sidecar hook + `model_manifest.json` identity | **PLANNED / NOT IMPLEMENTED** | Selected topology is Setup EXE plus local sidecar payloads distributed together; no first-run internet downloader or manual model placement. |
| Packaged Python/helper runtime | WorkerRuntime project + release packaging boundary | **MISSING FOR INSTALLED PRODUCT** | Current helper can still use `.venv`, environment override, or system Python; installed users must eventually receive an approved packaged helper runtime. |
| Meeting outbound AI | `meeting_session.rs` -> helper -> worker | **SOURCE ALIGNED / RUNTIME PROOF LATER** | Explicit ID->EN request -> translation -> TTS -> Meeting Microphone route. |
| Meeting incoming AI | `meeting_session.rs` -> helper -> worker | **SOURCE ALIGNED CONTRACT / MODEL PROOF LATER** | Explicit EN->ID request, no incoming TTS; reverse failure is optional/degradable. |
| Self-output suppression | `meeting_session.rs` + `meeting_sound_capture.rs` | **SOURCE ALIGNED / WINDOWS PROOF LATER** | Healthy incoming suppressed while TranslateIT speaks; suppression failure disables incoming and required outbound continues. |
| Helper scheduler | `helper_bridge.rs`, `helper_bridge_runtime.rs` | **ALIGNED BASE** | One worker scheduler: outbound > incoming > Text > diagnostics. |
| Live transcript | transient committed turns + `MeetingLiveActivityPresentation.ts` | **SOURCE ALIGNED / RENDER PROOF LATER** | Finalized current-session transcript is transient and cleared at Stop. |
| Meeting Stop lifecycle | `meeting_session.rs` | **SOURCE ALIGNED / RUNTIME PROOF LATER** | Revokes authority and cleans runtime/transient state; no History write. |
| History / Saved active surface | active shell/controller/`runtimeApi.ts` | **REMOVED FROM INITIAL SURFACE** | No normal History workflow or automatic Text persistence. |
| History / Saved backend | `history_store.rs`, History Tauri commands | **DEFERRED / DISCONNECTED** | Source may remain but is not an active Meeting/Text dependency. |
| Text translation | `text_translate.rs` -> helper -> worker | **SOURCE ALIGNED / EXECUTION PROOF LATER** | Explicit ID<->EN direction, canonical worker, no normal mode or History write. |
| Tone / conversation context | active inference/product | **DEFERRED BY POLICY** | No Tone controls and no automatic previous-turn/history context. |
| Global safe close | `GlobalMeetingShell.ts`, native `main.rs` -> canonical Stop | **ALIGNED BASE** | Stop-before-close delegates to canonical Meeting Stop. |
| Static translation-core validation | `validate_startup_runtime_readiness.mjs` | **SOURCE ALIGNED DEFINITION / NOT EXECUTED** | Protects simplified translation/session/inventory contracts. |
| Static package/path validation | `validate_tauri_package_preflight.mjs` | **SOURCE ALIGNED DEFINITION / NOT EXECUTED** | Protects Tauri resource/app-local path split, debug-only repository fallback, direct worker/model consumers, and worker writable-path mapping. |

## 1. Simplified Product Flow

```text
Meeting outbound
ID microphone speech
-> final ASR
-> ID -> EN translation
-> English TTS
-> Meeting Microphone

Optional incoming
Meeting Sound EN speech
-> final ASR
-> EN -> ID translation
-> local text

Text
ID <-> EN
-> Translate
-> result
```

Normal users do not select provider, model, tone, Realtime/Quality mode, context, queue,
or worker internals.

## 2. Translation And Inventory Ownership

`realtime_local_worker.py` owns direction selection:

```text
ID -> EN -> RuntimeAssets/Translation/ModelData/marianmt-id-en
EN -> ID -> RuntimeAssets/Translation/ModelData/marianmt-en-id
```

Normal product readiness follows worker direction fields. `model_manifest.json` remains
the direction-based model identity/inventory owner. `runtime_inventory.rs` resolves the
manifest and expected model locations from the canonical runtime root rather than a
repository root.

The EN->ID manifest `required=false` value is only the required Meeting-outbound
inventory rule. Full release acceptance still needs both directions because Text ID<->EN
is core. Inventory/presence does not prove model load, quality, latency, or packaging.

## 3. Packaged Runtime Path Ownership

`engine/paths.rs` is the single semantic path owner.

Installed/Tauri mode:

```text
Tauri resource directory
-> runtime_root
-> EngineData/Backend/LocalWorker/WorkerRuntime
-> EngineData/Backend/RuntimeAssets
-> immutable worker/model/voice resources

Tauri app-local data directory
-> user_data_root
-> CacheData
-> LogData
-> SavedProject reservation
```

`app_bootstrap.rs` initializes the packaged context before normal runtime commands and
creates the writable user-data directories. It also publishes `TRANSLATEIT_RUNTIME_ROOT`
and `TRANSLATEIT_USER_DATA_ROOT` to child processes from `ProjectPaths`; those values
are transport from the canonical owner, not another user-configurable path authority.

Repository development remains explicit:

```text
debug build only
+ verified AGENTS.md / EngineData/Backend / EngineData/Frontend/RustApp / UserData markers
-> repository_development_fallback
```

A release build does not promote repository probing into installed path truth. Before
Tauri setup initializes release paths, any current-working-directory result is explicitly
unverified bootstrap fallback.

The Python worker consumes the app-supplied roots. Runtime assets remain under
`RUNTIME_ROOT`; `UserData/...` audio/TTS labels are remapped to `USER_DATA_ROOT` and must
still pass the worker's allowed-root check. This preserves current Rust handoff labels
without writing generated runtime data into immutable packaged resources.

This is source alignment only. It does not prove Tauri resources are packaged, app-local
paths are writable on a target machine, or installed child processes can load models.

## 4. Controlled Release Ownership

The resolved initial distribution topology remains:

```text
controlled Windows release
├─ one user-run NSIS Setup EXE
└─ local sidecar payloads distributed with Setup
   ├─ runtime/helper payload(s)
   ├─ ASR
   ├─ marianmt-id-en
   └─ marianmt-en-id
```

Initial delivery does not use a first-run internet downloader. Setup/release owns asset
verification and placement; users do not operate Python, Hugging Face, or model folders.

Canonical responsibilities:

```text
model_manifest.json
-> model identity + direction + source metadata

release payload contract / staging
-> immutable source revision + prepared payload identity/hash + installed target

Tauri / NSIS boundary
-> one Setup interaction + local sidecar installation transport

engine/paths.rs
-> installed/development runtime + user-data paths
```

Do not create a second model registry, path service, in-app package manager, or downloader.

## 5. Remaining Helper Runtime Gap

Current helper startup can still select:

```text
TRANSLATEIT_WORKER_PYTHON
WorkerRuntime/.venv
system python/python3/py
```

That remains development flexibility, not installed-product compliance. A later bounded
release slice must provide an approved packaged helper/Python runtime so PR-142 does not
require users to install Python or manage environment variables.

## 6. Reproducible Release Input Boundary

For each external release payload, release identity should minimally establish:

```text
source/repo ID
immutable source revision/commit
expected installed target
prepared release payload/archive SHA-256
```

Git remains metadata-only for large model bytes. Hash/revision evidence must not become a
second translation-model-selection owner and must not be described as inference proof.

The exact source owner for this release-artifact identity is the next planning boundary;
do not invent a generic package registry merely to store it.

## 7. Meeting Reliability Boundaries

Application Meeting remains:

```text
Start
-> starting authority
-> Live
-> Stop
-> stopping / authority revoked
-> cleanup
-> no active session
```

Optional incoming is subordinate:

```text
suppression/incoming healthy
-> EN -> ID assistance available

suppression/incoming unsafe
-> incoming disabled/degraded
-> required ID -> EN outbound continues
```

Stop clears audio/helper/consumer/transient state and does not perform History
persistence.

## 8. Initial UI Target

```text
Meeting
├─ readiness
├─ microphone / optional Meeting Sound / Meeting Microphone
├─ Start Translation
├─ finalized transcript
└─ Stop Translation

Text
├─ ID <-> EN direction
├─ source / result
├─ Translate
└─ Copy

Settings
├─ Meeting
└─ Advanced / Diagnostics
```

History/Saved, Mode, Tone, Pause/Resume, and context prompting are outside the active
initial product.

## 9. Deferred / Remaining Work

```text
NEXT PLAN: release payload identity/revision/hash owner
LATER: release payload staging + NSIS local sidecar hook
LATER: packaged Python/helper runtime
LATER: clean-machine installer/runtime acceptance
DEFERRED: History/Saved backend cleanup
DEFERRED: Audio Studio/custom voice
DEFERRED: conversation context and other removed product features
```

Stale descriptive README text may be reconciled in a separate bounded documentation
cleanup; it is not current product authority.

## 10. Static Vs Runtime Proof

ChatGPT -> GitHub may establish source ownership, routing, path contracts, release-plan
topology, and declarative metadata only. Local Windows/release proof is still required
for compilation, package-validator execution, installer build, payload transfer,
clean-machine launch, app-local write behavior, packaged helper execution, model load,
ASR, both translations, TTS, Meeting Microphone, Meeting Sound, suppression,
latency/memory, rendered UI, and installed operation.

## Current Mode / Continuation

Current mode: **Plan** for the next bounded release boundary.  
Execution channel: `ChatGPT -> GitHub`.

The packaged runtime/user-data path foundation is source-aligned. The next unresolved
source responsibility is the minimal release payload identity/revision/hash contract
that will feed later sidecar staging without becoming a second model registry.

The single continuation is `docs/knowledge/next-action.md`.
