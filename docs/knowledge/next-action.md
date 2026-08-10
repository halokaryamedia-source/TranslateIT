# Next Action

Updated: 2026-08-11  
Working branch: `New`  
Status: **Reliable bidirectional translation, Incoming-Failure-Is-Nonblocking Outbound Delivery, persistence-free Meeting Stop, and the simple Start -> Live -> Stop application Meeting lifecycle are source-aligned at their bounded contracts. Pause/Resume commands, runtime states, Tauri registration, bridge/facade actions, and normal Meeting controls were removed. No Rust/TypeScript/static-validator/Windows runtime proof has been obtained. The next stale initial-product surface is History/Saved plus automatic Text History persistence.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> docs/foundation/02-product-requirements.md PR-004 / PR-090 / PR-100
-> .agents/skills/development-brief/SKILL.md
-> inspect active shell/controller/runtimeApi History direct contracts only
```

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

Rust/TypeScript/Python execution, static-validator execution, model files/load,
translation quality, CUDA/CPU latency, Windows audio, suppression effectiveness,
rendered UI, native lifecycle races, and installed operation remain
`LOCAL PROOF REQUIRED`.

# Closed Source Slice — Reliable Bidirectional Translation Core

The one persistent worker routes translation by language direction:

```text
ID -> EN -> marianmt-id-en
EN -> ID -> marianmt-en-id
```

Mode compatibility fields may still remain at old direct callers, but they do not select
the model. Required outbound readiness depends on ID -> EN; optional reverse readiness
is reported separately.

Translation still rejects silent truncation and known incomplete generation. Tone,
previous-turn context, History context, second worker, and cloud fallback remain absent.

# Closed Source Slice — Incoming Failure Is Nonblocking

Healthy incoming uses the existing deterministic self-output suppression guard. If that
protection cannot be established:

```text
clear incoming finalized producer
-> stop Meeting Sound best-effort
-> incoming = disabled/degraded
-> reject late incoming promotion
-> required outbound Meeting Microphone delivery continues
```

Optional incoming therefore cannot be the sole reason an otherwise safe outbound TTS
turn fails.

# Closed Source Slice — Meeting Stop Is Persistence-Free

Current Stop owns runtime/transient cleanup only:

```text
revoke output authority
-> cancel route
-> stop physical mic + Meeting Sound
-> cancel helper Meeting work
-> join both consumers
-> clear suppression / finalized sequence / transient turns
-> clear Meeting session
-> stopped
```

`meeting_session.rs` does not import/call History persistence. Safe Stop & Close still
delegates to this canonical Stop owner.

# Closed Source Slice — Pause / Resume Removed

## A. Runtime authority is one normal generation path

Application Meeting runtime source now uses:

```text
begin_application_meeting_session
-> starting
-> commit_application_meeting_session_live
-> live
-> revoke_application_meeting_session_authority
-> stopping
-> clear_runtime_session_state
```

Removed:

```text
begin_application_meeting_session_resume
pause_application_meeting_session_authority
paused phase
resuming phase
fresh Resume generation path
```

Inherited non-Meeting/Diagnostics session phases are not promoted into the application
Meeting lifecycle.

## B. Product-facing Pause / Resume is gone

Removed from current active product path:

```text
pause_meeting_translation
resume_meeting_translation
Tauri registration for both commands
runtimeApi pause/resume methods
ProductMeetingAction pause/resume variants
ProductMeetingState paused/canPause/canResume flags
Pause/Resume controller actions/buttons/copy
Paused/Resuming live/global presentation states
```

Normal Meeting control is now only:

```text
Start Translation
Stop Translation
```

Navigation between app views and minimize do not stop or pause a live Meeting. Safe
native Close still requires the same canonical Stop before window destruction.

## C. Incoming authority follows Live only

Both Meeting orchestration and helper request eligibility now allow incoming promotion
only while the same application Meeting session is `live`. There is no longer a paused
session state in which incoming remains independently active.

## D. Static validation definition

`validate_startup_runtime_readiness.mjs` now defines checks for:

- Start/Stop-only Tauri registration and frontend bridge;
- no Pause/Resume product action/state/control mapping;
- no paused/resuming application Meeting runtime machinery;
- Live-only incoming Meeting eligibility;
- persistence-free Stop and safe Stop & Close still intact;
- previous bidirectional translation and optional-incoming safety contracts preserved.

The validator was **not executed** in this channel.

# Known Proof Limits

No claim is made that current Rust or TypeScript compiles, Start/Stop state transitions
behave correctly on target Windows, rendered controls are correct, native close races
are resolved, audio handles release correctly, models load, or translation/audio
quality is acceptable. Those remain local proof.

# Next Developing Slice — Remove History / Saved From Initial Product Surface

## Goal

Align the active desktop surface with the approved initial product:

```text
Meeting
Text
Settings
```

History/Saved must no longer be a normal navigation/settings/automatic persistence path,
and successful Text translation must not depend on or automatically write History.

## In scope

1. remove History from active top-level navigation/workspace routing;
2. remove History & Privacy from normal Settings navigation for the initial product;
3. remove automatic `createTextHistoryEntry` from successful Text translation;
4. remove active controller/frontend History list/detail/save/clear calls and state that
   exist only for the removed product surface;
5. keep backend persistence files/commands disconnected for now rather than expanding
   this slice into storage deletion;
6. update static validation and canonical docs.

## Out of scope

- deleting every History/Saved backend file/command in the same slice;
- broad visual redesign;
- translation mode/tone compatibility cleanup beyond what becomes directly orphaned;
- model/download/packaging work;
- local Windows acceptance.

## Acceptance criteria

1. normal active navigation exposes Meeting / Text / Settings, with no History workspace;
2. normal Settings exposes Meeting / Advanced only, with no History & Privacy section;
3. successful Text translation performs no automatic History write and remains usable
   independently of persistence state;
4. active controller/frontend no longer lists, reads, saves, removes, or clears History;
5. Meeting translation, transient live transcript, safe Stop/Close, and Text result/Copy
   behavior keep their existing owners;
6. existing backend History/Saved source may remain disconnected/deferred without being
   a core translation dependency.

# Hold

- do not reintroduce Pause/Resume, Tone/Context, or user-facing Realtime/Quality modes;
- do not add another translation worker;
- do not use cloud fallback;
- do not turn this into full persistence-backend deletion;
- do not begin local acceptance inside this source cleanup slice.

## Next Step

Implement **Remove History / Saved From Initial Product Surface** across the active shell,
controller, and direct frontend bridge contracts, then continue pruning stale
initial-product complexity.
