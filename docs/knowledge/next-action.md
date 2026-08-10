# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **Engine Consolidation Slices 1-5, the Finalized Outbound Utterance Producer, and Normal Product Meeting Start/Stop + Live State Wiring are source-aligned. Normal UI now consumes the canonical application Meeting session instead of maintaining a second lifecycle truth.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> runtime_state.rs + meeting_session.rs + normal Meeting product action consumer only
```

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

Local/Windows acceptance remains deferred. Rust compilation, TypeScript typecheck,
static-validator execution, Python/model execution, microphone/VAD behavior,
scheduler timing, Windows TTS/audio, Meeting Microphone delivery, rendered UI, and
installed operation remain `LOCAL PROOF REQUIRED`.

## Locked Runtime Shape

```text
Normal Meeting UI
-> runtimeProductFacade
-> runtimeApi
-> canonical application Meeting session
   -> capture
   -> finalized utterance producer
   -> serialized outbound consumer
   -> helper scheduler / persistent Python worker
   -> Meeting Microphone route
```

Do not add another Meeting store/controller/service, worker, finalizer, scheduler,
readiness authority, or capture path.

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

Application Meeting capture has two distinct paths:

```text
rolling audio -> preview/diagnostics only
finalized producer -> generation-scoped final speech -> product output
```

The finalizer uses the existing Realtime VAD profile, adaptive trailing silence,
bounded pre-roll, `session_id + generation + utterance_id`, and one-shot queue
consumption. Safety limits drop overlong/overloaded work rather than manufacturing a
partial final utterance.

Product Meeting writes a unique temporary finalized WAV, consumes it once through the
serialized outbound AI/output path, then removes it. The rolling
`latest_live_target_segment.wav` remains diagnostic-only.

Actual VAD quality, exactly-once race behavior, and Stop timing remain local proof.

# Normal Product Meeting Start/Stop + Live State — Closed Source Boundary

## A. Canonical bridge

`runtimeApi.ts` now exposes only the existing backend application lifecycle:

```text
get_meeting_session_status
start_meeting_translation
stop_meeting_translation
```

Bridge failures return explicit unavailable/blocked state; they do not fabricate a
Meeting session or Ready state.

## B. Product facade

`runtimeProductFacade.ts` directly reads `MeetingSessionStatus` and maps it into the
normal product states:

```text
Ready
Starting
Live
Stopping
In Use
Setup Needed
```

Only backend owner `translateit_application_meeting` is accepted as product Meeting
authority. `RuntimeStatusBundle` may remain Diagnostics evidence but is no longer the
normal Meeting lifecycle owner.

`ProductRuntimeSnapshot` carries the backend-derived Meeting state; there is no new
frontend Meeting session store.

## C. Normal Meeting action

The existing `Start Translation` button is now state-driven:

```text
idle + preflight ready -> Start Translation
Start -> canonical transactional backend Start
success -> Live / Stop Translation
Stop -> canonical authority-first backend Stop
blocked -> setup/recovery path remains available
```

Starting/Stopping disables duplicate UI actions. The stale message claiming Start was
unavailable in the build is removed.

## D. Navigation / Mic Test

Workspace/settings navigation only changes presentation and never calls Meeting
Start/Stop. A healthy application Meeting remains backend-owned while the user visits
Text, History, or Settings.

Mic Test/direct capture is blocked while any runtime session owns Meeting resources,
so legacy diagnostic capture commands cannot accidentally stop application Meeting
capture while leaving the canonical session alive.

## E. Static regression definition

`validate_startup_runtime_readiness.mjs` now guards:

- canonical Meeting command names in `runtimeApi`;
- direct `getMeetingSessionStatus` + `mapProductMeetingState` facade wiring;
- normal primary Start/Stop action binding;
- active-session Mic Test guard;
- absence of the old disabled-Start copy.

This validator was **not executed** in the current channel. It is source-contract
definition only.

# Static Proof State

**CURRENT-PROJECT VERIFIED** at source level:

1. normal frontend exposes the three registered canonical Meeting lifecycle commands;
2. normal product Meeting state is derived from backend application session status;
3. no second frontend Meeting lifecycle store/service was introduced;
4. Start/Stop button calls the canonical product facade action;
5. Live state changes the primary action to Stop Translation;
6. navigation contains no Meeting lifecycle side effect;
7. Mic Test cannot intentionally take over capture while a Meeting/runtime session exists;
8. legacy "Start Translation is not available in this build yet" behavior is absent;
9. source-contract validator definitions cover the new wiring.

No TypeScript typecheck/build, Tauri invocation, rendered UI, microphone/model/audio,
or Windows runtime proof was executed.

# Known Gaps Kept Truthful

- backend/normal UI Pause/Resume is not implemented;
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
- do not use direct `start_capture/stop_capture` for normal Meeting Start/Stop;
- do not implement incoming Meeting Sound in the next slice;
- do not mix Pause/Resume with transcript UI/global strip/Svelte/packaging/benchmark work;
- do not start local Windows acceptance yet.

## Next Step

Implement **Meeting Pause/Resume Generation Lifecycle** as one bounded source slice.

Required behavior:

```text
Live
-> Pause accepted
-> invalidate current outbound generation authority
-> stop/clear new + pending finalized outbound work
-> cancel matching route/helper work
-> keep application Meeting session identity available as paused

Paused
-> Resume
-> establish fresh generation authority for the same Meeting session
-> restart required capture/finalized consumer resources transactionally
-> return Live
```

Acceptance constraints:

- Pause must not be an alias for full Stop;
- pre-Pause utterances/results must never re-enter after Resume;
- Resume must use a fresh generation, not reactivate the old one;
- duplicate Pause/Resume must be idempotent or explicitly blocked without duplicating
  resources;
- normal UI should expose only the corresponding existing Meeting action state needed
  for this lifecycle; do not build the full transcript/global strip in the same slice.
