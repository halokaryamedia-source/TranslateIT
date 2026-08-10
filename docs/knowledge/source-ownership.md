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
| Meeting Live activity presentation | `MeetingLiveActivityPresentation.ts` -> `get_meeting_session_status` | **SOURCE ALIGNED / RENDER PROOF LATER** | Read-only activity uses canonical lifecycle/outbound stage only. |
| Committed Meeting turn source | `meeting_session.rs` bounded transient store | **SOURCE ALIGNED / RUNTIME PROOF LATER** | Final transcript + verified translation commit into one memory-only session store; dedupe, chronology, delivery state, Pause/Resume/Stop handling are backend-owned. |
| Meeting Live transcript read path | `get_meeting_committed_turns` -> `runtimeApi.ts` -> `MeetingLiveActivityPresentation.ts` | **SOURCE ALIGNED / TAURI + RENDER PROOF LATER** | Frontend renders backend snapshots only; no browser transcript accumulator or worker/Diagnostics scraping. |
| Text AI execution | `text_translate.rs` -> helper scheduler -> `realtime_local_worker.py` | **SOURCE ALIGNED / LOCAL PROOF LATER** | One persistent worker route; Text explicitly requests Quality. |
| Meeting application authority | `runtime_state.rs`, `meeting_session.rs` | **SOURCE ALIGNED / RUNTIME PROOF LATER** | `session_id + generation + authority_active` is canonical; Pause retains session, Resume creates fresh generation. |
| Meeting capture | `audio/live_capture.rs` | **SOURCE ALIGNED / WINDOWS PROOF LATER** | One CPAL capture owner; rolling preview and finalized speech paths remain separate. |
| Rolling audio / preview boundary | `audio/live_audio_buffer.rs` | **ALIGNED DIAGNOSTIC/PREVIEW OWNER** | Rolling ASR-ready windows are not final speech and are not transcript/product output truth. |
| Finalized outbound utterance | `audio/finalized_utterance.rs` | **SOURCE ALIGNED / VAD PROOF LATER** | Realtime VAD produces generation-scoped finalized utterances with bounded queue ownership. |
| Finalized WAV handoff | `audio/live_segment_writer.rs` | **SOURCE ALIGNED / FILESYSTEM PROOF LATER** | Product Meeting uses unique temporary finalized WAVs; rolling file remains diagnostic-only. |
| Serialized Meeting outbound consumer | `meeting_session.rs` | **SOURCE ALIGNED / RUNTIME PROOF LATER** | One consumer processes each final once and now commits verified text into the same Meeting owner. |
| Meeting outbound AI mode | `meeting_session.rs` | **SOURCE ALIGNED / MODEL PROOF LATER** | Finalized outbound speech explicitly requests Realtime. |
| Helper scheduling / worker I/O | `helper_bridge.rs`, `helper_bridge_runtime.rs` | **SOURCE ALIGNED / CONTENTION PROOF LATER** | One scheduler owns worker stdin/stdout; waiting Meeting > Text > Diagnostics. |
| Helper cancellation | helper bridge + Meeting generation authority | **SOURCE ALIGNED / TIMING PROOF LATER** | Stale Meeting work is rejected; matching in-flight work may hard-cancel the worker. |
| Translation source bounds | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL PROOF LATER** | No silent tokenizer truncation; unsafe oversized input is rejected. |
| Translation output completeness | `realtime_local_worker.py` | **SOURCE ALIGNED / MODEL EXECUTION PROOF LATER** | Output is promoted only when EOS completion is verifiable. |
| English TTS voice selection | `realtime_local_worker.py` | **SOURCE ALIGNED / WINDOWS + ASSET PROOF LATER** | TTS requires an explicitly English-capable Piper/SAPI voice. |
| Model installation evidence | `model_manifest.json`, `runtime_inventory.rs` | **ALIGNED STATIC OWNER / METADATA PARTIAL** | Asset presence is installation evidence only. |
| Current AI capability availability | persistent worker `status` -> helper bridge | **SOURCE ALIGNED / LOAD-INFERENCE PROOF LATER** | Current ASR/translation/TTS capability is worker-scoped. |
| Product readiness | Meeting preflight/session + worker capability -> product facade | **SOURCE ALIGNED / LOCAL PROOF LATER** | Meeting and Text readiness remain capability-scoped; Paused is lifecycle state, not fake Ready. |
| Python dependency/tooling ownership | `WorkerRuntime/pyproject.toml` | **SOURCE ALIGNED / LOCK + EXECUTION PROOF LATER** | One Python project owns dependencies, Ruff, and pytest; `uv.lock` is not fabricated. |
| History / Saved | `history_store.rs`, `history.rs`, frontend History | **TEXT ALIGNED / MEETING FINALIZATION MISSING** | Canonical persistence is `UserData/SavedProject/History/{Recent,Saved}`; live Meeting transcript is not History-owned. |
| Meeting outbound audio route | virtual-route owners | **PARTIAL / WINDOWS PROOF REQUIRED** | Generation-aware route cancellation exists; delivery unproved. |
| Incoming Meeting assistance | audio/capture/runtime candidates | **MISSING / PARTIAL** | Loopback -> EN ASR -> ID text and self-output suppression are not implemented. |
| Translation tone/context | settings + inherited adapters | **MISSING / PARTIAL** | Approved tone/context do not yet reach canonical inference. |
| Packaging/runtime assets | Tauri/NSIS + bridge Python discovery | **PARTIAL / STALE ASSUMPTIONS** | End-user packaged Python/runtime acquisition remains unresolved. |
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

`runtimeProductFacade.mapProductMeetingState()` recognizes only
`translateit_application_meeting` as product Meeting ownership and maps Ready /
Starting / Live / Paused / Resuming / Stopping / conflict states.

Pause is not Stop. Pause retains `session_id` while invalidating old generation
authority. Resume assigns a fresh generation before capture/finalized-consumer
resources return Live. Navigation remains presentation-only and Mic Test cannot take
over an active/paused runtime session.

## 2. Canonical Outbound Speech / AI Execution

```text
physical microphone
-> application-owned capture
   +-> rolling buffer [preview/diagnostic only]
   +-> finalized utterance producer
-> session_id + generation + utterance_id
-> one-shot finalized queue
-> unique temporary WAV
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

The rolling `latest_live_target_segment.wav` remains diagnostic-only. Product output
and committed transcript truth begin only from finalized utterances.

Meeting Pause revokes generation authority before matching route/capture/helper/
consumer cleanup. Resume uses fresh generation authority for the same session. Stop is
the distinct full-session cleanup.

## 3. Canonical Committed Meeting Turn Source

The existing application Meeting outbound/session boundary in `meeting_session.rs` is
the one transient conversation-body owner. This is the first current boundary where
finalized utterance identity, current generation authority, final ASR text,
verified-complete translation, TTS progress, and output result coexist.

### Commitment

A turn is created only after final Indonesian transcript and verified English
translation both exist while the same generation is still authoritative.

```text
MeetingCommittedTurn
├─ session_id
├─ sequence
├─ generation
├─ utterance_id
├─ lane = you
├─ source_text
├─ translated_text
├─ delivery_state
├─ created_unix_ms
└─ updated_unix_ms
```

Dedupe identity is `(session_id, generation, utterance_id)`. `sequence` is separate and
monotonic for the full Meeting session, preserving chronology across Resume where
utterance IDs may repeat under a new generation.

The store is memory-only, session-scoped, and bounded using `VecDeque`. If the bound
drops old turns, `MeetingCommittedTurnsSnapshot` exposes `dropped_turn_count` and
`truncated` so the UI cannot claim a complete transcript.

### Delivery state

```text
preparing_voice
speaking
output_complete
output_failed
interrupted
```

A new committed turn starts `preparing_voice`; usable TTS entering route delivery may
become `speaking`; successful guarded output becomes `output_complete`; TTS/route
failure becomes `output_failed`; generation loss becomes `interrupted` for non-terminal
turns. Terminal states cannot be overwritten by late callbacks.

`output_complete` means TranslateIT completed the output action it can prove. It does
not claim the remote meeting participant heard the audio.

ASR/translation failure before verified translation does not create a committed turn.

### Lifecycle

- new Start resets the transient store for the new `session_id`;
- Start rollback clears it;
- Pause keeps existing turns and interrupts non-terminal turns from the revoked generation;
- Resume appends fresh-generation turns while keeping session-wide sequence order;
- Resume rollback interrupts fresh-generation non-terminal work;
- full Stop interrupts current non-terminal work then clears transient bodies;
- persistent History handoff is not yet implemented, so Stop currently performs no Meeting Recent write.

## 4. Read-Only Transcript Projection

Conversation bodies are deliberately not included in `MeetingSessionStatus`.
Lifecycle/readiness polling stays lightweight.

The dedicated registered read command is:

```text
get_meeting_committed_turns
```

`runtimeApi.ts` exposes `MeetingCommittedTurn` and
`MeetingCommittedTurnsSnapshot`. A bridge failure returns an explicit unavailable
snapshot rather than fabricated transcript content.

`MeetingLiveActivityPresentation.ts` requests lifecycle status and committed-turn
snapshot in parallel, then renders transcript bodies only when the snapshot belongs to
the same current `session_id`. A mismatch during transition is shown as a temporary
refresh state, not as another session's transcript.

The frontend reconstructs the rendered list from each backend snapshot. It does not
append/merge conversation turns into durable browser state.

Current outbound transcript presentation is:

```text
YOU
Indonesian final transcript      [primary]
English verified translation     [secondary]
truthful delivery state
```

Incoming transcript is not fabricated because the incoming Meeting lane is not yet
implemented. User text is assigned through DOM `textContent`; worker response JSON,
legacy pipeline transcript snapshots, Diagnostics, logs, and rolling audio are not
used as Live transcript sources.

## 5. History / Privacy Boundary

Persistent History remains independently owned by `engine/history_store.rs` and the
History command/frontend path. The existing `HistoryEntry` / `HistoryTurn` schema is
already structurally suitable for Meeting turns, but it is not used as the Live store.

Planned finalization contract:

```text
full Meeting finalization
-> immutable committed-turn snapshot
-> current RuntimeSettings.history_enabled
   -> ON  -> one Recent Meeting entry
   -> OFF -> discard transient conversation bodies
-> clear transient turn store
```

No live incremental History write is needed for the transcript. Existing Recent/Saved
items remain unaffected; Saved remains explicit and independent. Raw audio and generated
TTS are never normal History bodies.

## 6. Finalized Utterance / Scheduler / Correctness Boundaries

`audio/finalized_utterance.rs` remains the finalized speech owner;
`audio/live_audio_buffer.rs` remains rolling preview/diagnostics. Finalized work is
bounded/fail-closed and generation-scoped.

One helper scheduler remains in the helper bridge with waiting priority:

```text
Meeting > Text > Diagnostics / preload
```

This is queue priority, not preemption of already-running Text inference. Actual
contention/latency remains local proof.

Translation input is not silently truncated, generated translation requires
verifiable EOS completion, and outbound TTS requires an explicit English-capable
voice. Actual model/voice quality remains local proof.

## 7. Installation / Capability / Tooling

Static model installation evidence remains separate from current worker capability and
request success. Normal Meeting truth uses direct Meeting preflight/session state;
Diagnostics bundles do not become product lifecycle authority.

`WorkerRuntime/pyproject.toml` remains the sole Python dependency/tooling owner. Ruff
and pytest configuration exists but execution has not been proven in this channel.
`uv.lock` remains intentionally absent until verified dependency resolution.

## 8. Remaining Core Work

```text
Meeting History finalization handoff from committed turns
global/cross-view Meeting strip and close-live handling
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
store, transcript accumulator, dependency manifest, lint stack, or test framework to
solve these.

## 9. Other Product Boundaries

Canonical History remains:

```text
UserData/SavedProject/History/
├─ Recent/
└─ Saved/
```

Incoming Meeting Sound remains a separate unimplemented lane. Documents remains
retired. Audio Studio remains post-core. Svelte remains a separate future frontend
architecture decision after core runtime contracts stabilize.

## Current Mode / Continuation

Current mode: **Developing**.  
Execution channel: `ChatGPT -> GitHub`.

Engine consolidation, finalized outbound production, canonical Start/Stop,
Pause/Resume fresh-generation lifecycle, Live activity presentation, and the bounded
committed-turn source + Live transcript read path are source-aligned at their bounded
claims. No compile/typecheck/validator execution/model/Windows runtime/rendered UI,
audio-quality, race-timing, or performance proof has been obtained in this channel.

The single continuation is `docs/knowledge/next-action.md`.
