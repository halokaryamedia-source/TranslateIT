# TranslateIT — Source Ownership And Reconciliation Map

**Status:** current source map  
**Updated:** 2026-08-09  
**Branch:** `New`

This note maps approved product boundaries to current semantic/source ownership. It is not a backlog, implementation plan, or runtime-readiness report.

Status vocabulary:

```text
ALIGNED  -> current source ownership/behavior substantially matches policy
PARTIAL  -> useful owner exists but behavior/contract is incomplete
MISSING  -> approved capability has no complete current implementation owner
STALE    -> current source still expresses superseded behavior
```

Proof vocabulary follows root `AGENTS.md`.

## Executive Ownership Map

| Boundary | Current owner(s) | Requirement IDs | Status | Proof | Smallest next change |
|---|---|---|---|---|---|
| Product shell/navigation | `src/main.ts`, `SimpleLauncherController.ts`, `lockedReferenceShellParts.ts`, `settingsViews.ts` | PR-001–004, PR-160–169 | **ALIGNED (SOURCE)** | static source; rendered proof required | Run targeted local/rendered shell verification before advancing. |
| Product readiness/setup | `runtimeProductFacade.ts`, `SimpleLauncherController.refreshReadiness/fixSetup` | PR-163–168 | **ALIGNED (SOURCE)** | static source; local runtime proof required | Verify rendered recovery flow and readiness transitions on Windows. |
| Text translation | `commands/text_translate.rs`, `engine::manual_translation_accelerated`, Python worker | PR-020–024, PR-040–052 | **PARTIAL** | static source; runtime quality proof required | Preserve current command owner; add approved tone/context through the same request path after settings alignment. |
| Meeting voice capture/pipeline | `engine/capture_lifecycle.rs`, `engine/audio/*`, `commands/runtime_capture.rs`, pipeline/handoff adapters | PR-030–034, PR-050–054, PR-022 | **PARTIAL / STALE OWNERSHIP** | local proof required | Reconcile one helper/runtime orchestration owner, then implement Session Listening/natural segmentation. |
| Translation context/tone/settings | `engine/settings.rs`, `engine/runtime_settings.rs`, context/translation adapters, frontend settings | PR-040–047, PR-050–052 | **PARTIAL / MISSING** | static source; quality proof required | Extend canonical settings/request contract; prove context/tone affect real local inference. |
| Meeting audio route | `commands/virtual_mic_route.rs`, `commands/virtual_audio_route_runtime.rs`, `virtual_audio_route_provider.py` | PR-070–075, PR-145 | **PARTIAL** | **LOCAL PROOF REQUIRED** | Keep existing route owner; connect actual translated TTS and prove Windows meeting delivery. |
| History / Saved / storage | `engine/session_chat.rs`, `engine/session_store.rs`, `engine/transcript_session.rs`, `UserData/*` | PR-080–091 | **PARTIAL / STALE SEMANTICS** | static source; persistence proof required | Separate automatic History from explicit Saved inside existing roots. |
| Document translation | attachment rules/contract + Text composer only | PR-100–109 | **MISSING** | current source proves only quick text attachment | Add one first-class document workflow owner reusing the existing translation runtime. |
| Audio Studio | `commands/audio_studio.rs`, `shared/audioStudioTypes.ts`, Audio Studio contracts | PR-120–129 | **PARTIAL / POST-CORE** | metadata source only; provider proof required | Preserve metadata owner; defer provider/profile work until core paths are aligned. |
| Installer/package/runtime assets | `tauri.conf.json`, package preflight, `engine/paths.rs`, `bridge_paths.rs`, `RuntimeAssets/*` | PR-140–149 | **PARTIAL / STALE PACKAGING ASSUMPTIONS** | clean-machine proof required | Package helper/runtime/assets explicitly and remove installed-build dependence on repo-root/system Python. |

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

Current static source now:

- keeps `SimpleLauncherController` as the active controller from `main.ts`;
- presents `Meeting / Text / Documents / History / Saved / Settings`;
- opens Meeting as the default/primary workspace;
- keeps Text as a usable standalone translation surface;
- presents Documents, History, and Saved truthfully as unavailable until their own implementations are connected;
- exposes Developer Diagnostics under Settings -> Advanced instead of as a normal product workspace;
- uses canonical `Realtime / Quality` naming in the active Translation settings source;
- no longer exposes `Start Helper` / `Check Worker` as normal shell controls.

### Classification

`ALIGNED (SOURCE)`

### Proof boundary

**CURRENT-PROJECT VERIFIED** for current source ownership/wiring.  
**LOCAL PROOF REQUIRED** for rendered composition, responsive behavior, actual click navigation, and Tauri desktop behavior.

### Next change

No additional source change is justified before targeted local/rendered verification.

## 2. Product Readiness And Setup

### Current owners

```text
EngineData/Frontend/RustApp/src/app/bridge/runtimeProductFacade.ts
EngineData/Frontend/RustApp/src/app/simple-launcher/SimpleLauncherController.ts
```

### Current behavior

`runtimeProductFacade` remains the product-facing readiness owner. Current source:

- retains lower-level helper/model/microphone details for diagnostics/internal state;
- maps normal Meeting readiness from the existing live meeting runtime gate plus virtual-route readiness;
- does not treat helper/model/microphone presence alone as Meeting-ready;
- exposes normal recovery as `Retry`, `Fix Setup`, and `Open Diagnostics`;
- keeps detailed engineering controls in Developer Diagnostics;
- keeps normal Meeting notices product-level rather than surfacing raw technical blockers.

`Fix Setup` currently orchestrates existing setup capabilities; it does not replace or redesign the underlying runtime owners.

### Classification

`ALIGNED (SOURCE)`

### Proof boundary

**CURRENT-PROJECT VERIFIED** for source mapping and recovery wiring.  
**LOCAL PROOF REQUIRED** for actual Windows readiness transitions and rendered recovery behavior.

## 3. Text Translation Runtime

### Current owners

```text
EngineData/Frontend/RustApp/src-tauri/src/commands/text_translate.rs
EngineData/Frontend/RustApp/src-tauri/src/engine/manual_translation_accelerated.rs
EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker*.py
```

The canonical user-facing text command exists and Text remains wired through `runtimeProductFacade -> runtimeApi.translateText -> Rust translate_text`. Approved tone/context fields are still not complete end-to-end.

Classification: `PARTIAL`.

Next: extend existing settings/request/runtime contracts; do not create another translator.

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

Current ownership still contains duplicated orchestration: Text can use the long-running helper bridge while capture-stop processing can launch direct Python worker execution. Current capture semantics also remain closer to explicit start/stop than approved continuous Session Listening with natural segmentation.

Classification: `PARTIAL / STALE OWNERSHIP`.

Next: establish one runtime/helper orchestration authority, then implement Session Listening/VAD behavior on that owner.

## 5. Translation Context, Tone And Settings

### Current owners

```text
EngineData/Frontend/RustApp/src-tauri/src/engine/settings.rs
EngineData/Frontend/RustApp/src-tauri/src/engine/runtime_settings.rs
EngineData/Frontend/RustApp/src-tauri/src/engine/adapters/context_logic.rs
EngineData/Frontend/RustApp/src-tauri/src/engine/adapters/translation_logic.rs
frontend Translation settings
```

Current `RuntimeSettings` still lacks the full canonical tone, Session Listening/PTT, and History/privacy settings contract. A bounded context window exists, but current source does not prove that approved context/tone semantics shape real inference.

Classification: `PARTIAL / MISSING`.

Next: extend the existing settings schema and canonical translation request; prove actual inference behavior separately.

## 6. Meeting Audio Route

### Current owners

```text
EngineData/Frontend/RustApp/src-tauri/src/commands/virtual_mic_route.rs
EngineData/Frontend/RustApp/src-tauri/src/commands/virtual_audio_route_runtime.rs
EngineData/Backend/LocalWorker/WorkerRuntime/virtual_audio_route_provider.py
```

Source-side route discovery/provider handoff exists. Actual translated audio delivery to a Windows meeting input remains unproven.

Classification: `PARTIAL`.  
Proof: **LOCAL PROOF REQUIRED**.

Next: preserve these owners, connect actual TTS through the canonical packaged runtime, and prove delivery on Windows.

## 7. History, Saved And Storage

Current owners remain `session_chat`, `session_store`, `transcript_session`, and the existing `UserData/CacheData`, `UserData/LogData`, `UserData/SavedProject` roots.

Current semantics do not yet fully separate automatic History from explicit Saved or provide the approved search/delete/clear/disable contract.

Classification: `PARTIAL / STALE SEMANTICS`.

Next: implement the approved semantics without another top-level storage root.

## 8. Document Translation

Current source only provides quick text attachment ingestion. There is no complete first-class DOCX/PDF/SRT/VTT workflow owner for parse/chunk/translate/export.

Classification: `MISSING`.

Next: add one document workflow owner that reuses the existing translation runtime; format parsing/export must not become a second translation engine.

## 9. Audio Studio

Metadata commands/contracts exist, but guided capture, provider quality evaluation, profile building, and generated custom voice behavior are not complete/proven.

Classification: `PARTIAL / POST-CORE`.

Next: no core blocker; preserve current metadata ownership.

## 10. Installer, Package And Runtime Assets

Tauri/NSIS direction exists, but runtime path discovery and helper lookup still include development/repository/system-Python assumptions, and clean installed runtime completeness is not proven.

Classification: `PARTIAL / STALE PACKAGING ASSUMPTIONS`.

Proof: clean supported-Windows proof required.

Next: explicitly package the approved helper/runtime/models/assets and prove them on a clean target.

## Cross-Cutting Ownership State

### Keep / extend

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

### Retired from the active normal shell (static source)

```text
text-first primary product hierarchy
normal-user Start Helper / Check Worker controls
Fast user-facing mode naming
Developer as a normal product navigation surface
```

### Still requires later reconciliation

```text
capture_lifecycle direct Python orchestration when unified helper path supersedes it
unsaved chat data written with Saved semantics
repo-root/system-Python assumptions in installed builds
```

### Missing/incomplete semantic capabilities

```text
first-class document workflow
fully applied translation tone/context contract
approved automatic History semantics and controls
self-contained installed runtime resource mapping
```

## Development Sequence

### Slice 1 — Product Shell And Readiness Boundary

`SOURCE IMPLEMENTED / LOCAL PROOF REQUIRED`

Do not advance solely from static source proof. Targeted local/rendered desktop verification remains the acceptance gate.

### Slice 2 — Canonical Settings Contract

After Slice 1 local/rendered acceptance, extend `RuntimeSettings` for approved tone, voice-input mode, History/privacy, and relevant product preferences.

### Slice 3 — Unified Meeting Runtime Orchestration

Reconcile helper ownership and Session Listening/natural segmentation.

### Slice 4 — Translation Context And Tone

Pass and prove approved tone/context through real local inference.

### Slice 5 — Meeting Audio Route

Connect generated translated TTS to the existing route owner and prove Windows meeting delivery.

Later bounded slices continue with History/Saved, Documents, Audio Studio provider work, and release packaging according to product priority and proof availability.
