# TranslateIT — Source Ownership And Reconciliation Map

**Status:** current source map  
**Updated:** 2026-08-10  
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
| Product shell/navigation | `src/main.ts`, `FirstSetupBootstrap.ts`, `SimpleLauncherController.ts`, current shell | **ALIGNED / VISUAL PARTIAL** | static source | First Setup gates only first-use `new` state; normal navigation remains `Meeting / Text / History / Settings`. Rendered quality remains local proof later. |
| First Setup | `FirstSetupBootstrap.ts`, `RuntimeSettings`, `runtimeProductFacade.ts`, `runtimeApi.ts`, `firstSetupLayout.css` | **FLOW ALIGNED / DEVICE SELECTION PARTIAL** | static source; local proof later | Five-step setup, resume/defer/completion facts, capability recheck, and no permanent Ready persistence are connected. Explicit verified microphone/Meeting Sound selection and Windows-permission deep-link behavior remain later slices. |
| Settings hierarchy | `lockedReferenceShellParts.ts`, `launcherSettingsRenderer.ts`, `SimpleLauncherController.ts` | **ALIGNED HIERARCHY / PARTIAL MEETING CONTENT** | static source | `History & Privacy` is connected to canonical settings/store owners; later complete verified Meeting device-selection behavior. |
| Meeting Ready / product readiness | `runtimeProductFacade.ts`, `SimpleLauncherController.ts`, `lockedReferenceShellParts.ts`, `mainPageLayout.css` | **READY UI ALIGNED / RUNTIME PARTIAL** | static source; local proof later | Ready composition is aligned and truthful; atomic Start, incoming lane, and Live lifecycle remain separate slices. |
| Text translation | `SimpleLauncherController.ts`, `runtimeProductFacade.ts`, Rust translation command/runtime | **UI + RECENT WRITE ALIGNED / RUNTIME PARTIAL** | static source; runtime quality proof later | Source/target UI and History-on Recent write are connected; later align independent Quality default, tone inference, Copy, and direct Text Save semantics. |
| History / Saved | `engine/history_store.rs`, `commands/history.rs`, `runtimeApi.ts`, `SimpleLauncherController.ts`, History shell/CSS | **TEXT COLLECTION/DETAIL + PRIVACY ALIGNED / MEETING PARTIAL** | static source; persistence/render proof later | Recent/Saved collection, Text detail, History On/Off, and Clear History use one canonical owner; Meeting writes wait for canonical Meeting lifecycle. |
| Meeting voice capture/pipeline | Rust capture/audio/pipeline owners | **PARTIAL / STALE OWNERSHIP** | local proof required | Reconcile one runtime/helper orchestration owner, Session Listening, generation-safe utterances, bounded backlog, turn coordination, recovery, and Stop. |
| Translation context/tone | runtime settings + context/translation adapters | **PARTIAL / MISSING** | static source; quality proof later | Make tone and bounded committed Meeting context reach inference without History leakage. |
| Meeting audio route | virtual-route Rust commands + local provider | **PARTIAL** | **LOCAL PROOF REQUIRED** | Preserve managed `TranslateIT Meeting Microphone`; prove delivery, self-output suppression, and safe recovery on Windows. |
| Incoming Meeting assistance | capture/audio/runtime pipeline owners | **PARTIAL / MISSING SEMANTICS** | local proof required | Separate Meeting Sound lane, optional/degradable behavior, freshness, and self-output suppression. |
| Document translation | no active product workspace; legacy helpers may remain unreachable | **RETIRED** | current source/policy | Do not revive Documents or file-attachment translation; remove dead helpers only through bounded reachability cleanup. |
| Audio Studio | explicit Audio Studio entry + backend metadata/contracts | **PARTIAL / POST-CORE** | source only; provider proof later | Preserve reachability; defer provider/profile completion until core paths are aligned. |
| Installer/package/runtime assets | Tauri config/preflight + paths/assets owners | **PARTIAL / STALE PACKAGING ASSUMPTIONS** | clean-machine proof later | Package helper/runtime/assets explicitly and remove repo-root/system-Python installed-build assumptions. |

## 1. Product Shell And Navigation

Current production entry is now:

```text
EngineData/Frontend/RustApp/index.html
└─ src/main.ts
   -> startDesktopWithFirstSetup
      ├─ first-use `new` -> focused First Setup shell
      └─ deferred/completed -> SimpleLauncherController
                                -> normal shell
                                -> Meeting / Text / History / Settings

src/audioStudioEntry.ts
-> explicit post-core Audio Studio entry
```

The focused setup shell is not a second normal application shell. It exists only as
the approved first-use gate and is replaced by the existing normal controller/shell
after completion or intentional defer.

Normal application navigation remains:

```text
Meeting
Text
History
Settings
```

`Documents` and top-level `Saved` are not mounted. `Saved` exists only as a durable
History ownership state.

Classification: **ALIGNED / VISUAL PARTIAL**.

## 2. First Setup

Current owners:

```text
src/app/first-setup/FirstSetupBootstrap.ts
src/firstSetupLayout.css
src/app/bridge/runtimeProductFacade.ts
src/app/bridge/runtimeApi.ts
src-tauri/src/engine/settings.rs
src/app/shared/types.ts
src/app/shared/state.ts
```

The active first-use flow is:

```text
Welcome
-> Your microphone
-> Meeting sound
-> Meeting microphone
-> Verify / Ready
```

The bootstrap reads current canonical runtime settings before mounting the normal
application. Only `meeting_setup_state = new` enters the wizard. `deferred` and
`completed` continue to the existing normal controller, so an intentional `Set up
later` does not trap the user in the wizard on every launch.

Persisted setup facts are deliberately limited to:

```text
meeting_setup_state
-> new | deferred | completed

meeting_setup_checkpoint
-> 1..5
```

These fields represent user/setup-flow facts only. They do **not** persist
`Ready=true`. Runtime capability readiness is reloaded through
`runtimeProductFacade` whenever the wizard needs microphone/route/verification
state and again when the normal application starts.

Interrupted `new` setup resumes from the persisted checkpoint but revalidates the
relevant capability before trusting progress: a no-longer-ready microphone returns
to the microphone step, and an unavailable Meeting microphone route prevents a
stored verify checkpoint from skipping the route step.

Current step behavior is truthful to source capability:

- Welcome explains ID -> EN voice and EN -> ID text and offers `Set Up Meeting` or
  explicit `Set up later`;
- Your microphone displays the current selection and requires current microphone
  readiness before Continue; `Check Microphone` uses the existing product setup
  action;
- Meeting sound displays the current preference and explicitly states that incoming
  translation is not connected yet, so it does not fake an incoming test/pass;
- Meeting microphone shows the managed `TranslateIT Meeting Microphone` route and
  requires current route readiness before Continue; `Fix Setup` uses the existing
  product recovery action;
- Verify / Ready rechecks actual Text, microphone, Meeting route, and Meeting
  readiness; incoming remains shown as unavailable and does not masquerade as Ready;
- `Go to Meeting` marks the setup flow completed only when current required Meeting
  readiness is true;
- `Set up later` remains available during the wizard and enters the normal app
  without changing capability readiness.

Still incomplete inside this responsibility:

- explicit user selection/change for physical microphone and Meeting Sound with
  candidate -> verify -> commit semantics;
- direct `Open Windows Settings` permission action;
- actual incoming Meeting Sound translation lane.

Classification: **FLOW ALIGNED / DEVICE SELECTION PARTIAL**.

## 3. Settings

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

`History & Privacy` uses the same canonical owners as the active History flow:

- History On/Off is backed by `RuntimeSettings.history_enabled` and the existing
  runtime settings command;
- turning History off changes future/current automatic retention only and does not
  delete existing Recent or Saved data;
- Clear History requires explicit confirmation and calls only
  `runtimeApi.clearRecentHistory()`;
- the canonical Clear Recent implementation targets only Recent; Saved is not
  touched;
- Settings reports operation success/failure inline rather than pretending a failed
  persistence action succeeded.

Remaining Settings incompleteness is primarily verified Meeting-device
selection/change behavior.

Classification: **ALIGNED HIERARCHY / PARTIAL MEETING CONTENT**.

## 4. Meeting Ready And Product Readiness

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

## 5. Text Translation

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

Successful intentional translations snapshot their source language, target language,
mode, source text, and translated result and call the canonical History write only
when `RuntimeSettings.history_enabled` is on. A History write failure is reported
separately and does not convert a successful translation into a failed translation.

Still incomplete here:

- independent Text Quality-default ownership instead of inherited shared profile;
- actual Auto/Formal/Casual inference behavior;
- Copy action and direct Text Save of the currently visible edited target.

Classification: **UI + RECENT WRITE ALIGNED / RUNTIME PARTIAL**.

## 6. Canonical History / Saved

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
src/app/active-launcher/launcherSettingsRenderer.ts
src/historyLayout.css
```

The frontend bridge calls only the canonical History commands. Command failures are
recorded and surfaced instead of being collapsed into an empty collection.

The active History workspace provides:

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
is read-only and uses persisted source/target metadata. Saved actions use the same
store: Save creates/keeps an independent copied artifact; Remove from Saved does not
delete Recent.

Settings -> History & Privacy controls the same contract rather than introducing a
second privacy/storage service. History Off leaves existing collection data readable
while blocking new automatic Text Recent writes. Clear History is confirmation-gated
and clears Recent only; controller collection/detail cache is invalidated for the
Recent scope after successful clear.

Meeting filters remain truthful but the application does not invent Meeting entries.
Meeting History writes and real Meeting transcript detail wait for the canonical
Meeting lifecycle.

Classification: **TEXT COLLECTION/DETAIL + PRIVACY ALIGNED / MEETING PARTIAL**.

### Inherited persistence that is not product History

```text
engine/session_chat.rs
-> legacy generic role/content chat persistence

engine/session_store.rs / SavedTranscript
-> technical transcript/session persistence
```

Neither path is wired as a second History system.

## 7. Meeting Voice Capture, Outbound And Coordination

Current owners remain Rust capture/audio/pipeline modules. Approved behavior still
requires partial/final ASR boundaries, session/generation/utterance identity,
concurrent capture/output, serialized at-most-once delivery, bounded backlog,
conversation-aware waiting, bounded recovery, and strong Stop invalidation.

Classification: **PARTIAL / STALE OWNERSHIP**.

## 8. Translation Context And Tone

Current source does not yet prove approved tone behavior reaches inference or that
committed Meeting chronology and canceled/failed-turn exclusion are implemented.
History/Saved remains retrieval/storage only and is not automatic model context.

Classification: **PARTIAL / MISSING**.

## 9. Meeting Audio Route And Incoming Assistance

Current route owners remain virtual-route Rust commands plus the local provider.
The product route remains managed `TranslateIT Meeting Microphone`. Incoming remains
a separate Meeting Sound lane with Indonesian text output, optional/degradable
readiness, freshness, and mandatory self-output suppression.

Classification: route **PARTIAL**; incoming semantics **PARTIAL / MISSING**. Windows
proof remains **LOCAL PROOF REQUIRED**.

## 10. Document Translation

First-class Document Translation is removed from current scope. The active shell and
Text workflow expose neither Documents nor file-attachment translation. Unreachable
legacy helpers may be removed later only when bounded reachability proof shows no
consumer.

Classification: **RETIRED**.

## 11. Audio Studio

The explicit Audio Studio entry and backend metadata/contracts remain post-core.
Reachability does not prove provider/profile completeness.

Classification: **PARTIAL / POST-CORE**.

## 12. Installer, Package And Runtime Assets

Tauri/NSIS direction exists, but helper/runtime resource mapping still includes
development/repository/system-Python assumptions and clean installed completeness is
not proven.

Classification: **PARTIAL / STALE PACKAGING ASSUMPTIONS**.

## Cross-Cutting Ownership State

### Keep / extend

```text
FirstSetupBootstrap + current SimpleLauncherController/shell
runtimeProductFacade
runtimeApi
RuntimeSettings
history_store + history commands
translate_text command
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
verified physical microphone / Meeting Sound selection and commit behavior
Meeting History write/detail after canonical Meeting lifecycle
atomic Start Translation + Meeting Live lifecycle
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
