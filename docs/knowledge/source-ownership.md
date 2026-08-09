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

Proof vocabulary follows root `AGENTS.md`. Static source alignment does not promote
rendered/device/runtime/model/audio/package claims beyond evidence actually obtained.

## Executive Ownership Map

| Boundary | Current owner(s) | Status | Proof | Smallest later reconciliation |
|---|---|---|---|---|
| Product shell/navigation | `src/main.ts`, `SimpleLauncherController.ts`, `lockedReferenceShellParts.ts`, `shell.ts` | **ALIGNED / VISUAL PARTIAL** | static source | Top-level navigation is `Meeting / Text / History / Settings`; rendered shell quality remains local proof later. |
| Settings hierarchy | `lockedReferenceShellParts.ts`, `launcherSettingsRenderer.ts`, `SimpleLauncherController.ts` | **ALIGNED HIERARCHY / PARTIAL CONTENT** | static source | Normal Settings is `Meeting / History & Privacy / Advanced`; next connect real History On/Off and Clear History to the canonical store/settings owner. |
| Meeting Ready / product readiness | `runtimeProductFacade.ts`, `SimpleLauncherController.ts`, `lockedReferenceShellParts.ts`, `mainPageLayout.css` | **READY UI ALIGNED / RUNTIME PARTIAL** | static source; local proof later | Ready composition is aligned and truthful; atomic Start, incoming lane, First Setup, and Live lifecycle remain separate slices. |
| Text translation | `SimpleLauncherController.ts`, `runtimeProductFacade.ts`, Rust translation command/runtime | **UI + RECENT WRITE ALIGNED / RUNTIME PARTIAL** | static source; runtime quality proof later | Source/target UI and History-on Recent write are connected; later align independent Quality default, tone inference, Copy, and direct Text Save semantics. |
| History / Saved | `engine/history_store.rs`, `commands/history.rs`, `runtimeApi.ts`, `SimpleLauncherController.ts`, History shell/CSS | **TEXT COLLECTION/DETAIL ALIGNED / SETTINGS + MEETING PARTIAL** | static source; persistence/render proof later | Recent/Saved collection and Text detail use one canonical store; next connect History & Privacy controls. Meeting writes wait for canonical Meeting lifecycle. |
| Meeting voice capture/pipeline | Rust capture/audio/pipeline owners | **PARTIAL / STALE OWNERSHIP** | local proof required | Reconcile one runtime/helper orchestration owner, Session Listening, generation-safe utterances, bounded backlog, turn coordination, recovery, and Stop. |
| Translation context/tone | runtime settings + context/translation adapters | **PARTIAL / MISSING** | static source; quality proof later | Make tone and bounded committed Meeting context reach inference without History leakage. |
| Meeting audio route | virtual-route Rust commands + local provider | **PARTIAL** | **LOCAL PROOF REQUIRED** | Preserve managed `TranslateIT Meeting Microphone`; prove delivery, self-output suppression, and safe recovery on Windows. |
| Incoming Meeting assistance | capture/audio/runtime pipeline owners | **PARTIAL / MISSING SEMANTICS** | local proof required | Separate Meeting Sound lane, optional/degradable behavior, freshness, and self-output suppression. |
| Document translation | no active product workspace; legacy helpers may remain unreachable | **RETIRED** | current source/policy | Do not revive Documents or file-attachment translation; remove dead helpers only through bounded reachability cleanup. |
| Audio Studio | explicit Audio Studio entry + backend metadata/contracts | **PARTIAL / POST-CORE** | source only; provider proof later | Preserve reachability; defer provider/profile completion until core paths are aligned. |
| Installer/package/runtime assets | Tauri config/preflight + paths/assets owners | **PARTIAL / STALE PACKAGING ASSUMPTIONS** | clean-machine proof later | Package helper/runtime/assets explicitly and remove repo-root/system-Python installed-build assumptions. |

## 1. Product Shell And Navigation

Current production entry remains:

```text
EngineData/Frontend/RustApp/index.html
├─ src/main.ts
│  -> SimpleLauncherController
│  -> current shell / settings / workspace helpers
└─ src/audioStudioEntry.ts
   -> explicit post-core Audio Studio entry
```

Normal application navigation is source-aligned to:

```text
Meeting
Text
History
Settings
```

`Documents` and top-level `Saved` are not mounted. `Saved` exists only as a durable
History ownership state. No second launcher/shell was added.

Classification: **ALIGNED / VISUAL PARTIAL**.

## 2. Settings

Normal Settings routing is:

```text
Meeting
History & Privacy
Advanced
    -> Diagnostics
```

`General`, global `Translation`, and standalone `Audio` are no longer active normal
Settings destinations. Meeting owns product-level meeting preferences; Advanced is
a setup-health landing with explicit nested Diagnostics.

`History & Privacy` is still **PARTIAL**: the underlying `history_enabled` setting
and canonical Clear Recent command now exist, but their user controls are not yet
wired in the Settings renderer. No fake toggle/destructive button is exposed before
that next bounded slice.

Classification: **ALIGNED HIERARCHY / PARTIAL CONTENT**.

## 3. Meeting Ready And Product Readiness

Current owners:

```text
src/app/bridge/runtimeProductFacade.ts
src/app/simple-launcher/SimpleLauncherController.ts
src/app/active-launcher/lockedReferenceShellParts.ts
src/mainPageLayout.css
```

Meeting Ready presents the approved order: readiness, plain-language meeting
behavior, Your microphone, Incoming translation / Meeting sound, managed TranslateIT
Meeting Microphone, Realtime / Auto, Start Translation boundary, and meeting-app
microphone reminder.

Current source does not fabricate capability state: microphone/route state comes
from current readiness evidence, incoming remains explicitly not connected, and
`Start Translation` remains disabled until an approved atomic live-session lifecycle
exists.

Classification: **READY UI ALIGNED / RUNTIME PARTIAL**.

## 4. Text Translation

Current runtime path remains:

```text
SimpleLauncherController
-> runtimeProductFacade
-> runtimeApi.translateText
-> Rust translate_text
-> canonical local translation runtime
```

The active Text workspace uses source/target panes, contextual persisted ID/EN Swap,
explicit Translate, editable target, and stale/error states that preserve visible
work. File attachment translation is no longer active.

Successful intentional translations now also snapshot their source language, target
language, mode, source text, and translated result and call the canonical History
write only when `RuntimeSettings.history_enabled` is on. A History write failure is
reported separately and does not convert a successful translation into a failed
translation.

Still incomplete here:

- independent Text Quality-default ownership instead of inherited shared profile;
- actual Auto/Formal/Casual inference behavior;
- Copy action and direct Text Save of the currently visible edited target.

Classification: **UI + RECENT WRITE ALIGNED / RUNTIME PARTIAL**.

## 5. Canonical History / Saved

### Canonical persistence owner

```text
src-tauri/src/engine/history_store.rs
src-tauri/src/commands/history.rs

UserData/SavedProject/History/
├─ Recent/
└─ Saved/
```

The store stays inside the existing approved persistent root. It provides Text
Recent creation, Recent/Saved listing with Meeting/Text filtering, detail read,
idempotent Recent -> Saved independent copy, Remove from Saved, and Clear Recent
without touching Saved. Its schema can later represent Meeting chronological turns,
duration, interruption, and delivery state.

### Current frontend owner

```text
src/app/bridge/runtimeApi.ts
src/app/shared/historyTypes.ts
src/app/simple-launcher/SimpleLauncherController.ts
src/app/active-launcher/lockedReferenceShellParts.ts
src/historyLayout.css
```

The frontend bridge calls only the canonical History commands. Command failures are
recorded and surfaced instead of being collapsed into an empty collection.

The active History workspace now provides:

```text
Recent | Saved
Search
All | Meeting | Text
chronological collection
-> Text detail
   -> Save (Recent)
   -> Remove from Saved (Saved)
```

Collection search is local over currently retrieved title/snippet data. Text detail
is read-only and uses the persisted source/target metadata. Saved actions use the
same store: Save creates/keeps an independent copied artifact; Remove from Saved does
not delete Recent.

Meeting filters are present because the canonical schema supports Meeting, but the
current application does **not** invent Meeting entries. Meeting History writes and
real Meeting transcript detail wait for the canonical Meeting lifecycle.

History OFF does not hide or delete existing Recent/Saved. It only prevents new Text
Recent writes in the current connected path. Settings controls for changing that
preference and clearing Recent remain the next bounded slice.

Classification: **TEXT COLLECTION/DETAIL ALIGNED / SETTINGS + MEETING PARTIAL**.

### Inherited persistence that is not product History

```text
engine/session_chat.rs
-> legacy generic role/content chat persistence

engine/session_store.rs / SavedTranscript
-> technical transcript/session persistence
```

Neither path is wired as a second History system.

## 6. Meeting Voice Capture, Outbound And Coordination

Current owners remain Rust capture/audio/pipeline modules. Approved behavior still
requires partial/final ASR boundaries, session/generation/utterance identity,
concurrent capture/output, serialized at-most-once delivery, bounded backlog,
conversation-aware waiting, bounded recovery, and strong Stop invalidation.

Classification: **PARTIAL / STALE OWNERSHIP**.

## 7. Translation Context And Tone

Current source does not yet prove approved tone behavior reaches inference or that
committed Meeting chronology and canceled/failed-turn exclusion are implemented.
History/Saved remains retrieval/storage only and is not automatic model context.

Classification: **PARTIAL / MISSING**.

## 8. Meeting Audio Route And Incoming Assistance

Current route owners remain virtual-route Rust commands plus the local provider.
The product route remains managed `TranslateIT Meeting Microphone`. Incoming remains
a separate Meeting Sound lane with Indonesian text output, optional/degradable
readiness, freshness, and mandatory self-output suppression.

Classification: route **PARTIAL**; incoming semantics **PARTIAL / MISSING**. Windows
proof remains **LOCAL PROOF REQUIRED**.

## 9. Document Translation

First-class Document Translation is removed from current scope. The active shell and
Text workflow expose neither Documents nor file-attachment translation. Unreachable
legacy helpers may be removed later only when bounded reachability proof shows no
consumer.

Classification: **RETIRED**.

## 10. Audio Studio

The explicit Audio Studio entry and backend metadata/contracts remain post-core.
Reachability does not prove provider/profile completeness.

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
session_chat.rs
session_store.rs / SavedTranscript
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
History & Privacy On/Off + Clear History controls
Meeting History write/detail after canonical Meeting lifecycle
atomic Start Translation + Meeting Live lifecycle
First Setup wizard / intentional defer
global Meeting strip / cross-view live state / single-instance behavior
capture lifecycle and unified helper ownership
incoming Meeting Sound lane and self-output suppression
bounded recovery / Stop finalization
approved tone/context inference contract
Text Quality default + Copy/direct Save
repo-root/system-Python installed-build assumptions
```

## Source-Side Development Order

The project remains in **Developing** through `ChatGPT -> GitHub`. Complete bounded
source-side slices before dedicated local Windows acceptance. Current continuation
is owned only by `docs/knowledge/next-action.md`.
