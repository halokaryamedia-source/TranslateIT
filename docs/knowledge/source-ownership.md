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

| Boundary | Current owner(s) | Status | Proof | Smallest later reconciliation |
|---|---|---|---|---|
| Product shell/navigation | `src/main.ts`, `SimpleLauncherController.ts`, `lockedReferenceShellParts.ts`, `shell.ts` | **ALIGNED / VISUAL PARTIAL** | static source | Top-level navigation is now `Meeting / Text / History / Settings`; rendered shell quality remains local proof later. |
| Settings hierarchy | `lockedReferenceShellParts.ts`, `launcherSettingsRenderer.ts`, `SimpleLauncherController.ts` | **ALIGNED HIERARCHY / PARTIAL CONTENT** | static source | Normal Settings now routes through `Meeting / History & Privacy / Advanced`; complete History persistence controls and verified device-selection behavior remain later slices. |
| Meeting Ready / product readiness | `runtimeProductFacade.ts`, `SimpleLauncherController.ts`, `lockedReferenceShellParts.ts`, `mainPageLayout.css` | **READY UI ALIGNED / RUNTIME PARTIAL** | static source; local proof later | Ready composition now matches approved hierarchy and uses truthful current microphone/route evidence; atomic Start, incoming lane, first-use setup, and Live lifecycle remain separate slices. |
| Text translation | `SimpleLauncherController.ts`, `runtimeProductFacade.ts`, Rust translation command/runtime | **PARTIAL** | static source; runtime quality proof later | Text owns reachable ID/EN direction swap; later align final two-pane composition, Quality/Tone semantics, result authority/editing, and remove out-of-scope file-attachment workflow. |
| Meeting voice capture/pipeline | Rust capture/audio/pipeline owners | **PARTIAL / STALE OWNERSHIP** | local proof required | Reconcile one runtime/helper orchestration owner, Session Listening, generation-safe utterances, bounded backlog, turn coordination, and Stop semantics. |
| Translation context/tone | runtime settings + context/translation adapters | **PARTIAL / MISSING** | static source; quality proof later | Make tone and bounded committed Meeting context reach actual inference without History leakage. |
| Meeting audio route | virtual-route Rust commands + local provider | **PARTIAL** | **LOCAL PROOF REQUIRED** | Preserve managed `TranslateIT Meeting Microphone`; prove delivery, self-output suppression, and safe recovery on Windows. |
| Incoming Meeting assistance | capture/audio/runtime pipeline owners | **PARTIAL / MISSING SEMANTICS** | local proof required | Separate Meeting Sound lane, optional/degradable behavior, freshness, and self-output suppression. |
| History / Saved / storage | existing session/storage modules + `UserData/*` | **PARTIAL / STALE SEMANTICS** | static source; persistence proof later | Implement automatic Recent History and explicit independent Saved under the unified History UI. |
| Document translation | residual quick text-attachment/document-era source only | **RETIRED** | current source/policy | Top-level Documents is gone; remove remaining Text file-attachment behavior when Text composition is reconciled. Do not build document infrastructure. |
| Audio Studio | explicit Audio Studio entry + backend metadata/contracts | **PARTIAL / POST-CORE** | source only; provider proof later | Preserve reachability; defer provider/profile completion until core paths are aligned. |
| Installer/package/runtime assets | Tauri config/preflight + paths/assets owners | **PARTIAL / STALE PACKAGING ASSUMPTIONS** | clean-machine proof later | Package helper/runtime/assets explicitly and remove repo-root/system-Python installed-build assumptions. |

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

Current top-level product shell is source-aligned to:

```text
Meeting
Text
History
Settings
```

`Documents` and top-level `Saved` are no longer mounted as active navigation or
workspace panels. `ProductWorkspace` accepts only `meeting`, `text`, and `history`;
Settings remains the fourth destination through the same controller/shell path.

Classification: **ALIGNED / VISUAL PARTIAL**.

## 2. Settings

Current normal Settings owners:

```text
src/app/active-launcher/lockedReferenceShellParts.ts
src/app/active-launcher/launcherSettingsRenderer.ts
src/app/simple-launcher/SimpleLauncherController.ts
```

Current normal hierarchy is now:

```text
Meeting
History & Privacy
Advanced
    -> Diagnostics
```

Source behavior now reflects the approved responsibility split:

- `Meeting` presents product-level meeting preference/setup rows and existing
  microphone/setup actions;
- `History & Privacy` is present without fake persistence or destructive controls;
  real History/Saved storage behavior remains a later bounded slice;
- `Advanced` is a product-level setup-health landing and `Open Diagnostics` is the
  explicit nested entry to the existing technical diagnostics view;
- inherited `General`, global `Translation`, and standalone `Audio` tabs are no
  longer reachable through normal Settings routing.

Text language direction was not silently lost when global Translation Settings was
removed: Text owns a direct Indonesian/English swap action persisted through the
existing settings command. Meeting keeps its fixed initial ID -> EN outbound
direction independently.

Older helpers in `settingsViews.ts` may still contain inherited General/Translation/
Audio rendering code, but they are no longer the normal active Settings route.
Remove them only when a bounded reachability cleanup proves no remaining consumer.

Classification: **ALIGNED HIERARCHY / PARTIAL CONTENT**.

## 3. Meeting Ready And Product Readiness

Current owners:

```text
src/app/bridge/runtimeProductFacade.ts
src/app/simple-launcher/SimpleLauncherController.ts
src/app/active-launcher/lockedReferenceShellParts.ts
src/mainPageLayout.css
```

The active Meeting Ready surface now follows the approved user hierarchy:

```text
readiness
-> plain-language ID -> EN voice / EN -> ID text behavior
-> Your microphone
-> Incoming translation / Meeting sound
-> managed TranslateIT Meeting Microphone
-> Realtime / Auto
-> Start Translation boundary
-> meeting-app microphone reminder
```

Current readiness is not fabricated:

- overall Meeting, microphone, and managed-route status come from the existing
  `runtimeProductFacade` snapshot/current input evidence;
- configured Meeting sound is presented from the existing settings preference;
- the approved incoming lane is explicitly shown as `Not connected yet` rather than
  pretending the missing incoming implementation is Ready;
- `Start Translation` is intentionally present but disabled because the approved
  atomic live-session Start lifecycle is not connected yet;
- normal Meeting no longer exposes Developer Diagnostics as a competing primary
  action; Diagnostics remains under Settings -> Advanced.

The source now establishes the final Ready-state information hierarchy and narrow
row reflow, but actual rendered quality and device truth still require local proof.

Still not implemented in this boundary:

- first-use setup / intentional `Set up later`;
- verified Meeting Sound selection and incoming capture;
- atomic `Start Translation` lifecycle;
- Meeting Live transcript/turn coordination/recovery/Stop behavior.

Classification: **READY UI ALIGNED / RUNTIME PARTIAL**.

## 4. Text Translation

Current path:

```text
SimpleLauncherController
-> runtimeProductFacade
-> runtimeApi.translateText
-> Rust translate_text
-> canonical local translation runtime
```

The Text workspace exposes a contextual ID/EN direction swap rather than relying on
the removed global Translation Settings tab. Approved Text behavior still also
requires final source/target composition, Quality/Tone contextual controls, request
authority, outdated-result handling, editable target, Save/Copy semantics, and no
silent truncation. Current quick text file attachment remains stale because
first-class document/file translation was removed from scope.

Classification: **PARTIAL**.

## 5. Meeting Voice Capture, Outbound And Coordination

Current owners include:

```text
src-tauri/src/engine/capture_lifecycle.rs
src-tauri/src/engine/audio/*
src-tauri/src/commands/runtime_capture.rs
src-tauri/src/commands/pipeline*.rs
src-tauri/src/engine/adapters/*pipeline*logic.rs
src-tauri/src/engine/adapters/*asr*logic.rs
```

Approved behavior still requires partial/final ASR boundaries, session/generation/
utterance identity, concurrent capture/output, serialized at-most-once delivery,
bounded backlog, conversation-aware waiting, bounded recovery, and strong Stop
invalidation.

Classification: **PARTIAL / STALE OWNERSHIP**.

## 6. Translation Context And Tone

Current owners include runtime settings and context/translation adapters. Current
source does not yet prove approved meaning/tone behavior reaches inference or that
committed Meeting turn ordering and failed/canceled turn exclusion are implemented.

Classification: **PARTIAL / MISSING**.

## 7. Meeting Audio Route And Incoming Assistance

Current route owners:

```text
src-tauri/src/commands/virtual_mic_route.rs
src-tauri/src/commands/virtual_audio_route_runtime.rs
EngineData/Backend/LocalWorker/WorkerRuntime/virtual_audio_route_provider.py
```

Approved product route remains managed `TranslateIT Meeting Microphone`, not a
normal-user routing playground. Incoming remains a separate Meeting Sound lane with
Indonesian text output, optional/degradable readiness, freshness, and mandatory
self-output suppression.

Classification: route **PARTIAL**; incoming semantics **PARTIAL / MISSING**. Actual
Windows proof remains **LOCAL PROOF REQUIRED**.

## 8. History, Saved And Storage

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
History. Search is local retrieval and never automatic model context.

The current `History & Privacy` Settings surface intentionally does not expose fake
History toggles or destructive controls before these persistence semantics are
implemented.

Classification: **PARTIAL / STALE SEMANTICS**.

## 9. Document Translation

First-class Document Translation is **removed from current product scope**.

Top-level Documents is already removed from the active shell. Remaining attachment
helpers reachable through Text are stale product behavior and should be removed when
Text composition is reconciled; they must not be expanded into parser/export/job
infrastructure.

Classification: **RETIRED**.

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

### Retired / stale product ownership

```text
Documents top-level/workspace behavior
top-level Saved navigation
General / Translation / Audio as normal Settings destinations
normal-user helper/worker controls outside nested Diagnostics
Fast user-facing mode naming
Text file-attachment translation behavior
```

### Still requires later reconciliation

```text
atomic Start Translation + Meeting Live approved composition/lifecycle
First Setup wizard / intentional defer
Text final two-pane composition and result authority
History Recent versus Saved persistence/workspace semantics
global Meeting strip / cross-view live state / single-instance behavior
capture lifecycle and unified helper ownership
incoming Meeting Sound lane and self-output suppression
bounded recovery / Stop finalization
approved tone/context inference contract
repo-root/system-Python installed-build assumptions
```

## Source-Side Development Order

The project is in **Developing** through `ChatGPT -> GitHub`. Complete bounded
source-side slices before the dedicated local Windows acceptance phase. Each slice
must use the current semantic owner and static proof only for static claims.

Current continuation is owned by `docs/knowledge/next-action.md`.
