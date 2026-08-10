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
installed-runtime, persistence-runtime, native-event-runtime, or release proof.

## Executive Ownership Map

| Boundary | Current owner(s) | Status | Current truth |
|---|---|---|---|
| Product shell/navigation | `src/main.ts`, `shell.ts`, `lockedReferenceShellParts.ts`, `SimpleLauncherController.ts` | **ALIGNED / VISUAL PARTIAL** | Meeting / Text / History / Settings; navigation does not own/recreate Meeting runtime. |
| Global Meeting cross-view presentation | existing shell + `GlobalMeetingShell.ts` -> canonical Meeting status/facade | **SOURCE ALIGNED / RENDER PROOF LATER** | One compact strip reads canonical Meeting state outside Meeting; no frontend Meeting store or global lifecycle control plane. |
| Native safe-close lifecycle | `GlobalMeetingShell.ts` close guard + `src-tauri/src/main.rs` orderly-exit fail-safe -> canonical `stop_meeting_translation` | **SOURCE ALIGNED / NATIVE RUNTIME PROOF LATER** | Active/unknown Meeting state fails closed; Stop & Close reuses canonical Stop and forced window destroy occurs only after verified session clear. |
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
| Incoming Meeting assistance | current Meeting Sound/audio/runtime candidates | **MISSING / PLAN NEXT** | EN Meeting Sound -> ID committed incoming turns and self-output suppression do not yet have one approved source boundary. |
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

No shell/global/window source owns a second lifecycle store or cleanup sequence.

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

## 5. Desktop Shell And Cross-View Meeting Presentation

Current shell ownership is:

```text
src/main.ts
-> SimpleLauncherController        [navigation / normal Meeting actions]
-> shell.ts                         [shell-level markup composition]
-> GlobalMeetingShell.ts            [global read-only presentation + close orchestration]
```

`GlobalMeetingShell.ts` is an implementation helper under the existing desktop shell
boundary. It is **not** a Meeting lifecycle controller or state store.

Its cross-view read path is deliberately small:

```text
bounded refresh
-> runtimeApi.getMeetingSessionStatus
-> mapProductMeetingState
-> global Meeting strip
```

It does not run the full product readiness/Diagnostics bundle to maintain the strip and
does not read committed transcript bodies.

The strip is shown only outside Meeting while an application-owned Meeting session
exists. It can present current Starting / Live / Paused / Resuming / Stopping states
and existing outbound `Needs attention`. The only action is `Open Meeting`, delegated
through the existing Meeting navigation button/controller. Local Meeting Pause/Resume/
Stop controls remain on Meeting.

## 6. Safe Native Close Lifecycle

The frontend native-window guard uses the current Tauri v2 close-request boundary:

```text
close requested
-> prevent requested close
-> fresh get_meeting_session_status

no session
-> Window.destroy()

application Meeting session
-> shell dialog: Keep Open / Stop & Close

status unknown / other runtime owner
-> keep window open
```

`Window.destroy()` is used only as the final transport operation after safety has been
verified. `src-tauri/capabilities/default.json` grants the main window the required
`core:window:allow-destroy` permission in addition to existing `core:default`.

The dialog is shell presentation only. It does not carry lifecycle truth.

### Stop & Close

```text
Stop & Close
-> runtimeProductFacade.runProductMeetingAction("stop")
-> stop_meeting_translation
-> canonical authority/resource/History finalization
-> returned product state must show no session
-> fresh get_meeting_session_status must still show no session
-> Window.destroy()
```

A sent Stop command is not considered completion. Unknown state, failed Stop, or a
remaining session keeps the application open.

If lifecycle is already `Stopping`, the shell does not dispatch another Stop. A local
`closeAfterExistingStop` flag represents only the pending close request; bounded status
reads wait for the canonical existing Stop to clear the session before destroy.

### Orderly native-exit fail-safe

`src-tauri/src/main.rs` now uses the Tauri App run-event callback. On orderly
`RunEvent::ExitRequested`, it checks lightweight canonical runtime ownership and, if
the application Meeting still exists, calls the same
`commands::meeting_session::stop_meeting_translation()` owner.

The native exit layer does not call capture/helper/History internals directly. If the
canonical Meeting still exists and the main control window is available, it prevents
exit and restores the window. It does not intentionally keep a windowless invisible
process running after failed cleanup.

This remains source alignment only. Actual event order, close races, forced process
termination, OS crash, and Windows lifecycle behavior require local/platform proof.

## 7. Static Regression Contract

`validate_startup_runtime_readiness.mjs` defines source checks for:

- shell/global Meeting startup and markup wiring;
- lightweight canonical status reads and facade mapping;
- absence of direct duplicate Meeting actions/capture/transcript ownership in the
  global shell;
- close-request prevention + post-Stop verified destroy;
- `core:window:allow-destroy` capability;
- orderly native-exit delegation to canonical Stop;
- absence of duplicate capture/helper/History cleanup in native main;
- preservation of committed-turn and Meeting History ownership.

The validator is defined but has **not** been executed in the current
`ChatGPT -> GitHub` channel.

## 8. Other Runtime Boundaries

One helper scheduler remains with waiting priority `Meeting > Text > Diagnostics /
preload`; it does not preempt Text inference already running. Translation input bounds,
EOS completion requirements, and explicit English-capable TTS selection remain
source-aligned; actual quality/performance remains local proof.

`WorkerRuntime/pyproject.toml` is the single Python dependency/tooling owner. Ruff/
pytest execution and `uv.lock` resolution remain later.

## 9. Remaining Core Work

```text
plan incoming Meeting Sound + self-output suppression boundary
translation tone/context consumption
Text Copy/direct Save
multi-instance enforcement + sleep/hibernate lifecycle
uv.lock + real dependency resolution
Ruff / pytest / TypeScript / Rust execution proof
scheduler contention measurement
actual model translation/TTS quality + performance
Windows microphone/VAD/Meeting route/native-close proof
packaging/clean-machine reconciliation
```

Do not add a second worker, finalizer, scheduler, readiness service, Meeting lifecycle
store, transcript accumulator, History root/database, native close lifecycle authority,
dependency manifest, lint stack, or test framework to solve these.

## 10. Other Product Boundaries

Incoming Meeting Sound remains the next unresolved core semantic boundary. Product
policy requires a separate optional/degradable incoming lane and self-output
suppression, but current source ownership for capture/finalization/turn integration is
not yet resolved and must be planned before implementation.

Documents remains retired. Audio Studio remains post-core. Svelte remains a separate
future frontend architecture decision after core runtime contracts stabilize.

## Current Mode / Continuation

Current mode: **Plan**.  
Execution channel: `ChatGPT -> GitHub`.

Engine consolidation, finalized outbound production, canonical Start/Stop,
Pause/Resume fresh-generation lifecycle, bounded committed-turn source, Live transcript
read path, Meeting History finalization, global cross-view Meeting presentation, and
safe Stop & Close are source-aligned at their bounded claims. No compile/typecheck/
validator execution, native close runtime, filesystem persistence runtime,
model/Windows runtime/rendered UI, audio-quality, race-timing, or performance proof has
been obtained in this channel.

The single continuation is `docs/knowledge/next-action.md`.
