# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **Canonical Incoming Meeting Sound + Self-Output Suppression is source-aligned at its bounded initial capture/processing contract. A distinct Meeting Sound output-loopback owner now feeds finalized `INCOMING` speech into the same application Meeting/session, both lanes share finalized speech/event ordering before AI, incoming may remain active during outbound Pause, TranslateIT TTS is suppressed from incoming capture during guarded playback, and Live/History render both lanes from the same canonical committed-turn source. Mid-session Follow Windows Default output-device rebinding remains a separate unresolved audio-recovery gap.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> docs/foundation/02-product-requirements.md PR-040..049
-> inspect only current settings / Meeting+Text translation worker-call contracts for the next Plan boundary
```

## Current Mode

**Plan**.

Execution channel:

```text
ChatGPT -> GitHub
```

Rust compilation, TypeScript typecheck, static-validator execution, Windows output-
loopback capture, VAD behavior, self-output suppression effectiveness, actual model
inference, rendered mixed-lane transcript behavior, scheduler contention, initial
selected/default-device runtime behavior, filesystem History persistence, race timing,
and installed operation remain `LOCAL PROOF REQUIRED`.

# Closed Source Boundary — Incoming Meeting Sound

## A. One Meeting authority remains

Canonical lifecycle/conversation ownership is still:

```text
runtime_state.rs + meeting_session.rs
-> one application session_id
-> outbound generation authority
-> one bounded committed-turn source
-> one Stop / History finalization path
```

No second Meeting session, conversation store, History writer, helper worker, or
frontend transcript accumulator was added.

## B. Separate Meeting Sound capture owner

Physical microphone remains `engine/audio/live_capture.rs`.

Incoming Meeting Sound is now owned by:

```text
engine/audio/meeting_sound_capture.rs
```

It uses `RuntimeSettings.audio.output_device_id` and the existing CPAL/WASAPI path to
open the selected Windows render/output endpoint as the loopback source. At lane Start,
`None` resolves Windows Default; an explicitly pinned missing endpoint degrades incoming
instead of silently substituting another device.

No extra Windows audio crate/runtime was introduced. Actual Windows loopback behavior
is not proven in this channel. A Windows default-output change that occurs after the
lane is already running is not yet observed/rebound by current source and must not be
reported as implemented.

## C. Shared speech/event chronology before AI

`engine/audio/finalized_utterance.rs` now owns:

```text
FinalizedMeetingUtterance
├─ session_id
├─ sequence                # one session-wide event order
├─ lane                    # you | incoming
├─ generation              # outbound Some(...), incoming None
├─ utterance_id
└─ finalized AudioFrame
```

The shared `sequence` is allocated when VAD finalizes speech, before ASR/translation.
This prevents callback/model latency from becoming conversation chronology.

New Start resets sequence. Pause keeps incoming + sequence. Resume attaches fresh
outbound generation to the same sequence. Stop clears both after consumer cleanup.

Incoming pending finalized speech stays bounded and drops older pending incoming work
before stale subtitles grow without bound.

## D. One dual-lane committed-turn store

`meeting_session.rs` remains the single conversation-body owner:

```text
session_id
sequence
generation: optional     # outbound only
utterance_id
lane: you | incoming
source_text
translated_text
delivery_state: optional # outbound only
created_unix_ms
updated_unix_ms
```

Dedupe/order uses `(session_id, sequence)`. Outbound keeps truthful delivery state;
incoming has `delivery_state = None` because there is no incoming voice output.

## E. Incoming AI path

```text
Meeting Sound loopback
-> finalized INCOMING event
-> bounded temporary WAV
-> final English ASR
-> canonical Meeting session check
-> Realtime English -> Indonesian translation
-> canonical Meeting session check
-> commit INCOMING using preassigned sequence
```

Incoming requests carry `meeting_session_id + meeting_lane=incoming + sequence +
utterance_id`, not outbound generation authority.

Failed/empty/stale incoming work is not committed. Incoming failure is scoped/degraded
and does not block otherwise healthy required outbound.

## F. Pause / Resume / Stop

```text
Start
-> required outbound becomes Live
-> optional incoming capture/consumer attempted

Pause
-> revoke outbound generation
-> stop physical mic / outbound route / outbound consumer
-> retain healthy Meeting Sound capture + incoming consumer

Resume
-> fresh outbound generation/resources
-> retain healthy incoming lane + shared sequence

Stop
-> revoke outbound authority
-> stop physical mic + Meeting Sound capture
-> cancel helper by Meeting session
-> join outbound + incoming consumers
-> final committed-turn snapshot
-> existing History policy
-> clear suppression / sequence / turns / session
```

If Pause hard-cancels an active outbound helper request, the same helper owner may be
restarted so a healthy incoming lane can continue. No parallel worker is created.

## G. Self-output suppression

One session-scoped atomic suppression handle is owned by `meeting_session.rs` and
consumed by Meeting Sound capture.

```text
before guarded TranslateIT TTS route
-> reset incoming boundary
-> suppression ON
-> blocking route dispatch

Meeting Sound callback while ON
-> discard samples
-> reset incoming VAD
-> create no INCOMING event

route returns/cancels
-> suppression OFF
-> reset incoming boundary
-> resume listening
```

If suppression cannot be established, outbound route delivery is blocked rather than
risking TranslateIT's own English TTS becoming a false remote `INCOMING` turn.

Initial accepted limitation remains: participant speech mixed into Meeting Sound while
TranslateIT itself is speaking may be omitted. No AEC/fingerprint/similarity runtime
was added.

## H. One helper scheduler

Current waiting priority is now:

```text
Meeting outbound
> Meeting incoming
> Text
> Diagnostics / preload
```

Outbound retains generation checks. Incoming is checked by application Meeting session
before worker execution and result promotion. Full Stop can cancel active worker work
by Meeting session.

Actual contention/latency remains local proof.

## I. Live + History presentation

`MeetingSessionStatus` remains body-free and adds only lightweight incoming
capture/stage/degraded/suppressed status.

`get_meeting_committed_turns` remains the only Live conversation projection.
`MeetingLiveActivityPresentation.ts` and Meeting History detail now render:

```text
YOU
Indonesian primary
English secondary
outbound delivery state

INCOMING
Indonesian translation primary
English source secondary
no participant identity
no voice-delivery state
```

Both views use canonical event sequence and do not create another conversation store.
Incoming-only degradation remains scoped to the Meeting view.

## J. Static regression definition

`validate_startup_runtime_readiness.mjs` now defines checks for:

- distinct physical-mic vs Meeting-Sound capture ownership;
- output/render endpoint loopback source path;
- shared finalized sequence before AI;
- lane-aware temporary WAV identity;
- one ordered dual-lane committed-turn store;
- incoming session-scoped EN ASR -> ID translation without incoming TTS;
- suppression around guarded outbound route playback;
- Pause retaining incoming and Stop ending both lanes;
- one helper scheduler with outbound > incoming > Text > Diagnostics waiting priority;
- truthful dual-lane Live/History rendering;
- preservation of History/global-strip/safe-close boundaries.

The validator was **not executed** in this channel. Its active Stop-order check is scoped
past the idempotent already-stopped branch so the definition tests the real cleanup
sequence rather than matching an earlier harmless cleanup marker.

# Static Proof State

**CURRENT-PROJECT VERIFIED** at source level:

1. Meeting Sound has one distinct audio capture owner without creating a second Meeting/session authority;
2. `YOU` and `INCOMING` receive one shared speech/event sequence before AI completion;
3. the canonical committed-turn store remains the only conversation-body owner;
4. incoming is session-scoped and retained across outbound Pause, while full Stop prevents late promotion;
5. TranslateIT TTS route dispatch is wrapped by the shared self-output suppression gate;
6. incoming failure remains optional/degradable and cannot become a required outbound Start blocker;
7. one helper scheduler prioritizes outbound Meeting before incoming Meeting before Text/Diagnostics;
8. Live and History render `INCOMING` with Indonesian translation primary, English source secondary, and no fabricated participant/delivery identity.

No compile/typecheck/validator execution or live Windows/model/audio/render/persistence
proof has been obtained.

# Known Gaps Kept Truthful

- mid-session Follow Windows Default Meeting Sound endpoint change/rebind handling is not implemented; current source resolves the endpoint when the incoming lane starts;
- approved tone/context still does not reach canonical Meeting/Text inference;
- Text Copy/direct Save remains incomplete;
- multi-instance enforcement and sleep/hibernate lifecycle remain incomplete;
- `uv.lock`, model acquisition metadata, and packaging remain incomplete;
- all compile/test/model/audio/performance/installed proof remains deferred locally.

# Hold

- do not create another Meeting/session/conversation store for incoming;
- do not bind incoming authority to outbound generation in a way that disables Pause-safe incoming;
- do not let TranslateIT TTS become an INCOMING turn;
- do not invent participant/process identity;
- do not add AEC/fingerprint/partial-subtitle/incoming-TTS systems as follow-on cleanup;
- do not begin local Windows acceptance inside the next planning boundary.

## Next Step

Plan the **Translation Tone + Bounded Meeting Context Consumption Boundary**. Resolve
how `Auto / Formal / Casual` and bounded recent committed Meeting turns reach the
existing canonical worker requests for Meeting/Text without using persistent History as
model context, without leaking Meeting context into standalone Text, and without
creating another prompt/context/store authority.
