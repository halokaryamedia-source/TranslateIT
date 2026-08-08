# TranslateIT — Source Ownership And Reconciliation Map

**Status:** Current source map  
**Updated:** 2026-08-09  
**Branch:** `New`

This note maps approved product requirements to current source ownership. It is not
a backlog, implementation plan, or runtime-readiness report.

Status vocabulary:

```text
ALIGNED  -> current ownership and behavior substantially match policy
PARTIAL  -> useful owner exists but behavior/contract is incomplete
MISSING  -> approved capability has no complete current implementation owner
STALE    -> current source expresses inherited behavior that conflicts with policy
```

Proof vocabulary follows root `AGENTS.md`.

## Executive Ownership Map

| Boundary | Current owner(s) | Requirement IDs | Status | Proof | Smallest next change |
|---|---|---|---|---|---|
| Product shell/navigation | `src/main.ts`, `SimpleLauncherController.ts`, `lockedReferenceShellParts.ts`, `settingsViews.ts` | PR-001–004, PR-160–169 | **STALE / PARTIAL** | static source | Align existing shell to Meeting-first product navigation and move engineering controls behind Advanced/Diagnostics; do not create a new launcher. |
| Product readiness/setup | `runtimeProductFacade.ts`, `SimpleLauncherController.refreshReadiness/runSetup` | PR-163–168 | **PARTIAL** | static source | Keep capability/readiness abstraction; replace normal-user helper/worker operations with product-level setup/recovery orchestration. |
| Text translation | `commands/text_translate.rs`, `engine::manual_translation_accelerated`, Python worker | PR-020–024, PR-040–052 | **PARTIAL** | static source; runtime quality proof required | Preserve current command owner; add approved tone/context/settings into the single translation request path rather than another translator. |
| Meeting voice capture/pipeline | `engine/capture_lifecycle.rs`, `engine/audio/*`, `commands/runtime_capture.rs`, pipeline/handoff adapters | PR-030–034, PR-050–054, PR-022 | **PARTIAL / STALE OWNERSHIP** | local proof required | Reconcile continuous Session Listening and natural segmentation around one worker/orchestration path; remove duplicated direct-Python execution behavior when superseded. |
| Translation context/tone/settings | `engine/settings.rs`, `engine/adapters/context_logic.rs`, `engine/adapters/translation_logic.rs`, frontend Translate settings | PR-040–047, PR-050–052 | **PARTIAL / MISSING** | static source; quality proof required | Extend canonical persisted settings/request contract for tone/context; make context influence actual inference rather than only status metadata. |
| Meeting audio route | `commands/virtual_mic_route.rs`, `commands/virtual_audio_route_runtime.rs`, Python `virtual_audio_route_provider.py` | PR-070–075, PR-145 | **PARTIAL** | **LOCAL PROOF REQUIRED** | Keep existing route owner; connect actual TTS output through the guarded provider using the packaged runtime and prove delivery on Windows. |
| History / Saved / storage | `engine/session_chat.rs`, `engine/session_store.rs`, `engine/transcript_session.rs`, `UserData/*` | PR-080–091 | **PARTIAL / STALE SEMANTICS** | static source; persistence proof required | Separate automatic History from explicit Saved under existing roots; add search/delete/clear/disable controls without a new storage root. |
| Document translation | attachment rules/contract + normal text composer only | PR-100–109 | **MISSING** | current source proves only quick text attachment | Add one first-class document workflow owner using existing translation runtime; do not turn attachment ingestion into a parallel translation engine. |
| Audio Studio | `commands/audio_studio.rs`, `shared/audioStudioTypes.ts`, Audio Studio contracts | PR-120–129 | **PARTIAL / POST-CORE** | metadata source only; provider proof required | Keep metadata owner; defer provider/profile implementation until core release path is aligned. |
| Installer/package/runtime assets | `tauri.conf.json`, package preflight, `engine/paths.rs`, `bridge_paths.rs`, `RuntimeAssets/*` | PR-140–149 | **PARTIAL / STALE PACKAGING ASSUMPTIONS** | clean-machine proof required | Package helper/runtime/assets explicitly and remove installed-build dependence on repo-root discovery/system Python; retain current NSIS direction. |

## 1. Product Shell And Navigation

### Current owners

```text
EngineData/Frontend/RustApp/src/main.ts
EngineData/Frontend/RustApp/src/app/simple-launcher/SimpleLauncherController.ts
EngineData/Frontend/RustApp/src/app/active-launcher/lockedReferenceShellParts.ts
EngineData/Frontend/RustApp/src/app/active-launcher/settingsViews.ts
EngineData/Frontend/RustApp/src/app/active-launcher/launcherSettingsRenderer.ts
```

### Current behavior

- `main.ts` explicitly starts `SimpleLauncherController`; there is no ambiguity
  about the active frontend controller.
- The active shell is text-first and labels text as the main workflow.
- Sidebar currently exposes History, Saved, Local data, and Settings rather than
  the approved Meeting/Text/Documents hierarchy.
- Home exposes `Start Helper`, `Check Worker`, `Check Mic`, and Diagnostics.
- Developer is a normal Settings tab.
- Translate settings still render `Fast` while the persisted/runtime term is
  `Realtime`.

### Classification

`STALE / PARTIAL`

The active shell is reusable and remains the owner, but its product hierarchy and
normal/developer boundary reflect stabilization work rather than the approved
product policy.

### Next change

Refactor the existing shell/controller only. Do not create another launcher.

Target first slice:

```text
Meeting
Text
Documents
History
Saved
Settings
```

with Developer Diagnostics under Advanced and canonical `Realtime / Quality`
naming.

## 2. Product Readiness And Setup

### Current owners

```text
EngineData/Frontend/RustApp/src/app/bridge/runtimeProductFacade.ts
EngineData/Frontend/RustApp/src/app/simple-launcher/SimpleLauncherController.ts
```

### Current behavior

`runtimeProductFacade` already translates low-level source status into product
capabilities such as text/helper/provider/microphone/models/voice readiness. This
is the correct direction for the normal UI.

Current `SimpleLauncherController` still exposes lower-level setup actions directly
and asks users to start/check internal components.

### Classification

`PARTIAL`

The product facade is a good owner. The UX around it is stale.

### Next change

Keep `runtimeProductFacade` as the product-facing readiness boundary and add
product-level orchestration/actions such as:

```text
Fix Setup
Retry
Open Diagnostics
```

Normal users should not manually operate helper lifecycle.

## 3. Text Translation Runtime

### Current owners

```text
EngineData/Frontend/RustApp/src-tauri/src/commands/text_translate.rs
EngineData/Frontend/RustApp/src-tauri/src/engine/manual_translation_accelerated.rs
EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker*.py
```

### Current behavior

`translate_text` first sends a translation request to the running helper bridge when
available. If no helper process is running, it falls back to the Rust engine
translation entrypoint, which is exported from `manual_translation_accelerated`.

The helper request currently contains:

```text
text
source_language
target_language
mode
max_new_tokens
```

It does not yet carry the approved tone/context product fields.

### Classification

`PARTIAL`

A canonical user-facing command exists. Do not create another translation service.

### Next change

Extend this existing request contract and worker execution for approved tone/context
behavior after the settings owner is aligned.

## 4. Meeting Voice Capture And Pipeline

### Current owners

```text
EngineData/Frontend/RustApp/src-tauri/src/engine/capture_lifecycle.rs
EngineData/Frontend/RustApp/src-tauri/src/engine/audio/*
EngineData/Frontend/RustApp/src-tauri/src/commands/runtime_capture.rs
EngineData/Frontend/RustApp/src-tauri/src/commands/pipeline*.rs
EngineData/Frontend/RustApp/src-tauri/src/engine/adapters/*pipeline*logic.rs
EngineData/Frontend/RustApp/src-tauri/src/engine/adapters/*asr*logic.rs
```

### Current behavior

`capture_lifecycle` owns direct start/stop capture and can prepare a target WAV.
On stop it launches ASR -> translation -> TTS work.

Important ownership conflict:

```text
Text translation
-> existing long-running helper bridge when available

Capture stop pipeline
-> direct `python` / `py -3` worker invocation
```

This is not a second product engine, but it is duplicated orchestration that should
not become two permanent runtime authorities.

Current start/stop semantics are also closer to click-toggle capture than approved
continuous Session Listening with automatic natural utterance segmentation.

### Classification

`PARTIAL / STALE OWNERSHIP`

### Next change

Choose one helper/runtime orchestration authority and route meeting ASR/translation/
TTS through it. Preserve current capture/audio owners where useful, but remove or
retire duplicated direct-Python orchestration once the unified path is proven.

Then implement Session Listening segmentation as behavior on top of that owner.

## 5. Translation Context, Tone And Settings

### Current owners

```text
EngineData/Frontend/RustApp/src-tauri/src/engine/settings.rs
EngineData/Frontend/RustApp/src-tauri/src/engine/runtime_settings.rs
EngineData/Frontend/RustApp/src-tauri/src/engine/adapters/context_logic.rs
EngineData/Frontend/RustApp/src-tauri/src/engine/adapters/translation_logic.rs
frontend Translate settings
```

### Current behavior

Canonical `RuntimeSettings` persists language, Realtime/Quality, audio toggles, and
custom voice fields, but has no canonical tone mode, Session Listening/PTT mode, or
History/privacy settings.

`context_logic` correctly manages a bounded rolling context window.

`translation_logic` accepts `context_window`, but the inspected path only computes
whether context is present; it does not use the context to shape real worker model
inference. It also contains preview/deterministic/pending behaviors that are not
proof of approved contextual quality.

### Classification

`PARTIAL / MISSING`

### Next change

Extend the existing settings schema rather than adding a separate config system.
Then pass tone/context through the canonical translation command/helper request and
prove it affects real local translation.

## 6. Meeting Audio Route

### Current owners

```text
EngineData/Frontend/RustApp/src-tauri/src/commands/virtual_mic_route.rs
EngineData/Frontend/RustApp/src-tauri/src/commands/virtual_audio_route_runtime.rs
EngineData/Backend/LocalWorker/WorkerRuntime/virtual_audio_route_provider.py
```

### Current behavior

`virtual_mic_route` detects/selects virtual input/output devices and persists a
route preference. It explicitly labels route contracts/stubs as source-side rather
than audio-runtime proof.

`virtual_audio_route_runtime` can prepare/dispatch a guarded provider payload, but
uses a Python command path and dry-run/validation semantics. Actual meeting audio
delivery is not proven.

### Classification

`PARTIAL`

### Proof

`LOCAL PROOF REQUIRED`

### Next change

Preserve these owners. Reuse the packaged helper/runtime rather than creating
another Python prerequisite, connect actual translated TTS output to the selected
route, and prove delivery on supported Windows meeting input.

## 7. History, Saved And Storage

### Current owners

```text
EngineData/Frontend/RustApp/src-tauri/src/engine/session_chat.rs
EngineData/Frontend/RustApp/src-tauri/src/engine/session_store.rs
EngineData/Frontend/RustApp/src-tauri/src/engine/transcript_session.rs
UserData/CacheData
UserData/LogData
UserData/SavedProject
```

### Current behavior

- transcript/session JSON save support exists;
- optional saved audio planning exists;
- chat session files are written under `SavedProject/Chat`, including unsaved/new
  session concepts;
- complete History search/delete/clear/disable behavior is not implemented as the
  approved product contract.

### Classification

`PARTIAL / STALE SEMANTICS`

### Next change

Keep the existing three `UserData` roots. Establish automatic History as its own
semantic store inside the existing ownership model, preserve explicit Saved
semantics, and add the approved controls. Do not add another top-level storage root.

## 8. Document Translation

### Current owners

Current source only owns quick text attachment ingestion through:

```text
EngineData/Backend/RuntimeContracts/ATTACHMENT_RUNTIME_CONTRACT.json
EngineData/Frontend/RustApp/src/app/active-launcher/launcherAttachmentRules.ts
EngineData/Frontend/RustApp/src/app/simple-launcher/SimpleLauncherController.ts
```

### Current behavior

Accepted text-like files are read through `file.text()`, compacted, and placed into
the normal text composer. `.docx` and PDF are explicitly unsupported until backend
parsing exists.

There is no current first-class document parser/chunker/export owner.

### Classification

`MISSING`

### Next change

Create one document-workflow owner that reuses the existing translation command and
runtime. Keep format parsing/export isolated from translation inference. Do not
create a document-specific translation engine.

## 9. Audio Studio

### Current owners

```text
EngineData/Frontend/RustApp/src-tauri/src/commands/audio_studio.rs
EngineData/Frontend/RustApp/src/app/shared/audioStudioTypes.ts
EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_* contracts
```

### Current behavior

Take/project metadata can be staged, listed, updated, and exported under UserData.
Provider status is explicitly blocked for guided capture, real quality scoring,
profile processing, generated voice, and streaming.

### Classification

`PARTIAL / POST-CORE`

### Next change

No core-release implementation work yet. Preserve current metadata owner and defer
provider/profile work until primary meeting/text/document path is aligned and
proven.

## 10. Installer, Package And Runtime Assets

### Current owners

```text
EngineData/Frontend/RustApp/src-tauri/tauri.conf.json
EngineData/Frontend/RustApp/scripts/validate_tauri_package_preflight.mjs
EngineData/Frontend/RustApp/src-tauri/src/engine/paths.rs
EngineData/Frontend/RustApp/src-tauri/src/commands/bridge_paths.rs
EngineData/Backend/RuntimeAssets/*
```

### Current behavior

- Tauri targets Windows NSIS;
- package preflight validates preparation, not a full installer;
- runtime path discovery expects repository-like `EngineData`/`UserData` markers;
- helper lookup allows worker `.venv`, environment override, or system Python;
- large models/Piper runtime and `.venv` are intentionally outside Git;
- current config does not prove those runtime assets are bundled as installed
  resources/sidecars.

### Classification

`PARTIAL / STALE PACKAGING ASSUMPTIONS`

### Proof

Clean supported-Windows proof required.

### Next change

Keep NSIS/Tauri as the package direction. Define release-build inputs/resources so
installed TranslateIT owns its helper runtime and core assets and no longer depends
on repository-root discovery or system Python for normal operation.

## Cross-Cutting Ownership Decisions

### Keep

These existing owners are useful and should be extended rather than replaced:

```text
SimpleLauncherController / current shell
runtimeProductFacade
translate_text command
RuntimeSettings
capture/audio modules
helper worker runtime
virtual route commands
UserData roots
Audio Studio metadata command
Tauri NSIS package direction
```

### Reconcile / retire when superseded

```text
text-first product hierarchy
normal-user helper/worker controls
Fast naming
capture_lifecycle direct Python orchestration when unified helper path replaces it
unsaved chat data written with Saved semantics
repo-root/system-Python assumptions in installed builds
```

### Missing current implementation owners

```text
first-class document workflow
fully applied translation tone/context contract
approved automatic History semantics and controls
product-level automatic meeting setup orchestration
self-contained installed runtime resource mapping
```

## Minimum Development Sequence Derived From Ownership

The source map supports this order without introducing a new architecture:

### Slice 1 — Product Shell And Readiness Boundary

Align the active `SimpleLauncherController` shell with the approved Meeting-first
navigation/readiness hierarchy while preserving current runtime behavior.

Includes:

- Meeting/Text/Documents/History/Saved/Settings hierarchy;
- move Developer under Advanced;
- hide normal helper/worker controls behind product-level setup actions;
- rename `Fast` -> `Realtime`;
- keep Diagnostics accessible.

This slice is mainly frontend/product-boundary alignment and is the smallest safe
first Developing task.

### Slice 2 — Canonical Settings Contract

Extend existing `RuntimeSettings` for approved product settings that are currently
missing, especially tone, voice-input mode, History/privacy, and relevant product
preferences.

### Slice 3 — Unified Meeting Runtime Orchestration

Reconcile helper ownership, eliminate permanent duplicate direct-Python pipeline
execution, then implement Session Listening/natural segmentation through the
single runtime path.

### Slice 4 — Translation Context And Tone

Pass approved tone/context through the canonical translation request into real
local inference and validate quality.

### Slice 5 — Meeting Audio Route

Connect translated TTS to the existing virtual-route owner and obtain Windows
meeting-input proof.

### Slice 6 — History / Saved

Align persistence semantics and user controls under existing `UserData` roots.

### Slice 7 — First-Class Document Translation

Add parser/chunk/export workflow that reuses the established translation runtime.

### Slice 8 — Internal Self-Contained Package

Package the proven core runtime/assets and validate on clean Windows.

### Post-Core — Audio Studio

Implement authorized custom-voice profile generation only after the core release
path is stable.

## Evidence Boundary

This map is **source ownership evidence**, not target-PC success evidence.

Live proof is still required for microphone capture, model quality, translation
tone/context quality, TTS, CUDA performance, virtual meeting routing, latency,
persistence behavior, document parsing/export, Audio Studio profile generation,
and installer behavior where applicable.

## Related

- `AGENTS.md`
- `CONTEXT.md`
- `docs/foundation/01-product-overview.md`
- `docs/foundation/02-product-requirements.md`
- `docs/knowledge/next-action.md`
