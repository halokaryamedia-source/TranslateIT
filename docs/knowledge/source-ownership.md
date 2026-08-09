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
| Meeting Ready / product readiness | `runtimeProductFacade.ts`, `SimpleLauncherController.ts`, `lockedReferenceShellParts.ts`, `mainPageLayout.css` | **READY UI ALIGNED / RUNTIME PARTIAL** | static source; local proof later | Ready composition is truthful; Start remains fail-closed until a finalized outbound utterance source is connected to the canonical Meeting pipeline. |
| Text translation | `SimpleLauncherController.ts`, `runtimeProductFacade.ts`, Rust translation command/runtime | **UI + RECENT WRITE ALIGNED / RUNTIME PARTIAL** | static source; runtime quality proof later | Later align independent Quality default, tone inference, Copy, and direct Text Save semantics. |
| History / Saved | `engine/history_store.rs`, `commands/history.rs`, `runtimeApi.ts`, `SimpleLauncherController.ts`, History shell/CSS | **TEXT COLLECTION/DETAIL + PRIVACY ALIGNED / MEETING PARTIAL** | static source; persistence/render proof later | Meeting History waits for canonical Meeting lifecycle output/history integration. |
| Meeting session authority / outbound stages | `engine/runtime_state.rs`, `commands/meeting_session.rs`, helper worker, generation-aware route owner | **SESSION AUTHORITY + FINALIZED-STAGE CONTRACT ALIGNED / FINAL UTTERANCE SOURCE MISSING** | static source; local proof later | Connect a real finalized utterance producer from the audio boundary; rolling ASR-ready audio must not be treated as final speech. |
| Translation context/tone | runtime settings + translation/context adapters | **PARTIAL / MISSING** | static source; quality proof later | Make approved tone and bounded committed Meeting context reach inference without History leakage. |
| Meeting audio route | `virtual_audio_route_runtime.rs`, virtual-route selection, local provider | **GENERATION-CANCELLABLE SOURCE CONTRACT / WINDOWS PROOF REQUIRED** | static source; local proof required | Product route execution now checks Meeting generation and can be cancellation-signalled on Stop; actual Windows delivery remains local proof. |
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

First Setup and normal Meeting Settings share one selection path:

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
- live capture does not silently fall back to the Windows default when an explicit
  configured microphone disappears; it blocks instead;
- `Windows Default` is represented by no pinned `input_device_id`, preserving
  follow-default behavior.

The candidate probe establishes native endpoint/config usability at source-contract
level only. It does not prove capture permission, signal, callbacks, or long-session
stability on the target PC. Those claims remain **LOCAL PROOF REQUIRED**.

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
native output configuration. It does **not** claim incoming Meeting Sound capture,
loopback, ASR, or English -> Indonesian translation works.

Classification: **FLOW + DEVICE SELECTION SOURCE ALIGNED / WINDOWS PROOF LATER**.

## 3. Settings

Normal Settings hierarchy is:

```text
Meeting
History & Privacy
Advanced
    -> Diagnostics
```

Meeting exposes familiar selectors for `Your microphone` and `Meeting sound` using
the same `runtimeProductFacade` selection authority as First Setup. Candidate
failure returns the control to the previous persisted value. A successful microphone
preference change is re-read through canonical product readiness instead of treating
native enumeration/config success as full Meeting readiness.

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
reflects the configured microphone probe. Incoming remains explicitly not connected.

The visible `Start Translation` control remains intentionally disabled. The product
Start preflight now distinguishes two different facts:

```text
generation-aware ASR -> Translate -> TTS -> Meeting route stages exist
!=
a safe continuous Meeting runtime exists
```

A rolling `ready_for_target_asr_frame` buffer is **not** accepted as a final/stable
utterance. Promoting it directly could make partial speech audible in the meeting,
which conflicts with approved product behavior.

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

## 7. Application Meeting Session Authority And Finalized Outbound Pipeline

Canonical session ownership remains in:

```text
src-tauri/src/engine/runtime_state.rs
src-tauri/src/commands/meeting_session.rs
```

Registered lifecycle commands remain:

```text
get_meeting_session_status
start_meeting_translation
stop_meeting_translation
```

The runtime session snapshot carries:

```text
session_id
generation
authority_active
phase
```

Current session authority contract:

- one application Meeting session authority may own Meeting resources at a time;
- each new session receives a monotonically advancing generation;
- duplicate Start cannot overwrite an existing session;
- Stop revokes the current generation before resource cleanup;
- clearing session state invalidates old generation authority;
- legacy capture-only behavior remains separate from product Translation Live.

### Generation-aware finalized-segment stages

`meeting_session.rs` now owns one product outbound stage function for an audio file
that has **already been finalized by the audio/segmentation owner**:

```text
finalized Indonesian WAV
-> canonical helper task `transcribe`
-> generation check
-> canonical helper task `translate`
-> generation check
-> canonical helper task `synthesize`
-> generation check
-> generation-aware guarded Meeting route dispatch
```

The product stage path deliberately uses the worker's actual canonical tasks:

```text
transcribe
translate
synthesize
```

It does not promote developer stub task names such as `asr_decode`,
`translation_handoff`, or `tts_handoff` into product execution.

Generation is checked after every blocking AI stage before the result can advance to
the next stage. A TTS file produced after generation revocation is discarded instead
of being routed. The Meeting route checks generation again immediately before
provider execution.

### Cancellable Meeting route

`virtual_audio_route_runtime.rs` now has a Meeting-specific provider path that:

- requires current authoritative Meeting generation before provider launch;
- carries the Meeting generation in the route provider payload;
- requires the explicit runtime execution guard instead of accepting a dry-run as
  product delivery;
- runs the provider in a cancellable child-process boundary;
- polls generation/cancel state while route playback is in progress;
- kills/cancels the route provider when Stop revokes the generation;
- accepts product delivery only when the provider reports both
  `route_execution_attempted` and `audio_route_ready`.

Actual audio arrival at Zoom/Meet/Teams remains **LOCAL PROOF REQUIRED**.

### Remaining blocker: finalized utterance source

The current live capture owner exposes a rolling audio window and
`ready_for_target_asr_frame`. That means “enough current audio exists for ASR”, not
“the user's utterance is final/stable”. No current source owner yet connects
minimum/end-silence/adaptive finalization into a one-shot product utterance that can
be consumed exactly once.

For that reason Start remains fail-closed on:

```text
meeting_session:finalized_utterance_source_not_connected
meeting_session:continuous_outbound_runtime_not_connected
```

This is intentional safety behavior, not a missing button wiring bug.

Classification: **SESSION AUTHORITY + FINALIZED-STAGE CONTRACT ALIGNED / FINAL UTTERANCE SOURCE MISSING**.

## 8. Translation Context And Tone

Current source does not yet prove approved tone behavior reaches inference or that
committed Meeting chronology/canceled-turn exclusion is implemented. History/Saved
remains retrieval only and never automatic model context.

Classification: **PARTIAL / MISSING**.

## 9. Meeting Audio Route And Incoming Assistance

The managed outbound route remains `TranslateIT Meeting Microphone`.

Product Meeting route execution is now generation-aware and cancellation-signalled,
so a Stop/revoked generation cannot legitimately start a new route provider action.
If a provider is already running, the Meeting-specific route owner receives a cancel
flag and terminates the provider process rather than waiting for old playback to
finish normally.

This is static source contract only. Device routing, provider dependencies, route
latency, and actual audio delivery on Windows remain **LOCAL PROOF REQUIRED**.

Meeting Sound device preference is selected/committed safely, but this still does
not implement the separate incoming capture/ASR/translation lane or self-output
suppression.

Classification: outbound route **GENERATION-CANCELLABLE SOURCE CONTRACT / WINDOWS PROOF REQUIRED**; incoming **PARTIAL / MISSING**.

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
canonical helper worker (`transcribe / translate / synthesize`)
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
developer handoff/cache readiness as Meeting Start proof
rolling ASR-ready audio treated as final Meeting speech
```

### Still requires later reconciliation

```text
finalized outbound utterance producer / exactly-once consumption from live capture
continuous connection from finalized utterance producer to generation-aware outbound stages
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
