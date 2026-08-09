# TranslateIT — Source Ownership And Reconciliation Map

**Status:** current source map  
**Updated:** 2026-08-10  
**Branch:** `New`

This file maps approved product responsibilities to current semantic/source owners.
It is not a backlog, task log, or runtime-readiness report.

Status vocabulary:

```text
ALIGNED  -> current source ownership/behavior substantially matches policy
PARTIAL  -> useful owner exists but behavior/contract is incomplete
MISSING  -> approved capability has no complete current implementation owner
STALE    -> current source still expresses superseded behavior
RETIRED  -> inherited/current source concept is no longer approved product scope
```

Proof vocabulary follows root `AGENTS.md`. Static source alignment never promotes
rendered/device/runtime/model/audio/package claims beyond the evidence obtained.

## Executive Ownership Map

| Boundary | Current owner(s) | Status | Proof | Smallest later reconciliation |
|---|---|---|---|---|
| Product shell/navigation | `src/main.ts`, `FirstSetupBootstrap.ts`, `SimpleLauncherController.ts`, current shell | **ALIGNED / VISUAL PARTIAL** | static source | First Setup is a focused first-use gate; normal navigation is `Meeting / Text / History / Settings`. Rendered quality remains local proof later. |
| First Setup | `FirstSetupBootstrap.ts`, `RuntimeSettings`, `runtimeProductFacade.ts`, audio-device commands, `firstSetupLayout.css` | **FLOW + DEVICE SELECTION SOURCE ALIGNED / WINDOWS PROOF LATER** | static source | Five-step setup, defer/resume facts, microphone/Meeting Sound selection, and capability recheck are connected. Windows permission deep-link and real target-device behavior remain later proof/work. |
| Settings hierarchy / Meeting devices | `launcherSettingsRenderer.ts`, `SimpleLauncherController.ts`, `runtimeProductFacade.ts`, `RuntimeSettings`, audio-device commands | **ALIGNED HIERARCHY + DEVICE SELECTION / PARTIAL OTHER MEETING CONTENT** | static source | Meeting device selection uses the same candidate-check/commit owner as First Setup. Other Meeting lifecycle/session behavior remains separate. |
| Meeting Ready / product readiness | `runtimeProductFacade.ts`, `SimpleLauncherController.ts`, `lockedReferenceShellParts.ts`, `mainPageLayout.css` | **READY UI ALIGNED / RUNTIME PARTIAL** | static source; local proof later | Ready composition is truthful; Start remains fail-closed until the continuous outbound runtime is attached to the canonical Meeting session authority. |
| Text translation | `SimpleLauncherController.ts`, `runtimeProductFacade.ts`, Rust translation command/runtime | **UI + RECENT WRITE ALIGNED / RUNTIME PARTIAL** | static source; runtime quality proof later | Later align independent Quality default, tone inference, Copy, and direct Text Save semantics. |
| History / Saved | `engine/history_store.rs`, `commands/history.rs`, `runtimeApi.ts`, `SimpleLauncherController.ts`, History shell/CSS | **TEXT COLLECTION/DETAIL + PRIVACY ALIGNED / MEETING PARTIAL** | static source; persistence/render proof later | Meeting History waits for canonical Meeting lifecycle output/history integration. |
| Meeting session authority / Start-Stop | `engine/runtime_state.rs`, `commands/meeting_session.rs`, existing live-capture/helper/route owners | **SESSION AUTHORITY ALIGNED / OUTBOUND EXECUTION BLOCKED** | static source; local proof later | Attach generation-aware continuous ASR -> Translate -> TTS -> Meeting Microphone execution to this authority, then expose Start/Stop through the normal frontend. |
| Translation context/tone | runtime settings + translation/context adapters | **PARTIAL / MISSING** | static source; quality proof later | Make approved tone and bounded committed Meeting context reach inference without History leakage. |
| Meeting audio route | virtual-route Rust commands + local provider | **PARTIAL** | **LOCAL PROOF REQUIRED** | Preserve managed `TranslateIT Meeting Microphone`; prove delivery and recovery on Windows. |
| Incoming Meeting assistance | capture/audio/runtime pipeline owners | **PARTIAL / MISSING SEMANTICS** | local proof required | Implement the separate Meeting Sound capture/translation lane and self-output suppression. |
| Document translation | no active workspace; legacy helpers may remain unreachable | **RETIRED** | current source/policy | Do not revive Documents/file-attachment translation. |
| Audio Studio | explicit Audio Studio entry + backend metadata/contracts | **PARTIAL / POST-CORE** | source only | Preserve reachability; defer completion until core paths are aligned. |
| Installer/package/runtime assets | Tauri config/preflight + paths/assets owners | **PARTIAL / STALE PACKAGING ASSUMPTIONS** | clean-machine proof later | Remove repo-root/system-Python installed-build assumptions and prove clean install later. |

## 1. Product Shell And Navigation

Current production entry:

```text
EngineData/Frontend/RustApp/index.html
└─ src/main.ts
   -> startDesktopWithFirstSetup
      ├─ setup state `new`
      │  -> focused First Setup shell
      └─ deferred/completed
         -> SimpleLauncherController
            -> normal shell
            -> Meeting / Text / History / Settings

src/audioStudioEntry.ts
-> explicit post-core Audio Studio entry
```

The setup shell is not a second normal application architecture. `Documents` and
top-level `Saved` are not mounted.

Classification: **ALIGNED / VISUAL PARTIAL**.

## 2. First Setup And Audio Device Selection

Current setup owners:

```text
src/app/first-setup/FirstSetupBootstrap.ts
src/firstSetupLayout.css
src/app/bridge/runtimeProductFacade.ts
src/app/bridge/runtimeApi.ts
src-tauri/src/commands/audio.rs
src-tauri/src/engine/audio/input.rs
src-tauri/src/engine/settings.rs
```

The setup flow remains:

```text
Welcome
-> Your microphone
-> Meeting sound
-> Meeting microphone
-> Verify / Ready
```

Persisted setup facts remain limited to:

```text
meeting_setup_state      -> new | deferred | completed
meeting_setup_checkpoint -> 1..5
```

No permanent `Ready` truth is persisted.

### Your microphone

First Setup and normal Meeting Settings now share one selection path:

```text
list native candidates
-> choose Windows Default or explicit microphone
-> probe that exact candidate
-> if probe passes, save RuntimeSettings.audio.input_device_id
-> reload canonical settings/readiness
```

Current source guarantees:

- explicit candidate lookup does not substitute another microphone;
- a missing/unusable candidate is rejected before preference save;
- a failed probe/save keeps the previously persisted preference;
- `get_input_status()` checks the configured microphone rather than always checking
  the Windows default;
- live capture no longer silently falls back to the Windows default when an explicit
  configured microphone disappears; it blocks instead;
- `Windows Default` is represented by no pinned `input_device_id`, preserving
  follow-default behavior.

The candidate probe currently establishes native endpoint/config usability at the
source-contract level. It does not constitute live target-PC proof that capture,
permission, signal level, callbacks, or long-session stability work correctly.
Those claims remain **LOCAL PROOF REQUIRED**.

### Meeting sound

First Setup and normal Meeting Settings also share one Meeting Sound path:

```text
list native output candidates
-> choose Windows Default or explicit output
-> probe that exact endpoint/default output configuration
-> if probe passes, save RuntimeSettings.audio.output_device_id
```

A missing explicit output is rejected rather than replaced by Windows default, and
failed probe/save keeps the previous preference.

This probe establishes only that the selected output endpoint exposes a usable
native output configuration. It deliberately does **not** claim that incoming
Meeting Sound capture, loopback, ASR, or English -> Indonesian translation works.
That incoming lane remains a separate unimplemented capability.

`Set up later`, checkpoint resume, Meeting-route verification, and normal launch-time
readiness revalidation remain unchanged.

Classification: **FLOW + DEVICE SELECTION SOURCE ALIGNED / WINDOWS PROOF LATER**.

## 3. Settings

Normal Settings hierarchy is:

```text
Meeting
History & Privacy
Advanced
    -> Diagnostics
```

Meeting now exposes familiar selectors for `Your microphone` and `Meeting sound`.
The selectors use the same `runtimeProductFacade` selection authority as First Setup
rather than duplicating device state. Candidate failure returns the control to the
previous persisted value. A successful microphone preference change is re-read
through canonical product readiness instead of treating native enumeration/config
success as full Meeting readiness.

`History & Privacy` remains connected to `RuntimeSettings.history_enabled` and the
canonical History store. Clear History clears Recent only and never Saved.

Classification: **ALIGNED HIERARCHY + DEVICE SELECTION / PARTIAL OTHER MEETING CONTENT**.

## 4. Meeting Ready And Product Readiness

Current owners:

```text
src/app/bridge/runtimeProductFacade.ts
src/app/simple-launcher/SimpleLauncherController.ts
src/app/active-launcher/lockedReferenceShellParts.ts
src/mainPageLayout.css
```

Meeting Ready presents the approved plain-language hierarchy. Microphone readiness
now reflects the configured microphone probe rather than always representing the
Windows default input. Incoming remains explicitly not connected.

The new application Meeting lifecycle intentionally does not make the existing
`Start Translation` button live yet. Its dedicated Start preflight contains a
fail-closed `continuous_outbound_runtime_not_connected` blocker until the real
continuous generation-aware ASR -> translation -> TTS -> Meeting Microphone loop is
attached. Developer payload/cache readiness is not accepted as a substitute.

Classification: **READY UI ALIGNED / RUNTIME PARTIAL**.

## 5. Text Translation

Current runtime path:

```text
SimpleLauncherController
-> runtimeProductFacade
-> runtimeApi.translateText
-> Rust translate_text
-> canonical local translation runtime
```

The active Text workspace uses source/target panes, contextual persisted ID/EN Swap,
explicit Translate, editable target, and stale/error states. Successful intentional
Text translation writes Recent only when History is enabled.

Still incomplete:

- independent Text Quality-default ownership;
- Auto/Formal/Casual inference behavior;
- Copy action and direct Text Save of the currently visible edited target.

Classification: **UI + RECENT WRITE ALIGNED / RUNTIME PARTIAL**.

## 6. Canonical History / Saved

Canonical product History persistence:

```text
src-tauri/src/engine/history_store.rs
src-tauri/src/commands/history.rs

UserData/SavedProject/History/
├─ Recent/
└─ Saved/
```

Frontend owners:

```text
src/app/bridge/runtimeApi.ts
src/app/shared/historyTypes.ts
src/app/simple-launcher/SimpleLauncherController.ts
src/app/active-launcher/lockedReferenceShellParts.ts
src/app/active-launcher/launcherSettingsRenderer.ts
src/historyLayout.css
```

The active workspace provides Recent/Saved, local Search, All/Meeting/Text filtering,
Text detail, independent Save, and Remove from Saved. History Off stops new connected
Text Recent writes without deleting existing History/Saved. Clear History is
confirmation-gated and clears Recent only.

Meeting entries are not invented before canonical Meeting lifecycle writes exist.

Classification: **TEXT COLLECTION/DETAIL + PRIVACY ALIGNED / MEETING PARTIAL**.

Inherited persistence below is not canonical product History:

```text
engine/session_chat.rs
engine/session_store.rs / SavedTranscript
```

## 7. Application Meeting Session Authority And Outbound Lifecycle

Canonical session ownership now lives in the existing runtime-state layer plus one
product command orchestrator:

```text
src-tauri/src/engine/runtime_state.rs
src-tauri/src/commands/meeting_session.rs
```

The Tauri registry exposes:

```text
get_meeting_session_status
start_meeting_translation
stop_meeting_translation
```

The runtime session snapshot now carries:

```text
session_id
generation
authority_active
phase
```

Current source contract:

- one application Meeting session authority may own Meeting resources at a time;
- each new session receives a new monotonically advancing generation;
- duplicate Start cannot overwrite an existing session;
- duplicate Start against an already-Live application Meeting is idempotent rather
  than creating a second session;
- Start has a dedicated required-outbound preflight for configured microphone,
  required models, local helper/provider readiness, managed Meeting route, and the
  continuous outbound runtime;
- preflight is intentionally fail-closed today because the continuous
  generation-aware outbound execution loop is not attached yet;
- if future-ready Start opens the microphone and a later commit step fails, source
  rollback revokes generation authority before stopping/clearing opened resources;
- Stop reads the current generation and revokes its authority **before** helper,
  capture, pipeline-cache, handoff, and session cleanup;
- Stop with no active session is idempotent;
- clearing runtime session state invalidates prior generation authority;
- legacy direct capture remains separate and cannot be presented as application
  Translation Live.

This slice establishes authority and safety ordering only. Existing pipeline stages
do not yet carry/check the application generation, so the continuous outbound
execution loop must be reconciled next before `Start Translation` is enabled in the
normal UI.

Classification: **SESSION AUTHORITY ALIGNED / OUTBOUND EXECUTION BLOCKED**.

## 8. Translation Context And Tone

Current source does not yet prove approved tone behavior reaches inference or that
committed Meeting chronology/canceled-turn exclusion is implemented. History/Saved
remains retrieval only and never automatic model context.

Classification: **PARTIAL / MISSING**.

## 9. Meeting Audio Route And Incoming Assistance

The managed outbound route remains `TranslateIT Meeting Microphone`. Route source
exists but Windows delivery/recovery remains **LOCAL PROOF REQUIRED**.

Meeting Sound device preference is now selected/committed safely, but this does not
implement the separate incoming capture/ASR/translation lane or self-output
suppression.

Classification: route **PARTIAL**; incoming **PARTIAL / MISSING**.

## 10. Document Translation

First-class Document Translation is removed from current scope. The active shell and
Text workflow expose neither Documents nor file-attachment translation.

Classification: **RETIRED**.

## 11. Audio Studio

Audio Studio remains explicit but post-core. Reachability does not prove provider or
profile completeness.

Classification: **PARTIAL / POST-CORE**.

## 12. Installer, Package And Runtime Assets

Tauri/NSIS direction exists, but clean installed completeness is not proven and
repository/system-Python assumptions remain to be reconciled later.

Classification: **PARTIAL / STALE PACKAGING ASSUMPTIONS**.

## Cross-Cutting Ownership State

### Keep / extend

```text
FirstSetupBootstrap + SimpleLauncherController/current shell
runtimeProductFacade
runtimeApi
RuntimeSettings
runtime_state + meeting_session command authority
audio device/input/live-capture owners
history_store + history commands
translate_text command
helper/pipeline runtime owners
virtual route Rust/provider owners
UserData roots
Audio Studio explicit entry + backend contracts
Tauri NSIS package direction
```

### Retired / non-canonical

```text
Documents top-level/workspace behavior
Text file-attachment translation
top-level Saved navigation
General / Translation / Audio as normal Settings destinations
session_chat.rs as product History
session_store.rs / SavedTranscript as product History
```

### Still requires later reconciliation

```text
generation-aware continuous outbound ASR -> Translate -> TTS -> Meeting Microphone execution
frontend Start/Stop wiring + Meeting Live transcript/global cross-view state
single-instance behavior
incoming Meeting Sound lane and self-output suppression
turn coordination / bounded recovery / Pause-Resume semantics
Meeting History write/detail after committed Meeting lifecycle exists
approved tone/context inference
Text Quality default + Copy/direct Save
Windows permission deep-link
repo-root/system-Python installed-build assumptions
```

## Source-Side Development Order

The project remains in **Developing** through `ChatGPT -> GitHub`. Continue bounded
source-side slices before dedicated local Windows acceptance. The single current
continuation is owned by `docs/knowledge/next-action.md`.
