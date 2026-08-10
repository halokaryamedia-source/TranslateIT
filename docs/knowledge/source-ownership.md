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
| Product shell/navigation | `src/main.ts`, `SimpleLauncherController.ts` | **ALIGNED / VISUAL PARTIAL** | Meeting / Text / History / Settings; navigation does not own/recreate Meeting runtime. |
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

`meeting_session.rs` is the one transient conversation-body owner because it is the
first boundary where final utterance identity, generation authority, final ASR,
verified translation, TTS progress, and output outcome coexist.

```text
MeetingCommittedTurn
├─ session_id
├─ sequence                 # monotonic across Resume generations
├─ generation
├─ utterance_id
├─ lane = you
├─ source_text
├─ translated_text
├─ delivery_state
├─ created_unix_ms
└─ updated_unix_ms
```

Dedupe identity is `(session_id, generation, utterance_id)`. Delivery states are
`preparing_voice`, `speaking`, `output_complete`, `output_failed`, and `interrupted`.
Terminal states cannot be overwritten by stale callbacks. ASR/translation failure
before verified translation does not create a committed turn.

The transient store is bounded and exposes `dropped_turn_count`/`truncated`. Pause
retains turns and interrupts revoked-generation non-terminal work; Resume appends turns
for the same session with fresh generation identity.

## 3. Read-Only Meeting Live Transcript

Conversation bodies are deliberately absent from `MeetingSessionStatus`.

```text
get_meeting_committed_turns
-> MeetingCommittedTurnsSnapshot
-> runtimeApi
-> MeetingLiveActivityPresentation
```

The frontend reconstructs its rendered list from each backend snapshot rather than
accumulating a second transcript store. It renders current outbound turns as `YOU`,
with Indonesian final text primary, English verified translation secondary, and a
truthful delivery state. A lifecycle/snapshot `session_id` mismatch is not rendered as
current content. Bounded truncation is disclosed.

User content is written with DOM `textContent`. Rolling audio, legacy pipeline state,
worker response JSON, Diagnostics, and logs are not Live transcript sources.

## 4. Meeting History Finalization

Persistent History remains solely owned by `engine/history_store.rs` under:

```text
UserData/SavedProject/History/
├─ Recent/
└─ Saved/
```

There are no live incremental Meeting History writes. Full Stop performs the only
current automatic Meeting persistence handoff:

```text
revoke generation authority
-> interrupt revoked-generation non-terminal turns
-> cancel route / stop capture / cancel helper / join outbound consumer
-> immutable committed-turn snapshot
-> load current RuntimeSettings.history_enabled
   -> ON  -> create_meeting_recent(...)
   -> OFF -> no Recent write
-> clear transient committed turns
-> clear runtime Meeting session
```

History persistence failure cannot prevent safety-critical Stop. The failure is
reported in the Stop result; transient conversation bodies are still cleared.

`create_meeting_recent(...)` is idempotent on the canonical Meeting `session_id` and
creates at most one Recent entry. Empty Meetings create no empty History entry.

### Persistent contract

History schema version 2 adds backward-compatible:

```text
dropped_turn_count
```

with a serde default so existing entries remain readable. If History's own turn bound
removes old entries, the count increases rather than hiding truncation.

Finalized Meeting entries reuse `HistoryEntry` / `HistoryTurn`:

```text
entry_type = meeting
created/updated time + duration
interrupted
dropped_turn_count
source_language = id
target_language = en
tone = Auto
mode = Realtime
turns[] -> sequence / lane / source / translation / delivery state / time
```

Raw microphone/Meeting audio and generated TTS are not normal History content.

History OFF affects only new/current retention. It does not delete existing Recent or
Saved entries. Saved remains an explicit copy/ownership action using the existing
generic Save/Remove path.

## 5. History Product Surface

The existing History collection supports `All / Meeting / Text` filters and Meeting
rows with time/duration/status. Finalized Meeting detail now reuses the transcript
visual language as a read-only artifact:

```text
YOU
Indonesian final transcript
English verified translation
delivery state
```

If a finalized entry inherited bounded live truncation, History detail explicitly
reports the missing earlier-turn count. The same Save/Remove from Saved actions apply
to Meeting and Text entries; no separate Meeting History controller/store exists.

## 6. Other Runtime Boundaries

One helper scheduler remains with waiting priority:

```text
Meeting > Text > Diagnostics / preload
```

This does not preempt Text inference already running. Actual contention/latency remains
local proof.

Translation input bounds, EOS completion requirements, and explicit English-capable TTS
selection remain source-aligned; actual quality/performance is local proof.

Static model installation, current worker capability, request success, and product
readiness remain distinct facts. `WorkerRuntime/pyproject.toml` is the single Python
dependency/tooling owner; Ruff/pytest execution and `uv.lock` resolution remain later.

## 7. Remaining Core Work

```text
plan global/cross-view Meeting state + safe close lifecycle boundary
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
store, transcript accumulator, History root/database, dependency manifest, lint stack,
or test framework to solve these.

## 8. Other Product Boundaries

Incoming Meeting Sound remains a separate unimplemented lane. Documents remains
retired. Audio Studio remains post-core. Svelte remains a separate future frontend
architecture decision after core runtime contracts stabilize.

## Current Mode / Continuation

Current mode: **Plan**.  
Execution channel: `ChatGPT -> GitHub`.

Engine consolidation, finalized outbound production, canonical Start/Stop,
Pause/Resume fresh-generation lifecycle, bounded committed-turn source, Live transcript
read path, and Meeting History finalization handoff are source-aligned at their bounded
claims. No compile/typecheck/validator execution, filesystem persistence runtime,
model/Windows runtime/rendered UI, audio-quality, race-timing, or performance proof has
been obtained in this channel.

The single continuation is `docs/knowledge/next-action.md`.
