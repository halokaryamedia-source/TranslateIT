# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **Engine Consolidation Slices 1-5, Finalized Outbound Utterance Production, Normal Product Meeting Start/Stop + Live State Wiring, and Meeting Pause/Resume Generation Lifecycle are source-aligned. Pause preserves the application Meeting session while revoking old generation authority; Resume establishes a fresh generation before returning Live.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> meeting_session.rs + current Meeting presentation consumer only
```

## Current Mode

**Developing**.

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

### A. Canonical authority behavior

`runtime_state.rs` keeps one application Meeting session authority.

Pause:

```text
Live generation G
-> invalidate G authority
-> phase Paused
-> keep the same session_id / session lifetime
```

Resume:

```text
Paused session
-> allocate fresh generation G+N
-> phase Resuming
-> reopen required resources transactionally
-> commit fresh generation Live
```

The old generation is never reactivated.

### B. Pause cleanup

`pause_meeting_translation` revokes old outbound authority before cleanup, then:

```text
cancel matching Meeting route
-> stop capture / clear finalized producer
-> cancel matching helper work for the old generation
-> clear/join the matching serialized outbound consumer
-> remain Paused
```

Pause does **not** clear the application Meeting session, so it is not an alias for
Stop. The targeted helper cancellation path does not cancel unrelated work merely
because a Meeting is paused.

### C. Transactional Resume

`resume_meeting_translation` accepts only the existing paused application Meeting
session. It restores the existing helper runtime when required, rechecks current
outbound preflight, establishes a fresh generation for the same `session_id`, then
reopens capture and the serialized finalized consumer.

If a required Resume step fails after fresh authority is established, the new
generation is invalidated and the same Meeting session rolls back to Paused rather
than being silently converted into Stop.

### D. Duplicate/stale behavior

- duplicate Pause while already Paused returns the existing paused state;
- duplicate Resume while already Live does not create a new generation/resource set;
- stale pre-Pause helper/output work is rejected by generation authority;
- Stop remains available from both Live and Paused and still clears the full session.

### E. Normal frontend action state

`runtimeApi` exposes the canonical backend lifecycle:

```text
get_meeting_session_status
start_meeting_translation
pause_meeting_translation
resume_meeting_translation
stop_meeting_translation
```

`runtimeProductFacade` maps `Ready / Starting / Live / Paused / Resuming / Stopping /
In Use / Setup Needed` from the same backend session. The existing Meeting controls
are reused so Live exposes Pause + Stop and Paused exposes Resume + Stop; no parallel
frontend lifecycle authority or full transcript/global strip was introduced.

## Static Regression Definition

`validate_startup_runtime_readiness.mjs` now defines static checks for:

- registration and frontend exposure of Start/Pause/Resume/Stop;
- one canonical application Meeting owner;
- Pause/Resume generation-authority source markers;
- normal product facade/action wiring;
- absence of the old disabled-Start copy;
- no direct-capture replacement for normal Meeting lifecycle.

This validator was **not executed** in the current channel. It is source-contract
definition only.

# Static Proof State

**CURRENT-PROJECT VERIFIED** at source level:

1. Pause/Resume commands are source-connected to the existing Meeting lifecycle;
2. Pause preserves `session_id` while invalidating the old generation authority;
3. matching route/capture/helper/finalized-consumer cleanup occurs after authority loss;
4. Resume assigns a fresh generation for the same Meeting session;
5. Resume reopens capture and serialized outbound consumption transactionally and has a rollback-to-Paused path;
6. generation-aware outbound checks prevent pre-Pause work from being promoted by the resumed generation;
7. duplicate Pause/Resume do not intentionally create duplicate session/resource ownership;
8. normal frontend derives Paused/Resuming from backend state and uses the same product facade rather than a second lifecycle store;
9. Stop remains a distinct full-session lifecycle action available from Live or Paused;
10. source-contract validator definitions cover the bounded lifecycle wiring.

No TypeScript/Rust build, validator execution, Tauri invocation, rendered UI,
microphone/model/audio, race timing, or Windows runtime proof was executed.

# Known Gaps Kept Truthful

- normal Live surface is still minimal; complete transcript/activity presentation is
  not connected yet;
- global/cross-view Meeting strip and close-live handling remain incomplete;
- incoming Meeting Sound and self-output suppression remain unimplemented;
- Meeting History after committed turns remains incomplete;
- approved tone/context does not yet reach canonical inference;
- Text Copy/direct Save remains incomplete;
- `uv.lock`, model acquisition metadata, and packaging remain incomplete;
- all compile/test/model/audio/performance/installed proof remains deferred locally.

# Hold

- do not add a frontend Meeting state manager or duplicate lifecycle store;
- do not change Pause into Stop or reuse an old generation on Resume;
- do not use direct `start_capture/stop_capture` for normal Meeting lifecycle;
- do not implement incoming Meeting Sound in the next slice;
- do not mix the next slice with global strip/close handling, Svelte, packaging,
  benchmark, or local Windows acceptance;
- do not invent a new transcript/event owner if current source does not provide the
  required canonical committed-turn data; recover/plan that boundary first.

## Next Step

Implement **Meeting Live Transcript / Activity Presentation** as one bounded source
slice, using the existing canonical Meeting session/outbound authority. Connect only
the Live workspace presentation needed to show trustworthy current translation
activity/committed-turn information that already has a grounded source owner; keep the
global/cross-view Meeting strip and close-live behavior for a later slice.
