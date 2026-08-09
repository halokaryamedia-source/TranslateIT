# TranslateIT — Source Ownership And Reconciliation Map

**Status:** current source map  
**Updated:** 2026-08-09  
**Branch:** `New`

This file maps approved product boundaries to current semantic/source ownership. It
is not a backlog, task log, or runtime-readiness report.

Status vocabulary:

```text
ALIGNED  -> current source ownership/behavior substantially matches policy
PARTIAL  -> useful owner exists but behavior/contract is incomplete
MISSING  -> approved capability has no complete current implementation owner
STALE    -> current source still expresses superseded behavior
RETIRED  -> inherited/current source concept is no longer approved product scope
```

Proof vocabulary follows root `AGENTS.md`. Source-side alignment does not promote
runtime/device/rendered/package claims beyond the evidence actually obtained.

## Executive Ownership Map

| Boundary | Current owner(s) | Requirement IDs | Status | Proof | Smallest later reconciliation |
|---|---|---|---|---|---|
| Product shell/navigation | `src/main.ts`, `SimpleLauncherController.ts`, current shell/settings helpers | PR-160–175 | **PARTIAL** | static source | Approved top-level `Meeting / Text / History / Settings` is now aligned; final Settings hierarchy, global Meeting strip, setup shell, and approved workspace compositions remain later slices. |
| Product readiness/setup | `runtimeProductFacade.ts`, `SimpleLauncherController` | PR-025–029, PR-055, PR-163–174 | **PARTIAL / STALE SEMANTICS** | static source; local proof later | Preserve product-level readiness owner, then extend it to approved transactional Start, optional incoming degradation, device verification, scoped recovery, and first-use setup semantics. |
| Text translation | `commands/text_translate.rs`, translation engine, Python worker | PR-021, PR-040–052, PR-092–097 | **PARTIAL** | static source; runtime quality proof later | Extend approved tone/context/request-authority behavior through the existing translation path; remove residual file-attachment/document-like UI when Text composition is reconciled. |
| Meeting voice capture/pipeline | `engine/capture_lifecycle.rs`, `engine/audio/*`, runtime capture/pipeline commands | PR-022, PR-030–039, PR-053–059 | **PARTIAL / STALE OWNERSHIP** | local proof required | Reconcile one runtime/helper orchestration owner, then implement Session Listening, generation-safe utterances, concurrent capture/output, bounded backlog, and Stop semantics. |
| Translation context/tone | runtime settings + context/translation adapters | PR-040–049 | **PARTIAL / MISSING** | static source; quality proof later | Make tone and bounded committed Meeting context reach actual inference without History leakage. |
| Meeting audio route | virtual-route Rust commands + local provider | PR-070–079 | **PARTIAL** | **LOCAL PROOF REQUIRED** | Preserve the managed route owner; later prove translated TTS delivery, self-output suppression, and safe route/device recovery on Windows. |
| Incoming Meeting assistance | capture/audio/runtime pipeline owners | PR-023, PR-076–079 | **PARTIAL / MISSING SEMANTICS** | local proof required | Separate Meeting Sound/incoming processing from outbound capture and add optional/degradable behavior, freshness, and self-output suppression. |
| History / Saved / storage | existing session/storage modules + `UserData/*` | PR-080–097, PR-175 | **PARTIAL / STALE SEMANTICS** | static source; persistence proof later | Separate automatic Recent History from explicit durable Saved while presenting Saved under History rather than as top-level navigation. |
| Document translation | residual quick text-attachment/document-era source only | PR-003, PR-100 | **RETIRED / RESIDUAL STALE SOURCE** | current source/policy | Top-level Documents is removed from the active shell; later remove/fold remaining document-like attachment source that conflicts with the approved paste/type-only Text workflow. |
| Settings | current settings views/renderers/actions | PR-170–174 | **STALE / PARTIAL** | static source | Converge normal Settings on Meeting / History & Privacy / Advanced; remove duplicate General/Translation responsibilities unless still required by an approved contextual owner. |
| Audio Studio | Audio Studio command/contracts + explicit frontend entry | PR-120–129 | **PARTIAL / POST-CORE** | metadata/source only; provider proof later | Preserve current entry/metadata ownership; defer provider/profile completion until core paths are aligned. |
| Installer/package/runtime assets | Tauri config/preflight + paths/assets owners | PR-140–149 | **PARTIAL / STALE PACKAGING ASSUMPTIONS** | clean-machine proof later | Package helper/runtime/assets explicitly and remove installed-build dependence on repo-root/system Python. |

## 1. Product Shell And Navigation

Current production entry graph:

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

The active top-level shell now exposes only:

```text
Meeting
Text
History
Settings
```

`Documents` and top-level `Saved` were removed from the active sidebar and workspace
contract. `SimpleLauncherController` now accepts only `meeting`, `text`, and
`history` as normal workspaces; Settings remains the existing separate shell path.
Saved is still an approved distinct data ownership concept but must later be
presented inside History, not reintroduced as a top-level workspace.

The current Settings internals still use the older General / Translation / Audio /
Advanced hierarchy, and the shell/workspace compositions still predate the final
approved visual design. Therefore the overall shell boundary is not fully aligned
yet.

Classification: **PARTIAL**.

The explicit Audio Studio HTML entry remains reachable. Reachability does not prove
Audio Studio product completeness.

## 2. Product Readiness And Setup

Current owners:

```text
src/app/bridge/runtimeProductFacade.ts
src/app/simple-launcher/SimpleLauncherController.ts
```

These remain the correct product-level readiness boundary, but the approved user
flow now requires more than the earlier shell mapping:

- guided first-use setup for microphone, Meeting Sound, Meeting Microphone, and local
  translation readiness;
- intentional `Set up later` without pretending setup succeeded;
- returning quick preflight and resume from verified interrupted setup progress;
- core-outbound `Ready` with optional incoming degradation;
- atomic `Start Translation` commit;
- verified device changes before replacing working preferences;
- scoped product recovery rather than raw subsystem controls.

Classification: **PARTIAL / STALE SEMANTICS**. Actual Windows transitions remain
**LOCAL PROOF REQUIRED**.

## 3. Text Translation Runtime

Current owners:

```text
src-tauri/src/commands/text_translate.rs
src-tauri/src/engine/manual_translation_accelerated.rs
EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker*.py
```

User-facing path remains:

```text
SimpleLauncherController
-> runtimeProductFacade
-> runtimeApi.translateText
-> Rust translate_text
-> canonical local translation runtime
```

Approved Text behavior now includes explicit Translate, Quality default, Auto/Formal/
Casual, request authority, outdated-result handling, editable target, no silent
truncation, and strict context isolation from Meeting/History. The current shell
still exposes residual text-file attachment behavior that is not part of the final
paste/type-only Text composition and must be reconciled in the later Text slice.

Classification: **PARTIAL**.

## 4. Meeting Voice Capture, Outbound And Coordination

Current owners:

```text
src-tauri/src/engine/capture_lifecycle.rs
src-tauri/src/engine/audio/*
src-tauri/src/commands/runtime_capture.rs
src-tauri/src/commands/pipeline*.rs
src-tauri/src/engine/adapters/*pipeline*logic.rs
src-tauri/src/engine/adapters/*asr*logic.rs
```

Current ownership still contains duplicated AI orchestration: Text may use the
long-running helper bridge while capture-stop processing can launch direct Python
worker execution. Capture semantics are also closer to explicit start/stop than the
approved continuous Session Listening model.

Approved behavior additionally requires:

- partial versus committed ASR boundary;
- session/generation/utterance identity;
- concurrent capture while TTS speaks;
- serialized at-most-once outbound delivery;
- bounded backlog and current-output interruption;
- conversation-aware `WAITING_FOR_TURN` behavior;
- bounded recovery and strong Stop invalidation.

Classification: **PARTIAL / STALE OWNERSHIP**.

## 5. Translation Context And Tone

Current owners include runtime settings, context/translation adapters, and current
frontend settings.

A context-window mechanism exists, but current source does not prove approved
meaning/tone behavior reaches inference or that committed Meeting turn ordering and
failed/canceled turn exclusion are implemented.

Classification: **PARTIAL / MISSING**.

## 6. Meeting Audio Route And Incoming Assistance

Current route owners:

```text
src-tauri/src/commands/virtual_mic_route.rs
src-tauri/src/commands/virtual_audio_route_runtime.rs
EngineData/Backend/LocalWorker/WorkerRuntime/virtual_audio_route_provider.py
```

The old unmounted frontend route-selection surface is retired. Current approved
product route remains a managed `TranslateIT Meeting Microphone`, not a generic
normal-user routing control.

Incoming assistance is approved as an independent Meeting Sound lane with Indonesian
text output, optional/degradable readiness, transient partial subtitles, source
truthfulness, bounded freshness, and mandatory prevention of TranslateIT's own TTS
being treated as remote speech.

Classification: route **PARTIAL**; incoming semantics **PARTIAL / MISSING**. Actual
Windows delivery/capture/self-suppression remains **LOCAL PROOF REQUIRED**.

## 7. History, Saved And Storage

Current owners remain existing session/storage modules and:

```text
UserData/CacheData
UserData/LogData
UserData/SavedProject
```

Approved semantics:

```text
History
├─ Recent   -> automatic Meeting/Text activity when enabled
└─ Saved    -> explicit durable Meeting/Text user work
```

Saved is a distinct ownership/lifetime even though its normal UI lives inside
History. Clear/delete History cannot delete Saved; deleting Saved cannot delete
History. History off affects future/current retention without deleting old History.
Search is local retrieval and never automatic model context.

The top-level Saved shell entry is now removed, but the nested History/Saved
collection/detail behavior and durability contracts remain incomplete.

Classification: **PARTIAL / STALE SEMANTICS**.

## 8. Document Translation

First-class Document Translation is **removed from current product scope**.

The active shell no longer contains a Documents navigation destination or Documents
workspace panel. Residual quick text-attachment/document-era source must not be
promoted into a parser/export/job architecture and should be removed or folded when
the approved Text workspace is reconciled.

Classification: **RETIRED / RESIDUAL STALE SOURCE**.

## 9. Settings

Current owners:

```text
src/app/active-launcher/settingsViews.ts
src/app/active-launcher/launcherSettingsRenderer.ts
src/app/active-launcher/launcherSettingsActions.ts
SimpleLauncherController
```

Approved normal hierarchy:

```text
Meeting
History & Privacy
Advanced
```

Meeting owns speaking mode, physical microphone, Meeting Sound, managed Meeting
Microphone setup/check, and scoped recovery. History & Privacy owns History policy,
storage information, Saved information, and Clear History. Advanced owns setup
health and Developer Diagnostics.

`General` and `Translation` are not separate normal Settings responsibilities unless
a future product decision creates a distinct need. Contextual tone/mode/language
choices belong in Meeting/Text instead of being duplicated globally.

Classification: **STALE / PARTIAL**.

## 10. Audio Studio

Current backend metadata/contracts remain, and `index.html -> audioStudioEntry.ts`
is an explicit frontend build entry. Current bindings remain reachable but do not
prove a complete experience.

Classification: **PARTIAL / POST-CORE**.

## 11. Installer, Package And Runtime Assets

Tauri/NSIS direction exists, but helper/runtime resource mapping still includes
development/repository/system-Python assumptions and clean installed completeness is
not proven.

Classification: **PARTIAL / STALE PACKAGING ASSUMPTIONS**.

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

### Retired / stale concepts

```text
Documents product workflow -> removed from active shell; residual attachment-era source only
top-level Saved navigation -> removed from active shell
General/Translation as duplicated normal Settings hierarchy -> still active/stale
parallel LauncherController
legacy event/readiness/helper/device/watch binding stack
unmounted generic virtual-route selection UI
normal-user Start Helper / Check Worker controls
Fast user-facing mode naming
```

### Still requires later reconciliation

```text
approved Settings hierarchy
final Meeting Ready/Live composition and global Meeting strip
first-use Setup Wizard / intentional defer semantics
final Text source/target composition and attachment cleanup
History Recent versus Saved semantics and detail surfaces
capture_lifecycle direct Python orchestration versus unified helper owner
approved Session Listening / utterance / delivery / turn coordination
incoming Meeting Sound lane and self-output suppression
atomic Start / bounded recovery / Stop finalization
approved tone/context inference contract
repo-root/system-Python installed-build assumptions
```

## Source-Side Development Order

The project is now in **Developing** mode for bounded ChatGPT -> GitHub source work
before the dedicated local Windows acceptance phase.

Completed source slice:

```text
active top-level shell/navigation reconciliation
-> Meeting / Text / History / Settings only
-> Documents and top-level Saved removed from active shell/workspace contract
```

Do not broaden one slice into all remaining UI/runtime work. `docs/knowledge/next-action.md`
owns the next bounded source step and must be updated after each material slice.
