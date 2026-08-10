# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **Engine Consolidation Slices 1-5, Finalized Outbound Utterance Production, Normal Product Meeting Start/Stop + Live State Wiring, Meeting Pause/Resume Generation Lifecycle, and the bounded Meeting Live Activity Presentation are source-aligned. The normal Meeting surface now reflects canonical outbound activity states without inventing transcript bodies or a second lifecycle store.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> meeting_session.rs + Meeting History/transient-data owners only after the next Plan boundary is grounded
```

## Current Mode

**Plan**.

Execution channel:

```text
ChatGPT -> GitHub
```

Local/Windows acceptance remains deferred. Rust compilation, TypeScript typecheck,
static-validator execution, Tauri invocation, Python/model execution,
microphone/VAD behavior, scheduler/cancellation timing, Windows TTS/audio, Meeting
Microphone delivery, rendered UI, and installed operation remain
`LOCAL PROOF REQUIRED`.

## Locked Runtime Shape

```text
Normal Meeting UI
-> runtimeProductFacade
-> runtimeApi
-> canonical application Meeting session
   -> session_id + generation authority
   -> capture
   -> finalized utterance producer
   -> serialized outbound consumer
   -> helper scheduler / persistent Python worker
   -> Meeting Microphone route
```

Do not add another Meeting store/controller/service, worker, finalizer, scheduler,
readiness authority, capture path, or lifecycle owner.

# Closed Source Boundaries

## Engine Consolidation Slices 1-5

Established:

- one persistent Python AI worker and one helper scheduler;
- Text owns Quality; Meeting outbound owns Realtime;
- fake/manual/alternate translation success paths are retired;
- static installation evidence is distinct from current worker capability;
- Meeting queue work outranks waiting Text/Diagnostics work;
- stale Meeting generation work is rejected;
- translation input is not silently truncated;
- generated translation requires verifiable EOS completion;
- TTS requires an explicit English-capable Piper/SAPI voice;
- `WorkerRuntime/pyproject.toml` is the one Python dependency/tooling owner;
- Ruff/pytest source proof baseline exists without an executable PASS claim.

Active Text inference remains non-preemptive when Meeting work arrives. Keep that as
later measured proof rather than redesigning the scheduler now.

## Finalized Outbound Utterance Producer

Application Meeting capture keeps rolling preview/diagnostics separate from the
generation-scoped finalized utterance path. Finalized speech uses the existing
Realtime VAD profile, bounded one-shot queue consumption, unique temporary WAVs, and
one serialized Meeting consumer into the generation-aware ASR -> Realtime translation
-> English TTS -> Meeting Microphone path.

Actual VAD quality, exactly-once race behavior, and output timing remain local proof.

## Normal Product Meeting Start/Stop + Live State

Normal frontend reads the canonical backend application Meeting session through the
product facade and Tauri bridge. Start/Stop are backend lifecycle commands; navigation
is presentation-only and Mic Test cannot take over resources while a Meeting session
exists. No frontend Meeting lifecycle store was added.

## Meeting Pause/Resume Generation Lifecycle

Pause invalidates old outbound generation authority before matching route/capture/
helper/finalized-consumer cleanup while retaining the application Meeting session as
Paused. Resume keeps the same `session_id`, creates fresh generation authority,
rechecks required outbound prerequisites, and transactionally reopens capture and the
serialized consumer. Failed reopen rolls the fresh generation back to Paused. Stop
remains the distinct full-session cleanup action.

## Meeting Live Activity Presentation

### A. Grounded source only

The current canonical `MeetingSessionStatus` already exposes bounded product-relevant
outbound activity evidence:

```text
lifecycle
outbound.stage
outbound.utterance_sequence
outbound.output_active
outbound.last_stage_ok
```

It does **not** expose committed Indonesian transcript text or translated English
text as Meeting product state. `meeting_session.rs` currently holds those values only
inside the active outbound processing call; they are not a canonical bounded
conversation/turn store.

Therefore this slice does not manufacture transcript rows from worker responses,
rolling audio, diagnostics, logs, or frontend-local accumulation.

### B. Normal Meeting presentation

`MeetingLiveActivityPresentation.ts` is a read-only presentation helper for the
existing Simple Launcher surface. It does not own lifecycle state and does not expose
Start/Pause/Resume/Stop actions.

While the primary Meeting controller says the application Meeting is in an active
lifecycle state and the Meeting workspace is visible, the presentation performs a
bounded status refresh from:

```text
runtimeApi.getMeetingSessionStatus
-> mapProductMeetingState
-> existing Meeting panel
```

Current backend stages are mapped to normal user-facing activity copy such as:

```text
Listening
Transcribing
Translating
Preparing voice
Speaking
Needs attention
Paused
```

The Ready device/setup rows are hidden only while the current application Meeting
session is being presented as Live/Paused/transitioning; the same Meeting workspace
and existing Pause/Resume/Stop controls remain in place.

Bridge read failures do not fabricate Ready, Stopped, or another fallback lifecycle;
the primary controller remains the lifecycle presentation authority.

### C. Visual boundary

`meetingLiveActivity.css` adds only the restrained current-activity region required by
this source slice. It does not add chat bubbles, decorative waveforms, a new page,
global Meeting strip, or transcript/history layout that current source cannot yet
populate truthfully.

### D. Static regression definition

`validate_startup_runtime_readiness.mjs` now also guards that:

- the activity presentation is wired from the current product entrypoint;
- it reads canonical Meeting status and uses the existing product state mapper;
- it contains no Meeting lifecycle mutation calls;
- it does not read/invent `transcript_text`, `translated_text`, or worker response bodies;
- the bounded activity CSS is present.

This validator was **not executed** in the current channel. It is source-contract
definition only.

# Static Proof State

**CURRENT-PROJECT VERIFIED** at source level:

1. the existing Meeting application authority remains the only lifecycle owner;
2. the new Live activity renderer is presentation-only and read-only;
3. its activity truth comes from canonical `MeetingSessionStatus.outbound`, not a new frontend store;
4. lifecycle mutation remains in the existing Simple Launcher/product facade action path;
5. Ready setup content is replaced by current activity only while the primary Meeting UI reports an active lifecycle state;
6. user-facing stage copy hides helper/model/pipeline implementation detail;
7. no committed transcript/translation body is fabricated from worker/diagnostic state;
8. navigation/global strip/close-live behavior is not mixed into this slice;
9. static validator definitions cover the new boundary.

No TypeScript build/typecheck, validator execution, Tauri invocation, rendered UI,
status-refresh behavior, microphone/model/audio, or Windows runtime proof was
executed.

# Known Gaps Kept Truthful

- chronological Meeting transcript bodies are still unavailable because no canonical
  bounded committed-turn product source currently exposes transcript + translation +
  truthful delivery state;
- global/cross-view Meeting strip and close-live handling remain incomplete;
- incoming Meeting Sound and self-output suppression remain unimplemented;
- Meeting History after committed turns remains incomplete;
- approved tone/context does not yet reach canonical inference;
- Text Copy/direct Save remains incomplete;
- `uv.lock`, model acquisition metadata, and packaging remain incomplete;
- all compile/test/model/audio/performance/installed proof remains deferred locally.

# Hold

- do not create a frontend transcript accumulator or second Meeting conversation store;
- do not scrape worker responses, Diagnostics, rolling audio, or logs to manufacture transcript rows;
- do not persist conversation bodies merely to satisfy the Live UI;
- do not combine the committed-turn ownership decision with incoming Meeting Sound,
  global strip/close handling, Svelte, packaging, benchmark, or Windows acceptance;
- keep History retention/Saved ownership distinct from transient live conversation
  state until the next boundary explicitly reconciles them.

## Next Step

Plan the **Canonical Committed Meeting Turn Source Boundary** before implementing the
chronological transcript required by the approved Meeting Live composition. The Plan
must choose one semantic owner and define the minimum bounded transient turn contract
for finalized Indonesian transcript, English translation, generation/utterance
identity, truthful delivery state, privacy/History-off behavior, and later Meeting
History handoff without creating a second lifecycle or persistence authority.
