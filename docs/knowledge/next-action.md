# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **Reliable bidirectional translation, Incoming-Failure-Is-Nonblocking Outbound Delivery, and persistence-free Meeting Stop are source-aligned at their bounded contracts. `stop_meeting_translation` no longer imports/calls History persistence and now ends by cleaning runtime/transient Meeting state only. No Rust/validator/Windows runtime proof has been obtained. The next stale core behavior is Pause/Resume, which is outside the simplified Start -> Live -> Stop lifecycle.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> docs/foundation/02-product-requirements.md PR-031 / PR-056
-> .agents/skills/development-brief/SKILL.md
-> inspect runtime_state.rs + meeting_session.rs + facade/controller Pause/Resume direct contracts only
```

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

Rust/TypeScript/Python execution, static-validator execution, model files/load,
translation quality, CUDA/CPU latency, Windows audio, suppression effectiveness,
rendered UI, native race behavior, and installed operation remain
`LOCAL PROOF REQUIRED`.

# Closed Source Slice — Reliable Bidirectional Translation Core

One persistent worker routes by language direction:

```text
ID -> EN -> marianmt-id-en
EN -> ID -> marianmt-en-id
```

Mode compatibility fields may still remain at old direct callers, but model selection
is direction-based. Required outbound ID->EN readiness is distinct from optional reverse
EN->ID readiness.

Translation still rejects silent truncation and known incomplete generation. Tone,
previous-turn context, History context, second worker, and cloud fallback remain absent.

# Closed Source Slice — Incoming Failure Is Nonblocking

Healthy incoming uses the existing deterministic self-output suppression guard.
If that protection cannot be established:

```text
clear incoming finalized producer
-> stop Meeting Sound best-effort
-> incoming = disabled/degraded
-> reject late incoming promotion
-> required outbound Meeting Microphone delivery continues
```

Optional incoming therefore cannot be the sole reason an otherwise safe outbound TTS
turn fails.

# Closed Source Slice — Stop Persistence Removed

## A. Stop owns shutdown only

Current Stop source follows:

```text
revoke outbound authority
-> cancel Meeting route
-> stop physical microphone + optional Meeting Sound
-> cancel Meeting helper work
-> join outbound + incoming consumers
-> clear suppression / finalized sequence / transient committed turns
-> clear application Meeting session
-> stopped
```

`meeting_session.rs` no longer imports or calls:

```text
history_store
HistoryTurn
create_meeting_recent
load_settings for History
finalize_meeting_history
```

No final transcript snapshot is read during Stop for persistence.

## B. Live transcript remains transient

`get_meeting_committed_turns` still reads the bounded in-memory committed-turn owner
while a Meeting session exists. Full Stop clears that transient store after runtime work
has been stopped.

History/Saved source files may remain disconnected/deferred; their state cannot affect
Meeting Stop because the canonical Stop path no longer invokes them.

## C. Safe close remains one path

`GlobalMeetingShell` and the native `ExitRequested` fail-safe still delegate to the same
`stop_meeting_translation` owner. They therefore inherit the persistence-free Stop
contract instead of creating a second shutdown path.

## D. Static validation definition

`validate_startup_runtime_readiness.mjs` now defines checks that:

- `meeting_session.rs` contains no History persistence owner/import/call;
- canonical Stop revokes authority before transient turn/session clear;
- Stop still cleans both audio lanes, helper work, consumers, suppression, and session;
- safe close still delegates to canonical Stop;
- existing translation/incoming safety contracts remain preserved.

The validator was **not executed** in this channel.

# Known Proof Limits

No claim is made that current Rust compiles, Stop ordering behaves correctly on target
Windows, native close races are resolved, audio handles release correctly, models load,
or translation/audio quality is acceptable. Those remain local proof.

# Next Developing Slice — Remove Pause / Resume From Initial Core

## Goal

Reconcile source with the approved simple lifecycle:

```text
Ready -> Starting -> Live -> Stopping -> Ended
```

There should be no normal Pause/Resume product path in the initial core.

## In scope

1. remove Pause/Resume normal commands/actions from the product-facing Meeting path;
2. remove frontend/facade Pause/Resume controls/mapping needed only by that flow;
3. simplify runtime/session authority so Start -> Live -> Stop remains the only normal
   lifecycle without preserving a second paused generation path for compatibility;
4. keep Stop safety, active Meeting navigation independence, and safe close intact;
5. update static validation/canonical docs.

## Out of scope

- History/Saved UI file deletion;
- broad UI visual redesign;
- translation model/download/packaging work;
- local Windows acceptance;
- unrelated Settings cleanup.

## Acceptance criteria

1. normal Meeting UI/facade exposes Start and Stop only, with no Pause/Resume action;
2. canonical initial Meeting lifecycle no longer requires paused/resuming states or fresh
   Resume generation handling;
3. Stop still invalidates output authority and clears resources/transient state;
4. navigation/minimize/safe close do not create a replacement Pause behavior;
5. no second Meeting lifecycle owner is introduced.

# Hold

- do not reintroduce Tone/Context or Realtime/Quality product modes;
- do not add another translation worker;
- do not use cloud fallback;
- do not broaden this slice into full UI/History deletion;
- do not begin local acceptance inside source cleanup.

## Next Step

Implement **Remove Pause / Resume From Initial Core** across the canonical Meeting
runtime + direct product-facing callers, then continue pruning stale initial-product
surface.