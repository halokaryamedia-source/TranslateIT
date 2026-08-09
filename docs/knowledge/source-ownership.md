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
| Product shell/navigation | `src/main.ts`, `SimpleLauncherController.ts`, `lockedReferenceShellParts.ts`, `shell.ts` | **ALIGNED / VISUAL PARTIAL** | static source | Top-level navigation is `Meeting / Text / History / Settings`; rendered shell quality remains local proof later. |
| Settings hierarchy | `lockedReferenceShellParts.ts`, `launcherSettingsRenderer.ts`, `SimpleLauncherController.ts` | **ALIGNED HIERARCHY / PARTIAL CONTENT** | static source | Normal Settings is `Meeting / History & Privacy / Advanced`; finish real History controls and verified device-selection behavior in later slices. |
| Meeting Ready / product readiness | `runtimeProductFacade.ts`, `SimpleLauncherController.ts`, `lockedReferenceShellParts.ts`, `mainPageLayout.css` | **READY UI ALIGNED / RUNTIME PARTIAL** | static source; local proof later | Ready composition is aligned and truthful; atomic Start, incoming lane, First Setup, and Live lifecycle remain separate slices. |
| Text translation | `SimpleLauncherController.ts`, `runtimeProductFacade.ts`, Rust translation command/runtime | **UI ALIGNED / RUNTIME + HISTORY PARTIAL** | static source; runtime quality proof later | Source/target translator UI and stale/error authority are aligned; connect automatic Recent History, Quality default ownership, tone inference, Copy/Save semantics. |
| History / Saved persistence | `engine/history_store.rs`, `commands/history.rs`, existing `UserData/SavedProject` root | **PERSISTENCE FOUNDATION ALIGNED / UI PARTIAL** | static source | Canonical Recent/Saved storage contract now exists; wire frontend bridge, Text Recent writes, collection/detail UI, History toggle, and Meeting writes when Meeting lifecycle exists. |
| Meeting voice capture/pipeline | Rust capture/audio/pipeline owners | **PARTIAL / STALE OWNERSHIP** | local proof required | Reconcile one runtime/helper orchestration owner, Session Listening, generation-safe utterances, bounded backlog, turn coordination, recovery, and Stop. |
| Translation context/tone | runtime settings + context/translation adapters | **PARTIAL / MISSING** | static source; quality proof later | Make tone and bounded committed Meeting context reach actual inference without History leakage. |
| Meeting audio route | virtual-route Rust commands + local provider | **PARTIAL** | **LOCAL PROOF REQUIRED** | Preserve managed `TranslateIT Meeting Microphone`; prove delivery, self-output suppression, and safe recovery on Windows. |
| Incoming Meeting assistance | capture/audio/runtime pipeline owners | **PARTIAL / MISSING SEMANTICS** | local proof required | Separate Meeting Sound lane, optional/degradable behavior, freshness, and self-output suppression. |
| Document translation | no active product workspace; legacy helpers may remain unreachable | **RETIRED** | current source/policy | Do not revive Documents or file-attachment translation; remove dead helpers only through bounded reachability cleanup. |
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

`Documents` and top-level `Saved` are no longer active navigation/workspace
surfaces. `ProductWorkspace` accepts only `meeting`, `text`, and `history`; Settings
remains the fourth destination through the same controller/shell path.

Classification: **ALIGNED / VISUAL PARTIAL**.

## 2. Settings

Current normal hierarchy is:

```text
Meeting
History & Privacy
Advanced
    -> Diagnostics
```

Normal `General`, global `Translation`, and standalone `Audio` are no longer active
Settings destinations. Meeting owns current product-level meeting preferences;
History & Privacy remains conservative until storage actions are wired; Advanced is
a setup-health landing with explicit nested Diagnostics.

Text direction is contextual in Text and persisted through existing settings.
Meeting retains fixed initial ID -> EN outbound direction independently.

Classification: **ALIGNED HIERARCHY / PARTIAL CONTENT**.

## 3. Meeting Ready And Product Readiness

Current owners:

```text
src/app/bridge/runtimeProductFacade.ts
src/app/simple-launcher/SimpleLauncherController.ts
src/app/active-launcher/lockedReferenceShellParts.ts
src/mainPageLayout.css
```

Meeting Ready now presents readiness, plain-language direction, Your microphone,
Incoming translation / Meeting sound, managed TranslateIT Meeting Microphone,
Realtime / Auto, Start Translation boundary, and the meeting-app microphone
reminder.

Current readiness is not fabricated: microphone/route state comes from existing
product readiness evidence, incoming is explicitly `Not connected yet`, and Start
Translation remains disabled until the approved atomic live-session lifecycle exists.

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

The active Text workspace now uses source/target panes with contextual ID/EN Swap,
explicit Translate, editable target, and stale/error result states that preserve the
user's work. The active file-attachment workflow has been removed.

Still incomplete:

- automatic Recent History write after successful intentional translation;
- explicit Save/Copy actions;
- independent Text Quality-default ownership in runtime settings;
- actual Auto/Formal/Casual inference behavior.

Classification: **UI ALIGNED / RUNTIME + HISTORY PARTIAL**.

## 5. Canonical History / Saved Persistence

The inherited persistence sources were inspected before wiring History UI.

### Inherited sources that are not the canonical History owner

`engine/session_chat.rs` stores generic role/content chat files under
`UserData/SavedProject/Chat`. It has only create/list/append semantics, mixes kind
labels in one storage area, and cannot represent approved Meeting delivery state,
Text/Meeting detail metadata, independent Saved lifetime, Clear History, or detail
retrieval.

`engine/session_store.rs` writes technical transcript payloads under
`UserData/SavedProject/SavedTranscript`. It is useful transcript/runtime evidence,
but it is not a unified Recent/Saved retrieval model and is not the active History
workspace contract.

Neither inherited owner is promoted into product History merely because it can
write JSON.

### Canonical owner

Current canonical product History persistence is:

```text
src-tauri/src/engine/history_store.rs
src-tauri/src/commands/history.rs
UserData/SavedProject/History/
├─ Recent/
└─ Saved/
```

The implementation stays inside the approved existing persistent root; no fourth
persistent root was created.

Current contract provides:

- Text Recent-entry creation with source/target/language/tone/mode metadata;
- a schema that can also represent future Meeting chronological turns, duration,
  interruption state, and truthful delivery state;
- chronological list by `recent` or `saved` and optional `meeting` / `text` filter;
- detail read by scope + entry id;
- idempotent Recent -> Saved copy, so Saved has an independent durable file;
- remove-from-Saved without deleting Recent;
- Clear Recent without touching Saved;
- bounded file/list/text sizes and atomic writes.

Runtime settings schema now contains `history_enabled`, default `true`, with a
serde default so older settings files do not lose all settings merely because the
new field is absent.

Not yet connected in this slice:

- frontend `runtimeApi` History bridge methods;
- Text automatic Recent write after a successful translation;
- History collection/detail rendering;
- History On/Off and Clear History controls in Settings;
- Meeting History writes, because canonical Meeting lifecycle does not yet exist.

Classification: **PERSISTENCE FOUNDATION ALIGNED / UI PARTIAL**.

## 6. Meeting Voice Capture, Outbound And Coordination

Current owners include Rust capture/audio/pipeline modules. Approved behavior still
requires partial/final ASR boundaries, session/generation/utterance identity,
concurrent capture/output, serialized at-most-once delivery, bounded backlog,
conversation-aware waiting, bounded recovery, and strong Stop invalidation.

Classification: **PARTIAL / STALE OWNERSHIP**.

## 7. Translation Context And Tone

Current owners include runtime settings and context/translation adapters. Current
source does not yet prove approved tone behavior reaches inference or that committed
Meeting chronology and canceled/failed-turn exclusion are implemented.

Classification: **PARTIAL / MISSING**.

## 8. Meeting Audio Route And Incoming Assistance

Current route owners remain the virtual-route Rust commands plus local provider.
The product route remains managed `TranslateIT Meeting Microphone`. Incoming remains
a separate Meeting Sound lane with Indonesian text output, optional/degradable
readiness, freshness, and mandatory self-output suppression.

Classification: route **PARTIAL**; incoming semantics **PARTIAL / MISSING**. Windows
proof remains **LOCAL PROOF REQUIRED**.

## 9. Document Translation

First-class Document Translation is **removed from current product scope**. The
active shell and active Text workflow no longer expose Documents or file-attachment
translation. Unreachable legacy helpers may be removed later only when bounded
reachability proof shows no remaining consumer.

Classification: **RETIRED**.

## 10. Audio Studio

Current backend metadata/contracts remain, and `index.html -> audioStudioEntry.ts`
is an explicit frontend build entry. Reachability does not prove a complete
experience.

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
history_store + history commands
translate_text command
RuntimeSettings
capture/audio modules
helper worker runtime
virtual route Rust/provider owners
UserData roots
Audio Studio explicit entry + backend metadata contracts
Tauri NSIS package direction
```

### Inherited but not canonical for product History

```text
session_chat.rs -> legacy generic chat persistence
session_store.rs / SavedTranscript -> technical transcript/session persistence
```

Do not make either path a second active History system.

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
History frontend bridge + Recent/Saved collection/detail + Text History write
History & Privacy controls
atomic Start Translation + Meeting Live lifecycle
First Setup wizard / intentional defer
global Meeting strip / cross-view live state / single-instance behavior
capture lifecycle and unified helper ownership
incoming Meeting Sound lane and self-output suppression
bounded recovery / Stop finalization
approved tone/context inference contract
repo-root/system-Python installed-build assumptions
```

## Source-Side Development Order

The project remains in **Developing** through `ChatGPT -> GitHub`. Complete bounded
source-side slices before dedicated local Windows acceptance. Current continuation
is owned by `docs/knowledge/next-action.md`.
