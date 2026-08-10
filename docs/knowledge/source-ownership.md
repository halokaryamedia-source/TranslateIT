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
installed-runtime, or release proof.

## Executive Ownership Map

| Boundary | Current owner(s) | Status | Current truth |
|---|---|---|---|
| Product shell/navigation | `src/main.ts`, `SimpleLauncherController.ts` | **ALIGNED / VISUAL PARTIAL** | Normal app is Meeting / Text / History / Settings; navigation does not own/recreate Meeting runtime. |
| First Setup | First Setup + `RuntimeSettings` + product/audio facade | **ALIGNED SOURCE / WINDOWS PROOF LATER** | Five-step flow, defer/resume, candidate-check -> commit. |
| Normal Meeting lifecycle bridge | `runtimeApi.ts` -> `runtimeProductFacade.ts` -> `SimpleLauncherController.ts` -> canonical Meeting commands | **SOURCE ALIGNED / TAURI + RENDER PROOF LATER** | Normal product reads application Meeting session directly; Start/Pause/Resume/Stop use the canonical lifecycle; no frontend Meeting authority/store was added. |
| Meeting Live activity presentation | `MeetingLiveActivityPresentation.ts` -> `get_meeting_session_status` + existing Meeting panel | **SOURCE ALIGNED / RENDER PROOF LATER** | Read-only current activity uses canonical outbound stage/state only; it does not mutate lifecycle or accumulate transcript bodies. |
| Committed Meeting turn / chronological transcript source | `meeting_session.rs` transient bounded turn owner -> read-only product projection | **PARTIAL / OWNER DECIDED** | The existing outbound/session boundary will own committed turn bodies after verified translation; frontend, worker, Diagnostics, `runtime_state.rs`, and History are explicitly not live transcript owners. Source implementation is next. |
| Text AI execution | `text_translate.rs` -> helper scheduler -> `realtime_local_worker.py` | **SOURCE ALIGNED / LOCAL PROOF LATER** | One persistent worker route; Text explicitly requests Quality. |
| Meeting application authority | `runtime_state.rs`, `meeting_session.rs` | **SOURCE ALIGNED / RUNTIME PROOF LATER** | `session_id + generation + authority_active` is canonical; Pause retains the session while revoking its generation, and Resume creates fresh generation authority before Live. |
| Meeting capture | `audio/live_capture.rs` | **SOURCE ALIGNED / WINDOWS PROOF LATER** | One CPAL capture owner; application Meeting capture feeds rolling preview and finalized speech paths separately and is reopened for fresh Resume generation. |
| Rolling audio / preview boundary | `audio/live_audio_buffer.rs` | **ALIGNED DIAGNOSTIC/PREVIEW OWNER** | ASR-ready rolling windows are not final speech and are not consumed by product Meeting output. |
| Finalized outbound utterance | `audio/finalized_utterance.rs` | **SOURCE ALIGNED / VAD PROOF LATER** | Realtime VAD state produces generation-scoped final utterances only after adaptive end silence; generation loss clears/rejects pending work. |
| Finalized WAV handoff | `audio/live_segment_writer.rs` | **SOURCE ALIGNED / FILESYSTEM PROOF LATER** | Each final gets a unique temporary 16 kHz mono WAV; rolling `latest_live_target_segment.wav` is diagnostic-only. |
| Serialized Meeting outbound consumer | `meeting_session.rs` | **SOURCE ALIGNED / RUNTIME PROOF LATER** | One consumer takes each final utterance once; Pause clears/joins the old-generation consumer and Resume starts one for the fresh generation. |
| Meeting outbound AI mode | `meeting_session.rs` | **SOURCE ALIGNED / MODEL PROOF LATER** | Finalized outbound speech explicitly requests Realtime translation. |
| Helper scheduling / worker I/O | `helper_bridge.rs`, `helper_bridge_runtime.rs` | **SOURCE ALIGNED / CONTENTION PROOF LATER** | One scheduler owns stdin/stdout; waiting Meeting > Text > Diagnostics. |
| Helper cancellation | helper bridge + Meeting generation authority | **SOURCE ALIGNED / TIMING PROOF LATER** | Stale Meeting work is rejected; Pause/Stop can target matching in-flight Meeting generation work, which may hard-cancel the worker process. |
| Translation source bounds | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL PROOF LATER** | No silent tokenizer truncation; unknown/oversized model-token input is rejected. |
| Translation output completeness | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL EXECUTION PROOF LATER** | Output is promoted only when EOS completion is verifiable. |
| English TTS voice selection | `realtime_local_worker.py` | **SOURCE ALIGNED / WINDOWS + ASSET PROOF LATER** | Piper requires English metadata; SAPI requires English culture and explicit `SelectVoice`. |
| Model installation evidence | `model_manifest.json`, `runtime_inventory.rs` | **ALIGNED STATIC OWNER / METADATA PARTIAL** | Asset presence only, not model-load/inference proof. |
| Current AI capability availability | persistent worker `status` -> helper bridge | **SOURCE ALIGNED / LOAD-INFERENCE PROOF LATER** | ASR / Realtime translation / Quality translation / explicit-English TTS capability states are scoped. |
| Product readiness | direct `MeetingSessionPreflight` + worker capability -> `runtimeProductFacade.ts` | **SOURCE ALIGNED / LOCAL PROOF LATER** | Text uses Quality capability; Meeting uses canonical application preflight/session, including intentional Paused state, rather than legacy gates. |
| Python dependency/tooling ownership | `WorkerRuntime/pyproject.toml` | **SOURCE ALIGNED / LOCK + EXECUTION PROOF LATER** | One Python project owns runtime deps, optional route extra, Ruff, and pytest. `uv.lock` is intentionally not fabricated. |
| Python deterministic proof | `WorkerRuntime/tests/test_worker_contract.py` + pytest config | **SOURCE ALIGNED / NOT EXECUTED** | Deterministic mode/bounds/EOS/voice/protocol test definitions exist. |
| Python source quality policy | Ruff config in `pyproject.toml` | **SOURCE ALIGNED / NOT EXECUTED** | Ruff is the single Python lint/format policy. |
| Local Python profiling | `py-spy` procedure in WorkerRuntime README | **DOCUMENTED / LOCAL ONLY** | Profile the actual persistent worker PID; py-spy is not a product dependency. |
| Persistent worker smoke | `run_realtime_worker_smoke.ps1` | **SOURCE ALIGNED / LOCAL PROOF LATER** | One worker process is reused; evidence stores privacy-bounded stage/completion/voice metadata without conversation bodies/file paths. |
| History / Saved | `history_store.rs`, `history.rs`, frontend History | **TEXT ALIGNED / MEETING PARTIAL** | Canonical persistence remains `UserData/SavedProject/History/{Recent,Saved}`. Meeting History will consume an immutable committed-turn snapshot only at finalization when History retention allows it; implementation remains later. |
| Meeting outbound audio route | virtual-route owners | **PARTIAL / WINDOWS PROOF REQUIRED** | Generation-aware route cancellation exists; delivery unproved. |
| Incoming Meeting assistance | audio/capture/runtime candidates | **MISSING / PARTIAL** | Loopback -> EN ASR -> ID text and self-output suppression are not implemented. |
| Translation tone/context | settings + inherited adapters | **MISSING / PARTIAL** | Approved tone/context do not yet reach canonical inference. |
| Packaging/runtime assets | Tauri/NSIS + bridge Python discovery | **PARTIAL / STALE ASSUMPTIONS** | End-user packaged Python/runtime acquisition is unresolved; `uv` is not an end-user requirement. |
| Document Translation | no active workspace | **RETIRED** | Do not revive Documents/file-attachment translation. |
| Audio Studio | explicit entry + backend contracts | **PARTIAL / POST-CORE** | Preserve post-core; not current core blocker. |

## 1. Canonical Product Meeting Lifecycle

Normal product frontend does not keep a second Meeting session truth.

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

`runtimeProductFacade.mapProductMeetingState()` maps backend state into product-level
`Ready / Starting / Live / Paused / Resuming / Stopping / In Use / Setup Needed`
behavior and recognizes only `translateit_application_meeting` as product Meeting
ownership.

Normal Meeting actions:

```text
idle + preflight ready -> Start Translation
Live                   -> Pause Translation or Stop Translation
Paused                 -> Resume Translation or Stop Translation
starting/resuming/stopping -> disabled transition state
blocked/conflict       -> disabled Start + setup/recovery path
```

Pause is not Stop. The application `session_id` remains while old generation authority
is invalidated. Resume keeps that same session identity but assigns a fresh generation
before capture/finalized-consumer resources are reopened and Live is committed.
Duplicate Pause/Resume do not intentionally duplicate session/resource ownership.

Navigation to Text, History, or Settings only changes presentation. It does not call
Meeting lifecycle actions or create a new session. A later global Meeting strip may
expose this same authority across views; it must not introduce another lifecycle store.

Mic Test/direct capture is blocked while a runtime session owns Meeting resources,
including while the application Meeting session is Paused, so diagnostic
`start_capture/stop_capture` cannot silently replace or tear down the canonical
session.

Actual Tauri invocation, rendered transition behavior, navigation while Live/Paused,
and window lifecycle remain local/rendered proof.

## 2. Meeting Live Activity Presentation

The current canonical Meeting status exposes activity but not committed conversation
bodies:

```text
MeetingSessionStatus
-> lifecycle
-> outbound.stage
-> outbound.utterance_sequence
-> outbound.output_active
-> outbound.last_stage_ok
-> outbound.blocker/note (technical evidence, not copied raw into normal UI)
```

`MeetingLiveActivityPresentation.ts` is a read-only view helper. It is started from
the current product entrypoint after the existing `SimpleLauncherController`; it does
not create a lifecycle store, action path, or recovery authority.

When the Meeting workspace is visible and the existing primary Meeting status says
Live/Paused/transitioning, it performs a bounded refresh through
`runtimeApi.getMeetingSessionStatus()` and `mapProductMeetingState()`. It maps the
canonical outbound stage into plain-language `Listening / Transcribing / Translating /
Preparing voice / Speaking / Needs attention / Paused` activity and temporarily
replaces the Ready setup rows with that activity region. When the primary controller
returns to a non-active Meeting state, the Ready composition is restored.

The presentation deliberately does not read worker response JSON, transcript fields,
translated text, rolling audio, Diagnostics, or logs. A failed status read also does
not manufacture Ready/Stopped fallback state; lifecycle presentation remains owned by
the primary controller.

Actual refresh timing and rendered visual behavior remain local/rendered proof.

## 3. Canonical Committed Meeting Turn Boundary — Owner Decided

The transient conversation body belongs to the existing canonical Meeting outbound/
session boundary in `meeting_session.rs`, because that is the first current owner where
finalized utterance identity, authoritative generation, final ASR text, verified
translation, TTS progress, and guarded output outcome coexist.

A turn is eligible to enter this store only after final Indonesian transcript and
verified-complete English translation exist and the same generation remains
authoritative. The planned minimum contract is:

```text
session_id
sequence                 # monotonic for the full session, including across Resume
generation
utterance_id              # generation-local final utterance id
lane = you                # current outbound-only implementation
source_text               # final Indonesian
translated_text           # verified-complete English
delivery_state
created_unix_ms
updated_unix_ms
```

The dedupe/idempotency identity is `(session_id, generation, utterance_id)` while
`sequence` supplies stable chronological ordering across Resume generations and maps
to the existing `HistoryTurn.sequence` field.

Product delivery state is limited to:

```text
preparing_voice
speaking
output_complete
output_failed
interrupted
```

`output_complete` is a truthful TranslateIT-side output completion claim, not a claim
that a remote participant heard it. `output_complete`, `output_failed`, and
`interrupted` are terminal for the turn; late stale callbacks cannot overwrite them.
Pause retains already committed turns but marks non-terminal turns from the revoked
generation interrupted. Resume appends fresh-generation turns to the same session
transcript. Full Stop/finalization clears transient bodies after any allowed History
handoff.

The store is memory-only and bounded. A read snapshot must expose when older turns
were dropped by the bound so the product cannot pretend it is showing the complete
session. The product bridge uses a separate read-only turn projection (planned command
`get_meeting_committed_turns`) rather than attaching conversation bodies to
`get_meeting_session_status`. Lifecycle status remains lightweight and authoritative;
the frontend renders snapshots but does not merge/persist them as another owner.

`runtime_state.rs` remains lifecycle/generation authority only. The Python worker,
Diagnostics/logs, rolling audio, and persistent History remain non-owners for Live
conversation state.

Persistent History remains owned by `history_store.rs`. Its existing `HistoryEntry`
and `HistoryTurn` schema already provide chronological sequence, lane, source text,
translated text, delivery state, and timestamp fields. A later Stop/finalization
handoff may convert an immutable transient snapshot into one Meeting Recent entry when
current `RuntimeSettings.history_enabled` allows retention. If History is off at
finalization, conversation bodies are discarded instead of automatically persisted.
Existing Recent/Saved items are unaffected and Saved remains explicit/independent.
Raw audio and generated TTS are never normal turn/History bodies.

This section is an approved ownership/contract plan; the transient store/read command
is not source-implemented yet.

## 4. Canonical Outbound Speech / AI Execution

Standalone Text:

```text
Text UI
-> runtimeProductFacade
-> runtimeApi.translateText
-> commands/text_translate.rs [Quality]
-> helper scheduler [Text]
-> persistent realtime_local_worker.py
-> verified-complete Quality result
```

Application Meeting:

```text
physical microphone
-> application-owned live capture
   +-> rolling buffer [preview/diagnostic only]
   +-> finalized utterance producer
-> session_id + generation + utterance_id
-> one-shot finalized queue pop
-> unique temporary WAV
-> serialized Meeting consumer
-> ASR
-> generation check
-> Realtime translation + verified completion
-> generation check
-> explicit English TTS
-> generation check
-> guarded Meeting Microphone route
```

`latest_live_target_segment.wav` remains diagnostic-only. Product Meeting uses unique
finalized temporary WAVs and removes them after the outbound attempt.

Pause invalidates the current generation before route/capture/helper/consumer cleanup.
Resume establishes a fresh generation and reopens the same canonical capture/finalized
path; pre-Pause generation work cannot be promoted by the resumed generation.

The outbound processing call already obtains final transcript and verified translation
values. The next implementation extends that same owner into the bounded transient
committed-turn source defined above rather than scraping helper responses or rebuilding
conversation bodies in the frontend.

Retired from product execution:

```text
manual_translation.rs
manual_translation_accelerated.rs
realtime_local_worker_entry.py
realtime_local_worker_accelerated.py
rule/dictionary/preview translation success
legacy capture-owned one-shot AI pipeline
silent Realtime <-> Quality retry
rolling-ASR-window polling as Meeting output
```

## 5. Scheduler / Cancellation

Mode authority:

```text
Meeting outbound -> Realtime
Standalone Text  -> Quality
```

One scheduler exists in the helper bridge. Waiting priority is:

```text
Meeting > Text > Diagnostics / preload
```

This is **queue priority, not preemption**. A Meeting request arriving after active
Text inference still waits for that current task. Local contention/latency proof is
required before calling it realtime-optimal.

Meeting Pause revokes the current application generation first while retaining the
session identity. Matching route/helper work is then cancellation-signalled and the
old capture/finalized consumer is stopped/cleared. If targeted helper cancellation
terminates the persistent worker for matching in-flight Meeting work, Resume may
restore the existing helper runtime before rechecking preflight and allocating a fresh
generation. Unrelated helper work is not cancelled merely because Meeting is paused.

Meeting Stop remains the full-session action: it revokes generation authority, clears
resources, and removes the session. Actual process/race/cancellation timing remains
local proof.

## 6. Finalized Utterance Boundary

`audio/finalized_utterance.rs` owns application Meeting speech finalization.
`audio/live_audio_buffer.rs` remains rolling/preview/diagnostic ownership.

```text
bounded pre-roll
-> existing Realtime VAD speech evidence
-> one in-progress utterance
-> trailing non-speech
-> adaptive end-silence threshold
-> revalidate speech portion
-> FINAL
```

Final identity is `session_id + generation + utterance_id`. Pending finals are bounded
and consumed with one `pop_front()` owner. Overlong/overloaded audio is dropped
fail-closed; safety bounds do not manufacture fixed chunk boundaries or partial
output. Generation loss clears/rejects producer state.

Actual microphone/VAD boundary quality and exactly-once race behavior remain local
proof.

## 7. Translation / TTS Correctness

Translation source input is tokenized with `truncation=False`; unknown or exceeded
model context limits are rejected before inference.

Generated output must have verifiable EOS completion. Non-EOS ceiling/termination or
an unverifiable completion contract is not product success.

TTS requires an explicit English-capable voice:

```text
Piper -> .onnx + matching metadata with English language code
SAPI  -> English VoiceInfo Culture + explicit SelectVoice
```

The implicit Windows default voice and arbitrary first Piper model are not accepted.
Actual model/voice execution and audio quality remain `LOCAL PROOF REQUIRED`.

## 8. Installation / Capability / Readiness

Static installation owner:

```text
model_manifest.json -> runtime_inventory.rs
```

Asset presence is installation evidence only. Current AI capability comes from
persistent worker `status`; one request outcome does not redefine provider health.

Normal product truth:

```text
Text    -> worker Quality capability
Meeting -> direct MeetingSessionStatus + MeetingSessionPreflight
```

Intentional `Paused` is a lifecycle state of the existing Meeting session, not a fake
Ready state and not a new readiness authority. Resume rechecks current outbound
preflight before reopening required resources.

`RuntimeStatusBundle` remains useful for Diagnostics but is not the normal Meeting
lifecycle owner. Legacy live/internal/professional/migration gates do not make normal
product Ready.

## 9. Canonical Python Project / Proof Baseline

`WorkerRuntime/pyproject.toml` is the sole Python dependency/tooling owner. Retired
parallel requirements/stack/CUDA setup owners remain absent. `uv.lock` is intentionally
not fabricated and awaits verified local resolution.

Ruff and pytest are configured but not executed through ChatGPT -> GitHub. The
persistent-worker smoke remains local proof and stores privacy-bounded metadata only.
`py-spy` remains an external local profiler for the actual persistent worker PID.

## 10. Remaining Core Work

```text
implement canonical committed Meeting turn source + Live transcript read path
Meeting History finalization handoff from immutable committed-turn snapshot
global/cross-view Meeting strip and close-live handling
incoming Meeting lane + self-output suppression
translation tone/context consumption
Text Copy/direct Save
uv.lock generation + real dependency resolution
Ruff / pytest / TypeScript / Rust execution proof
non-preemptive active-Text contention measurement
actual model EOS/completion + translation quality
actual English TTS voice availability + synthesis/audio quality
model revision/checksum/source reproducibility
model quality + latency + RAM/VRAM profiling/benchmark
Windows microphone/VAD/route proof
packaging/clean-machine reconciliation
```

Do not add a second worker, finalizer, scheduler, readiness service, Meeting lifecycle
store, frontend transcript accumulator, dependency manifest, lint stack, or test
framework to solve these.

## 11. Other Product Boundaries

Windows audio remains outside AI ownership. Incoming Meeting Sound remains separate
from core outbound and is not implemented by current source.

Canonical History remains:

```text
UserData/SavedProject/History/
├─ Recent/
└─ Saved/
```

History is the persistent finalization owner, not the live transcript owner. The
committed-turn plan maps the later immutable Meeting handoff to the already-existing
`HistoryEntry` / `HistoryTurn` schema and uses current History retention state at
finalization. Saved ownership/deletion remains independent.

Documents remains retired. Audio Studio remains post-core. Svelte remains a separate
future frontend architecture decision after core runtime contracts stabilize.

## Current Mode / Continuation

Current mode: **Developing**.  
Execution channel: `ChatGPT -> GitHub`.

Engine Consolidation Slices 1-5, finalized outbound utterance production, normal
product Meeting Start/Stop/Live-state wiring, Meeting Pause/Resume fresh-generation
lifecycle, and the read-only Meeting Live activity presentation are source-aligned at
their bounded claims. Canonical committed-turn ownership is now decided but its
transient store/read projection/chronological transcript remain implementation work.
No compile/typecheck/validator execution/model/Windows runtime/rendered UI,
audio-quality, race-timing, or performance proof has been obtained in this channel.

The single continuation is `docs/knowledge/next-action.md`.
