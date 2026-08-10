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
| Translation worker | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL PROOF LATER** | One persistent worker routes ID->EN to `marianmt-id-en` and EN->ID to `marianmt-en-id`. |
| Translation product readiness | worker status -> `runtimeProductFacade.ts` | **SOURCE ALIGNED / EXECUTION PROOF LATER** | Product reads `translation_id_en` / `translation_en_id`; Meeting outbound uses ID->EN; Text follows selected direction. |
| Translation safety | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL PROOF LATER** | No silent truncation; input limit and EOS-completion guards precede promotion. |
| Translation model identity/inventory | `model_manifest.json`, `runtime_inventory.rs` | **SOURCE ALIGNED / INSTALLATION PROOF ONLY** | Both Marian directions match worker paths; old NLLB/mode-based inventory removed. EN->ID is nonblocking at required Meeting-outbound inventory boundary. |
| Installed runtime/user path semantics | `engine/paths.rs` + `app_bootstrap.rs` | **STALE / NEXT** | Current `ProjectPaths` assumes repository `EngineData + UserData`; installed Tauri resource root and writable app-local user root are not separated yet. |
| Controlled Windows installer shell | `src-tauri/tauri.conf.json` + NSIS release boundary | **PLANNED / NOT IMPLEMENTED** | Keep current NSIS setup experience, but do not embed all large AI assets into one monolithic installer. |
| Large local runtime/model payload delivery | release staging + NSIS local sidecar hook + `model_manifest.json` identity | **PLANNED / NOT IMPLEMENTED** | Selected initial topology is Setup EXE plus local sidecar payloads distributed together; no first-run internet downloader or manual model placement. |
| Packaged Python/helper runtime | WorkerRuntime project + release packaging boundary | **MISSING FOR INSTALLED PRODUCT** | Current helper may use `.venv`, environment override, or system Python; installed users must eventually receive an approved packaged helper runtime instead. |
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
| Static translation-core validation | `validate_startup_runtime_readiness.mjs` | **SOURCE ALIGNED DEFINITION / NOT EXECUTED** | Protects simplified translation/session/inventory contracts; execution remains local proof. |

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

## 2. Translation Ownership

`realtime_local_worker.py` owns direction selection:

```text
ID -> EN -> RuntimeAssets/Translation/ModelData/marianmt-id-en
EN -> ID -> RuntimeAssets/Translation/ModelData/marianmt-en-id
```

Normal product readiness follows the worker direction fields. Worker compatibility
aliases may remain for inherited Diagnostics/preload consumers only; they do not select
a model or normal product readiness.

```text
Meeting required outbound
ASR + translation_id_en + TTS + Meeting route

Optional incoming
translation_en_id may be unavailable without blocking outbound

Text
current source/target direction
-> matching translation_id_en or translation_en_id
```

## 3. Model Inventory Ownership

`model_manifest.json` is the direction-based model identity/inventory owner:

```text
marianmt-id-en
stage = translation_id_en
required = true
expected_path = EngineData/Backend/RuntimeAssets/Translation/ModelData/marianmt-id-en
source = Helsinki-NLP/opus-mt-id-en

marianmt-en-id
stage = translation_en_id
required = false
expected_path = EngineData/Backend/RuntimeAssets/Translation/ModelData/marianmt-en-id
source = Helsinki-NLP/opus-mt-en-id
```

The EN->ID `required=false` value is only the required Meeting-outbound inventory rule.
Full release acceptance still needs both directions because Text ID<->EN is core.
Inventory/presence does not prove model load, quality, latency, or packaging.

## 4. Controlled Release Ownership

The resolved initial distribution topology is:

```text
controlled Windows release
├─ one user-run NSIS Setup EXE
└─ local sidecar payloads distributed with Setup
   ├─ runtime/helper payload(s)
   ├─ ASR
   ├─ marianmt-id-en
   └─ marianmt-en-id
```

This preserves one setup **experience** without forcing all large bytes into one NSIS
executable. The current primary ASR and both Marian PyTorch checkpoints already exceed a
sensible single standard NSIS size boundary before Python/Torch/TTS are added.

Initial delivery therefore does not use a first-run internet downloader. Setup/release
owns asset verification and placement; the user does not operate Python, Hugging Face,
or model folders.

Canonical responsibilities are:

```text
model_manifest.json
-> model identity + direction + source metadata

release staging / package preflight
-> exact release payload presence + pinned revision/hash expectations

Tauri / NSIS package boundary
-> one Setup interaction + local sidecar installation transport

engine/paths.rs
-> semantic installed/development runtime + user-data paths

app_bootstrap.rs
-> Tauri app-path initialization into the canonical path owner
```

Do not create a second model registry, installer service, path service, in-app package
manager, or downloader merely to implement this topology.

## 5. Installed Path Gap

Current `ProjectPaths::discover()` searches for a root containing both `EngineData` and
`UserData`, then derives runtime assets and writable user data under that root. This is a
repository-development layout, not a valid installed ownership model.

Next target:

```text
immutable packaged runtime root
-> worker/runtime/models/voice

writable app-local root
-> CacheData / LogData / future approved persistent data

repository root
-> bounded explicit development fallback
```

`engine/paths.rs` must remain the single semantic owner. Tauri setup must supply the
installed path context; callers must not discover their own alternative roots.

## 6. Helper Runtime Delivery Gap

Current helper startup can select:

```text
TRANSLATEIT_WORKER_PYTHON
WorkerRuntime/.venv
system python/python3/py
```

That is development flexibility, not installed-product compliance. PR-142 requires an
installed build that does not ask users to install Python/pip or manage environment
variables. The selected sidecar release topology may carry the packaged helper runtime,
but the exact Python embedding/freezing method is a later bounded release decision after
the path foundation is source-aligned.

## 7. Reproducible Release Input Boundary

For each external model payload, release identity should minimally contain:

```text
source/repo ID
immutable source revision/commit
expected installed target
release payload/archive SHA-256
```

Git remains metadata-only for large model bytes. Release hash metadata verifies the
prepared payload but is not inference proof.

## 8. Meeting Reliability Boundaries

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

## 9. Initial UI Target

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

## 10. Deferred / Remaining Work

```text
NEXT: installed packaged-runtime path foundation
LATER: release payload revisions/hashes + staging
LATER: NSIS local sidecar payload hook
LATER: packaged Python/helper runtime
LATER: clean-machine installer/runtime acceptance
DEFERRED: History/Saved backend cleanup
DEFERRED: Audio Studio/custom voice
DEFERRED: conversation context and other removed product features
```

Stale descriptive README text may be reconciled in a separate bounded documentation
cleanup; it is not current product authority.

## 11. Static Vs Runtime Proof

ChatGPT -> GitHub may establish source ownership, routing, plan topology, and declarative
metadata only. Local Windows/release proof is still required for compilation, installer
build, payload transfer, clean-machine launch, packaged helper execution, model load,
ASR, both translations, TTS, Meeting Microphone, Meeting Sound, suppression,
latency/memory, rendered UI, and installed operation.

## Current Mode / Continuation

Current mode: **Developing** for the next bounded slice.  
Execution channel: `ChatGPT -> GitHub`.

The release topology is planned. The next source mismatch is the repository-only path
owner: installed runtime resources and writable user data must be separated before NSIS
payload transport is implemented.

The single continuation is `docs/knowledge/next-action.md`.
