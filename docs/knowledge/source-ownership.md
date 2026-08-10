# TranslateIT — Source Ownership And Reconciliation Map

**Status:** current source map  
**Updated:** 2026-08-10  
**Branch:** `New`

This file maps product responsibilities to current semantic/source owners. It is not
a backlog, session log, or runtime proof report. `docs/knowledge/next-action.md` owns
the single active continuation.

Status vocabulary:

```text
ALIGNED   -> one current owner substantially matches approved behavior
PARTIAL   -> useful owner exists but required behavior/proof is incomplete
CONFLICT  -> more than one current path competes for the same responsibility
MISSING   -> approved capability has no complete current owner
STALE     -> source still expresses superseded behavior
RETIRED   -> inherited concept is no longer approved product scope
```

Static source/tooling alignment never becomes model-quality, latency,
scheduling-performance, VAD behavior, CUDA/CPU, Windows-device/audio, rendered-UI,
installed-runtime, persistence-runtime, or release proof.

## Executive Ownership Map

| Boundary | Current owner(s) | Status | Current truth |
|---|---|---|---|
| Product shell/navigation | `src/main.ts`, `lockedReferenceShellParts.ts`, `SimpleLauncherController.ts` | **ALIGNED / VISUAL PARTIAL** | Meeting / Text / History / Settings; navigation does not own/recreate Meeting runtime. |
| Global Meeting cross-view presentation | existing shell markup + `SimpleLauncherController.ts` reading canonical Meeting status | **PLANNED / IMPLEMENTATION NEXT** | Compact active-Meeting strip belongs to the existing shell; it is read-only presentation and must not create a lifecycle store. |
| Native safe-close lifecycle | existing desktop controller/window boundary + Tauri app lifecycle -> canonical `stop_meeting_translation` | **PLANNED / IMPLEMENTATION NEXT** | Active/unknown Meeting state must prevent normal close; `Stop & Close` reuses canonical Stop, and orderly native exit delegates to the same backend cleanup owner. |
| First Setup | First Setup + `RuntimeSettings` + product/audio facade | **ALIGNED SOURCE / WINDOWS PROOF LATER** | Five-step flow, defer/resume, candidate-check -> commit. |
| Normal Meeting lifecycle bridge | `runtimeApi.ts` -> `runtimeProductFacade.ts` -> `SimpleLauncherController.ts` -> Meeting commands | **SOURCE ALIGNED / TAURI + RENDER PROOF LATER** | Start/Pause/Resume/Stop use the canonical application Meeting authority. |
| Meeting application authority | `runtime_state.rs`, `meeting_session.rs` | **SOURCE ALIGNED / RUNTIME PROOF LATER** | `session_id + generation + authority_active`; Pause retains session, Resume creates fresh generation. |
| Meeting capture/finalization | `audio/live_capture.rs`, `audio/finalized_utterance.rs`, `audio/live_segment_writer.rs` | **SOURCE ALIGNED / AUDIO PROOF LATER** | Rolling preview stays separate from finalized speech; product output uses bounded generation-scoped finals and unique temporary WAVs. |
| Serialized Meeting outbound | `meeting_session.rs` | **SOURCE ALIGNED / RUNTIME PROOF LATER** | One consumer performs final ASR -> Realtime translation -> TTS -> guarded Meeting route. |
| Committed Meeting turn source | `meeting_session.rs` bounded transient store | **SOURCE ALIGNED / RUNTIME PROOF LATER** | Final transcript + verified translation become one memory-only session-scoped canonical turn source. |
| Meeting Live transcript read path | `get_meeting_committed_turns` -> `runtimeApi.ts` -> `MeetingLiveActivityPresentation.ts` | **SOURCE ALIGNED / TAURI + RENDER PROOF LATER** | Frontend renders backend snapshots; no browser accumulator or worker/Diagnostics scraping. |
| Meeting History finalization | `meeting_session.rs` Stop handoff -> `history_store.rs` | **SOURCE ALIGNED / FILESYSTEM + RENDER PROOF LATER** | Full Stop snapshots final committed turns, checks current `history_enabled`, optionally creates one Recent Meeting entry, then clears transient bodies. |
| History / Saved | `history_store.rs`, `history.rs`, `SimpleLauncherController.ts` History surface | **SOURCE ALIGNED / FILESYSTEM + RENDER PROOF LATER** | Text and finalized Meeting entries share canonical `Recent/Saved`; Saved remains explicit and independent. |
| Text AI execution | `text_translate.rs` -> helper scheduler -> `realtime_local_worker.py` | **SOURCE ALIGNED / LOCAL PROOF LATER** | One persistent worker route; Text explicitly requests Quality. |
| Helper scheduling / cancellation | `helper_bridge.rs`, `helper_bridge_runtime.rs` + Meeting generation authority | **SOURCE ALIGNED / CONTENTION PROOF LATER** | One scheduler; waiting Meeting > Text > Diagnostics; stale/matching Meeting work is cancelled generation-aware. |
| Translation bounds/completeness | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL PROOF LATER** | No silent input truncation; output requires verifiable EOS completion. |
| English TTS voice selection | `realtime_local_worker.py` | **SOURCE ALIGNED / WINDOWS + ASSET PROOF LATER** | Explicit English-capable Piper/SAPI voice required. |
| Product readiness | Meeting preflight/session + worker capability -> product facade | **SOURCE ALIGNED / LOCAL PROOF LATER** | Meeting/Text readiness remain capability-scoped. |
| Python dependency/tooling | `WorkerRuntime/pyproject.toml` | **SOURCE ALIGNED / LOCK + EXECUTION PROOF LATER** | One Python dependency/Ruff/pytest owner; `uv.lock` is not fabricated. |
| Meeting outbound audio route | virtual-route owners | **PARTIAL / WINDOWS PROOF REQUIRED** | Generation-aware route cancellation exists; actual delivery unproved. |
| Incoming Meeting assistance | audio/capture/runtime candidates | **MISSING / PARTIAL** | EN Meeting Sound -> ID text and self-output suppression are not implemented. |
| Translation tone/context | settings + inherited adapters | **MISSING / PARTIAL** | Approved tone/context do not yet reach canonical inference. |
| Packaging/runtime assets | Tauri/NSIS + helper discovery | **PARTIAL / STALE ASSUMPTIONS** | End-user packaged runtime/model acquisition remains unresolved. |
| Document Translation | no active workspace | **RETIRED** | Do not revive Documents/file-attachment translation. |
| Audio Studio | explicit entry + backend contracts | **PARTIAL / POST-CORE** | Preserve post-core; not current core blocker. |

## 1. Canonical Product Meeting Lifecycle

```text
Meeting workspace
-> runtimeProductFacade
-> runtimeApi
-> get_meeting_session_status
   / start_meeting_translation
   / pause_meeting_translation
   / resume_meeting_translation
   / stop_meeting_translation
-> application Meeting session authority
```

`runtimeProductFacade.mapProductMeetingState()` recognizes only
`translateit_application_meeting` as product Meeting ownership. Pause retains
`session_id` while invalidating old generation authority. Resume assigns a fresh
generation before required resources return Live. Navigation remains presentation-only.

No shell/global/window source may create another lifecycle store or cleanup sequence.

## 2. Canonical Outbound And Committed Turns

```text
physical microphone
-> application capture
   +-> rolling preview [diagnostic only]
   +-> finalized utterance producer
-> session_id + generation + utterance_id
-> serialized Meeting consumer
-> final Indonesian ASR
-> generation check
-> verified Realtime English translation
-> generation check
-> committed-turn transient source
-> English TTS
-> generation check
-> guarded Meeting Microphone route
```

`meeting_session.rs` is the one transient conversation-body owner. Dedupe identity is
`(session_id, generation, utterance_id)`; session chronology uses monotonic `sequence`.
Delivery states are `preparing_voice`, `speaking`, `output_complete`, `output_failed`,
and `interrupted`, with terminal-state protection. The store is bounded and exposes
`dropped_turn_count` / `truncated`.

## 3. Read-Only Meeting Live Transcript

Conversation bodies remain absent from `MeetingSessionStatus`.

```text
get_meeting_committed_turns
-> MeetingCommittedTurnsSnapshot
-> runtimeApi
-> MeetingLiveActivityPresentation
```

Meeting Live rebuilds the transcript from backend snapshots and checks lifecycle/
transcript `session_id` before rendering. It does not become conversation authority.
Rolling audio, worker response JSON, legacy pipeline state, Diagnostics, and logs are
not transcript sources.

## 4. Meeting History Finalization

Persistent History remains solely owned by `engine/history_store.rs` under the existing
`UserData/SavedProject/History/{Recent,Saved}` root. There are no live incremental
Meeting History writes.

Full Stop:

```text
revoke generation authority
-> interrupt current non-terminal turn state
-> cancel route / stop capture / cancel helper / join outbound consumer
-> immutable committed-turn snapshot
-> current history_enabled
   -> ON  -> create_meeting_recent(...)
   -> OFF -> no Recent write
-> clear transient committed turns
-> clear Meeting runtime session
```

History write failure cannot keep the live Meeting session alive. `create_meeting_recent`
is idempotent on canonical session id. History schema v2 carries backward-compatible
`dropped_turn_count`. The existing History collection/detail and generic Save/Remove
path support Meeting and Text.

## 5. Existing Desktop Shell / Window Source

Current shell source is:

```text
src/main.ts
-> SimpleLauncherController
-> shell.ts
-> lockedReferenceShellParts.ts
```

`SimpleLauncherController` already owns workspace navigation and the normal Meeting
product actions. It holds no independent backend Meeting authority; its lifecycle
state is mapped from `runtimeProductFacade`.

Current native-window source is minimal:

```text
frontend windowRescue.ts
-> getCurrentWindow() for show/size/focus recovery

src-tauri main.rs
-> Builder setup
-> app_bootstrap::configure_main_window
-> app.run(...)
```

There is currently no native close-request guard, no Stop-before-close orchestration,
and no orderly-exit Meeting cleanup hook.

`MeetingLiveActivityPresentation.ts` is deliberately local to the visible Meeting
workspace. It is not the planned global strip owner.

## 6. Planned Global Meeting Cross-View Presentation

The existing application shell/controller owns the global presentation boundary.
Implementation should add one compact strip as a shell element rather than a new page
or controller.

Read path:

```text
bounded shell refresh
-> runtimeApi.getMeetingSessionStatus
-> mapProductMeetingState
-> global Meeting strip
```

The read must remain lightweight; it must not repeatedly load the full readiness/
Diagnostics/model bundle merely to update a strip.

The strip is visible outside Meeting when the application Meeting session exists and
may present `Starting / Live / Paused / Resuming / Stopping / Needs attention`. It is
hidden while viewing Meeting and when no application Meeting session exists.

Initial global action surface is only `Open Meeting`, delegated to existing navigation.
Normal Pause/Resume/Stop stay on Meeting. `Stop Voice` remains later because its
canonical runtime action is not implemented.

## 7. Planned Safe Close Lifecycle

Approved close behavior is distinct from minimize:

```text
minimize/hide
-> keep healthy Meeting running

native close + verified no application Meeting session
-> close normally

native close + application Meeting session
-> prevent close
-> shell confirmation: Keep Open / Stop & Close

native close + Meeting status unavailable/unknown
-> prevent close
-> keep control plane visible
```

`Stop & Close` must call the same existing product/backend Stop path as Meeting:

```text
runtimeProductFacade.runProductMeetingAction("stop")
-> stop_meeting_translation
-> canonical cleanup + History finalization
-> returned Meeting state confirms no session
-> native close permitted once
```

A sent Stop request is not sufficient evidence to close. Failure or remaining session
keeps the window open. A local one-shot close-permission flag is transport state only,
not Meeting state.

If lifecycle is already `Stopping`, the close guard waits for the existing canonical
Stop instead of starting another cleanup. If close is explicitly requested during
`Starting`/`Resuming`, Stop & Close is newer user intent and uses the same backend Stop
authority; generation guards must prevent the older transition from reviving output.

For orderly application exits that bypass the normal frontend prompt, `main.rs` /
`app_bootstrap.rs` should delegate once to the same backend Stop/finalization owner.
This native hook is a fail-safe, not a second lifecycle implementation. Exact current
Tauri v2 event APIs must be verified from official documentation before coding.

Forced process termination, OS crash, and power loss remain platform/runtime proof
boundaries and cannot be claimed safe from static source.

## 8. Other Runtime Boundaries

One helper scheduler remains with waiting priority `Meeting > Text > Diagnostics /
preload`; it does not preempt Text inference already running. Translation input bounds,
EOS completion requirements, and explicit English-capable TTS selection remain
source-aligned; actual quality/performance remains local proof.

`WorkerRuntime/pyproject.toml` is the single Python dependency/tooling owner. Ruff/
pytest execution and `uv.lock` resolution remain later.

## 9. Remaining Core Work

```text
implement global Meeting strip + safe Stop & Close
incoming Meeting lane + self-output suppression
translation tone/context consumption
Text Copy/direct Save
uv.lock + real dependency resolution
Ruff / pytest / TypeScript / Rust execution proof
scheduler contention measurement
actual model translation/TTS quality + performance
Windows microphone/VAD/Meeting route proof
packaging/clean-machine reconciliation
```

Do not add a second worker, finalizer, scheduler, readiness service, Meeting lifecycle
store, transcript accumulator, History root/database, native close lifecycle authority,
dependency manifest, lint stack, or test framework to solve these.

## 10. Other Product Boundaries

Incoming Meeting Sound remains a separate unimplemented lane. Documents remains
retired. Audio Studio remains post-core. Svelte remains a separate future frontend
architecture decision after core runtime contracts stabilize.

## Current Mode / Continuation

Current mode: **Developing**.  
Execution channel: `ChatGPT -> GitHub`.

Engine consolidation, finalized outbound production, canonical Start/Stop,
Pause/Resume fresh-generation lifecycle, bounded committed-turn source, Live transcript
read path, and Meeting History finalization are source-aligned at their bounded claims.
Global cross-view presentation and safe close ownership are now planned but not source-
implemented. No compile/typecheck/validator execution, native close runtime,
filesystem persistence runtime, model/Windows runtime/rendered UI, audio-quality,
race-timing, or performance proof has been obtained in this channel.

The single continuation is `docs/knowledge/next-action.md`.
