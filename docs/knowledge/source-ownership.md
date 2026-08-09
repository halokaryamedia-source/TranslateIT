# TranslateIT — Source Ownership And Reconciliation Map

**Status:** current source map  
**Updated:** 2026-08-09  
**Branch:** `New`

This file maps approved product boundaries to current semantic/source ownership. It is not a backlog, task log, or runtime-readiness report.

Status vocabulary:

```text
ALIGNED  -> current source ownership/behavior substantially matches policy
PARTIAL  -> useful owner exists but behavior/contract is incomplete
MISSING  -> approved capability has no complete current implementation owner
STALE    -> current source still expresses superseded behavior
```

Proof vocabulary follows root `AGENTS.md`. Source-side alignment does not promote runtime/device/rendered/package claims beyond the evidence actually obtained.

## Executive Ownership Map

| Boundary | Current owner(s) | Requirement IDs | Status | Proof | Smallest next change |
|---|---|---|---|---|---|
| Product shell/navigation | `src/main.ts`, `SimpleLauncherController.ts`, current shell/settings helpers | PR-001–004, PR-160–169 | **ALIGNED (SOURCE)** | static source; rendered proof later | Preserve the single active shell while continuing independent source-side boundaries. |
| Product readiness/setup | `runtimeProductFacade.ts`, `SimpleLauncherController` | PR-163–168 | **ALIGNED (SOURCE)** | static source; local runtime proof later | Preserve product-level recovery/readiness mapping while underlying capabilities are reconciled. |
| Text translation | `commands/text_translate.rs`, translation engine, Python worker | PR-020–024, PR-040–052 | **PARTIAL** | static source; runtime quality proof required | Extend approved tone/context through the existing translation path. |
| Meeting voice capture/pipeline | `engine/capture_lifecycle.rs`, `engine/audio/*`, runtime capture/pipeline commands | PR-030–034, PR-050–054, PR-022 | **PARTIAL / STALE OWNERSHIP** | local proof required | Reconcile one helper/runtime orchestration owner, then implement Session Listening/natural segmentation. |
| Translation context/tone/settings | runtime settings + context/translation adapters + frontend settings | PR-040–047, PR-050–052 | **PARTIAL / MISSING** | static source; quality proof required | Extend the canonical settings/request contract and make tone/context reach actual inference. |
| Meeting audio route | virtual route Rust commands + local provider | PR-070–075, PR-145 | **PARTIAL** | **LOCAL PROOF REQUIRED** | Preserve the route owner; connect translated TTS through the canonical runtime and later prove Windows meeting delivery. |
| History / Saved / storage | session storage owners + `UserData/*` | PR-080–091 | **PARTIAL / STALE SEMANTICS** | static source; persistence proof required | Separate automatic History from explicit Saved inside existing roots. |
| Document translation | quick attachment path only | PR-100–109 | **MISSING** | current source proves only text attachment ingestion | Add one document workflow owner that reuses the existing translation runtime. |
| Audio Studio | Audio Studio command/contracts + explicit frontend entry | PR-120–129 | **PARTIAL / POST-CORE** | metadata/source only; provider proof required | Preserve current entry/metadata ownership; defer provider/profile completion until core paths are aligned. |
| Installer/package/runtime assets | Tauri config/preflight + paths/assets owners | PR-140–149 | **PARTIAL / STALE PACKAGING ASSUMPTIONS** | clean-machine proof required | Package helper/runtime/assets explicitly and remove installed-build dependence on repo-root/system Python. |

## 1. Product Shell And Navigation

### Current production entry graph

```text
EngineData/Frontend/RustApp/index.html
├─ src/main.ts
│  -> SimpleLauncherController
│  -> shell/settings/result/startup/window helpers
│
└─ src/audioStudioEntry.ts
   -> Audio Studio theme/binding entry
```

Primary shell owners:

```text
src/main.ts
src/app/simple-launcher/SimpleLauncherController.ts
src/app/active-launcher/shell.ts
src/app/active-launcher/lockedReferenceShellParts.ts
src/app/active-launcher/settingsViews.ts
src/app/active-launcher/launcherSettingsRenderer.ts
```

Current static source:

- keeps `SimpleLauncherController` as the only primary desktop controller started by `main.ts`;
- presents `Meeting / Text / Documents / History / Saved / Settings` with Meeting primary;
- keeps Text as the current standalone translation surface;
- keeps Documents, History, and Saved truthful until their own implementations exist;
- exposes Developer Diagnostics under Settings -> Advanced;
- uses `Realtime / Quality` naming;
- does not expose `Start Helper` / `Check Worker` as normal shell controls;
- no longer keeps the old parallel `LauncherController` and its binding/watch/route stack as current source.

The explicit Audio Studio HTML entry remains separate and currently loads its theme and binding stubs. That proves reachability only; it does not prove Audio Studio product completeness.

Classification: **ALIGNED (SOURCE)**.

Proof: **CURRENT-PROJECT VERIFIED** for repository/source ownership and direct entry wiring. Rendered/Tauri behavior remains **LOCAL PROOF REQUIRED** for the later acceptance phase.

## 2. Product Readiness And Setup

Current owners:

```text
src/app/bridge/runtimeProductFacade.ts
src/app/simple-launcher/SimpleLauncherController.ts
```

Current source maps normal Meeting readiness from existing runtime evidence plus meeting-route readiness, keeps engineering details in diagnostics, and exposes normal recovery as `Retry`, `Fix Setup`, and `Open Diagnostics`.

Classification: **ALIGNED (SOURCE)**.

Actual Windows readiness transitions remain **LOCAL PROOF REQUIRED**. Missing local proof does not block unrelated source-side work during the current project phase.

## 3. Text Translation Runtime

Current owners:

```text
src-tauri/src/commands/text_translate.rs
src-tauri/src/engine/manual_translation_accelerated.rs
EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker*.py
```

The user-facing path remains:

```text
SimpleLauncherController
-> runtimeProductFacade
-> runtimeApi.translateText
-> Rust translate_text
-> canonical local translation runtime
```

The retired preview-translation stub is no longer a current source/validation dependency.

Classification: **PARTIAL** because approved tone/context semantics are not complete end-to-end.

## 4. Meeting Voice Capture And Pipeline

Current owners:

```text
src-tauri/src/engine/capture_lifecycle.rs
src-tauri/src/engine/audio/*
src-tauri/src/commands/runtime_capture.rs
src-tauri/src/commands/pipeline*.rs
src-tauri/src/engine/adapters/*pipeline*logic.rs
src-tauri/src/engine/adapters/*asr*logic.rs
```

Current ownership still contains duplicated AI orchestration: Text may use the long-running helper bridge while capture-stop processing can launch direct Python worker execution. Capture semantics are also closer to explicit start/stop than approved continuous Session Listening with natural segmentation.

Classification: **PARTIAL / STALE OWNERSHIP**.

Next semantic work: establish one runtime/helper orchestration authority, then implement Session Listening/VAD behavior on that owner.

## 5. Translation Context, Tone And Settings

Current owners include runtime settings, context/translation adapters, and current frontend Translation settings.

Current settings/request contracts still lack complete canonical tone, Session Listening/PTT, and History/privacy semantics. A context-window mechanism exists, but current source does not prove approved context/tone meaningfully affects actual inference.

Classification: **PARTIAL / MISSING**.

## 6. Meeting Audio Route

Current owners:

```text
src-tauri/src/commands/virtual_mic_route.rs
src-tauri/src/commands/virtual_audio_route_runtime.rs
EngineData/Backend/LocalWorker/WorkerRuntime/virtual_audio_route_provider.py
```

The old unmounted frontend virtual-route selection surface and its binding stack are retired. Current frontend product ownership is the readiness mapping in `runtimeProductFacade`; detailed route/device mechanics remain owned by the Rust/provider boundary rather than a parallel UI subsystem.

Current source validation checks this engine/provider/product-readiness boundary and no longer depends on historical `DevelopingData` notes.

Classification: **PARTIAL**. Actual Windows meeting delivery remains **LOCAL PROOF REQUIRED**.

## 7. History, Saved And Storage

Current owners remain the existing session/storage modules and:

```text
UserData/CacheData
UserData/LogData
UserData/SavedProject
```

Current semantics do not yet fully separate automatic History from explicit Saved or provide the approved search/delete/clear/disable contract.

Classification: **PARTIAL / STALE SEMANTICS**.

## 8. Document Translation

Current source provides quick text attachment ingestion only. There is no complete first-class DOCX/PDF/SRT/VTT parse/chunk/translate/export owner.

Classification: **MISSING**.

A future document workflow must reuse the canonical translation runtime rather than create a second translation engine.

## 9. Audio Studio

Current backend metadata/contracts remain, and `index.html -> audioStudioEntry.ts` is an explicit frontend build entry. The current binding pair is retained because it has a real caller, even though the bindings themselves do not prove a complete Audio Studio experience.

Guided capture, provider evaluation, profile generation, quality/readiness, and custom voice behavior remain incomplete/unproven.

Classification: **PARTIAL / POST-CORE**.

## 10. Installer, Package And Runtime Assets

Tauri/NSIS direction exists, but helper/runtime resource mapping still includes development/repository/system-Python assumptions and clean installed completeness is not proven.

Classification: **PARTIAL / STALE PACKAGING ASSUMPTIONS**. Clean supported-Windows proof is required later.

## Cross-Cutting Ownership State

### Keep / extend

```text
SimpleLauncherController / current shell
runtimeProductFacade
runtimeApi
translate_text command
RuntimeSettings
capture/audio modules
helper worker runtime
virtual route Rust/provider owners
UserData roots
Audio Studio explicit entry + backend metadata contracts
Tauri NSIS package direction
```

### Retired from current frontend ownership

```text
parallel LauncherController
legacy event/readiness/helper/device/watch binding stack
disabled preview-translation stub
unmounted virtual-route selection surface/bindings
legacy action-binding diagnostic report
text-first primary hierarchy
normal-user Start Helper / Check Worker controls
Fast user-facing mode naming
Developer as normal primary navigation
```

### Still requires later reconciliation

```text
capture_lifecycle direct Python orchestration versus unified helper owner
approved settings/tone/context contract
History versus Saved semantics
repo-root/system-Python installed-build assumptions
```

### Missing/incomplete semantic capabilities

```text
first-class document workflow
fully applied translation tone/context
approved automatic History semantics and controls
self-contained installed runtime resource mapping
```

## Source-Side Development Order

The project is currently completing bounded work that can be proved through ChatGPT -> GitHub before the dedicated local Windows acceptance phase.

Source slices are not blocked merely because a prior independent slice still has rendered/runtime proof pending. Acceptance criteria are not lowered: rendered UI, Windows runtime, microphone/audio/model behavior, CUDA performance, meeting-route delivery, latency, and clean-machine packaging remain `LOCAL PROOF REQUIRED` until the later local phase.

Current continuation is owned only by `docs/knowledge/next-action.md`.
