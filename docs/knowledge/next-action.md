# Next Action

Updated: 2026-08-10  
Working branch: `New`  
Status: **The Canonical Incoming Meeting Sound + Self-Output Suppression boundary is ownership-resolved. Incoming will be a separate optional Windows Meeting Sound lane, but `meeting_session.rs` remains the one application Meeting/session and committed-turn authority. Shared speech/event ordering moves to the finalized-utterance boundary so outbound and incoming turns cannot be reordered by asynchronous ASR/translation completion. Source implementation is next.**

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> docs/knowledge/source-ownership.md
-> .agents/skills/development-brief/SKILL.md
-> .agents/skills/windows-audio-runtime-development/SKILL.md
-> current Meeting audio/session/helper/frontend direct contracts only
```

## Current Mode

**Developing**.

Execution channel:

```text
ChatGPT -> GitHub
```

Before implementing Windows output-loopback capture, verify the current official
Microsoft Windows audio-loopback contract and the current documentation for whichever
Rust binding/API is actually selected. Repository policy remains semantic authority;
external documentation only resolves platform/API mechanics.

Rust compilation, TypeScript typecheck, static-validator execution, Windows output-
loopback capture, VAD behavior, self-output suppression, actual model inference,
rendered incoming transcript behavior, scheduler contention, device rebind behavior,
and installed operation remain `LOCAL PROOF REQUIRED`.

# Closed Planning Boundary — Canonical Incoming Meeting Sound

## A. One application Meeting authority remains

The application Meeting lifecycle is unchanged:

```text
runtime_state.rs + meeting_session.rs
-> one session_id
-> outbound generation authority
-> one bounded committed-turn source
-> one Stop / History finalization path
```

Incoming does **not** create another Meeting session, lifecycle store, conversation
store, History writer, or frontend accumulator.

`meeting_session.rs` remains the orchestration and committed-conversation owner for
both `YOU` and `INCOMING` turns.

## B. Meeting Sound capture has a distinct audio owner

Current `audio/live_capture.rs` is the physical microphone owner and owns one native
input stream. It must remain outbound microphone capture rather than being stretched
into two unrelated device semantics.

Implement one dedicated Windows audio owner under the existing audio subsystem:

```text
engine/audio/meeting_sound_capture.rs
```

Responsibility:

```text
RuntimeSettings.audio.output_device_id
-> selected Windows Meeting Sound output endpoint
-> native output-loopback PCM capture
-> incoming finalized-speech feed
```

`output_device_id = None` keeps Follow Windows Default semantics. An explicitly pinned
missing device makes incoming unavailable/degraded; it must not silently fall back to
another output device.

The exact Windows loopback API/binding is an implementation detail for the Developing
slice, but capture stays in the Rust/Windows audio boundary rather than becoming a
second Python audio runtime.

## C. One finalized speech/event ordering owner

`engine/audio/finalized_utterance.rs` remains the finalized-speech owner and is
reconciled from outbound-only semantics into one Meeting finalized-utterance boundary
with independent lane VAD state and **one session-wide speech/event sequence**.

Planned conceptual shape:

```text
FinalizedMeetingUtterance
├─ session_id
├─ sequence                # allocated when speech finalizes, before AI
├─ lane                    # you | incoming
├─ generation              # Some(...) for outbound, None for incoming
├─ utterance_id            # lane-local provenance
├─ frame
├─ speech_duration_ms
└─ total_duration_ms
```

The shared `sequence` is reset only for a new Meeting session. Pause may clear/disable
the outbound producer but must retain the session sequence and incoming producer.
Resume enables a fresh outbound generation while incoming continues under the same
session sequence.

This refines the outbound-only committed-turn design: chronology must no longer be
allocated after translation completion because two concurrent lanes could otherwise be
ordered by model latency rather than speech/event order.

## D. Committed turn contract becomes lane-neutral

The one transient store in `meeting_session.rs` accepts the preassigned finalized-event
`sequence` and deduplicates by `(session_id, sequence)`.

Planned minimum committed turn:

```text
session_id
sequence
generation: optional       # outbound provenance only
utterance_id
lane: you | incoming
source_text
translated_text
delivery_state: optional   # outbound only
created_unix_ms
updated_unix_ms
```

Outbound keeps its current delivery states:

```text
preparing_voice
speaking
output_complete
output_failed
interrupted
```

Incoming has no voice-delivery claim, therefore `delivery_state = None`. It commits
only after final English ASR and verified Realtime English -> Indonesian translation.
No English -> Indonesian TTS is added.

Live transcript and History continue reading the same committed-turn source. `INCOMING`
uses English source text and Indonesian translated text. No participant identity is
invented.

## E. Incoming AI pipeline

The canonical incoming consumer is coordinated by `meeting_session.rs`:

```text
finalized INCOMING utterance
-> temporary WAV through the existing finalized-audio writer boundary
-> final English ASR
-> verify current application Meeting session still matches session_id
-> Realtime English -> Indonesian translation
-> verify session again
-> commit INCOMING turn with the preassigned sequence
```

Incoming work is session-scoped rather than outbound-generation-authority scoped. This
is required because approved Pause behavior keeps incoming assistance available while
outbound generation authority is revoked.

A lightweight runtime-state helper may answer whether the same application Meeting
`session_id` still exists in a lane-eligible phase. It must not store conversation
bodies or become another authority.

## F. Pause / Resume / Stop semantics

```text
Start
-> required outbound path commits Live
-> attempt optional Meeting Sound lane
   -> success     -> incoming listening
   -> unavailable -> Live / incoming degraded; outbound stays Live

Pause
-> revoke/stop outbound generation resources
-> keep healthy Meeting Sound capture + incoming consumer running

Resume
-> fresh outbound generation
-> do not recreate a healthy incoming lane

Stop
-> revoke outbound authority
-> stop physical mic + Meeting Sound capture
-> cancel/join outbound + incoming AI consumers
-> final committed-turn snapshot
-> existing History policy
-> clear transient/session state
```

Incoming failure never becomes a required outbound Start blocker.

## G. Self-output suppression

The initial suppression policy is deliberately deterministic and fail-closed rather
than adding speculative acoustic-echo-cancellation infrastructure.

`meeting_session.rs` owns one session-scoped **transient atomic suppression gate**. It
is transport/safety state, not lifecycle truth.

```text
before guarded outbound TTS route playback
-> self_output_suppression = true

while true
-> Meeting Sound capture discards incoming samples
-> reset any in-progress incoming VAD utterance
-> no INCOMING turn can be finalized from that interval

after the blocking route provider returns/cancels
-> self_output_suppression = false
-> incoming starts from a fresh speech boundary
```

Current route provider playback is blocking for the WAV duration, so the gate covers
the source-controlled TranslateIT playback interval without inventing a fixed timeout.

Tradeoff is explicit: participant speech mixed into Meeting Sound while TranslateIT is
speaking may be omitted in this initial boundary. That is preferable to falsely
presenting TranslateIT's own English TTS as remote speech, and incoming is the
optional/degradable lane. No text-similarity suppression, acoustic fingerprint store,
or second echo-cancellation service is added in this slice.

## H. Scheduler priority / stale-work rules

The existing single helper scheduler remains the only AI scheduler, but Waiting
Meeting work must distinguish lane priority:

```text
Meeting outbound
> Meeting incoming
> Text
> Diagnostics / preload
```

This remains non-preemptive for an already-running worker request. Actual contention
and latency suitability remain local benchmark proof.

Outbound helper work retains generation validation. Incoming helper work carries the
application `meeting_session_id` + incoming lane identity and is rejected before worker
execution/result promotion if the canonical Meeting session no longer exists or is
Stopping/ended.

Pause generation cancellation therefore affects outbound work without canceling the
session-scoped incoming lane. Full Stop still cancels active Meeting helper work and
prevents queued incoming work from promoting afterward.

## I. Incoming freshness and UI

Incoming pending finalized speech is bounded independently and prefers current
comprehension: when its bounded pending queue is full, stale older pending incoming
speech is discarded rather than allowing an old subtitle backlog to grow.

`MeetingSessionStatus` may gain one lightweight `incoming` status projection for
capture/stage/degraded/suppression truth. It contains no conversation bodies.

Meeting Live will render both committed lanes from `get_meeting_committed_turns`:

```text
YOU
Indonesian primary
English secondary
outbound delivery state

INCOMING
Indonesian translation primary
English source secondary
no fabricated delivery state / participant identity
```

Incoming-only failure/suppression remains a scoped light status/callout and must not
turn the global Meeting strip into an outbound failure state.

Partial incoming subtitles are **not** part of this implementation slice; PR-077 makes
them optional.

# Planned Implementation Slice

Implement **Canonical Incoming Meeting Sound + Self-Output Suppression**.

In scope:

1. dedicated native Meeting Sound output-loopback capture owner;
2. shared finalized-utterance lane/event sequencing;
3. session-scoped incoming consumer for final EN ASR -> Realtime ID translation;
4. one canonical committed-turn store for `YOU` + `INCOMING`;
5. deterministic self-output suppression gate around guarded TTS route playback;
6. Start/Pause/Resume/Stop optional-lane lifecycle integration;
7. helper waiting priority `outbound > incoming > Text > Diagnostics` and stale-session guards;
8. lightweight incoming status + Live transcript lane rendering;
9. static source-contract validation for ownership, chronology, suppression, and no duplicate runtime.

Out of scope:

- incoming partial subtitles;
- acoustic echo cancellation / waveform subtraction;
- participant/process identity or Zoom/Meet/Teams process-specific capture claims;
- conversation-aware `Speak Now / Cancel` delivery coordination;
- global `Stop Voice` or cross-view PTT;
- multi-instance and sleep/hibernate work;
- packaging/benchmark/Windows acceptance.

## Acceptance criteria

1. **Separate capture, one Meeting:** Meeting Sound uses a distinct native output-
   loopback capture owner, but lifecycle and committed conversation remain owned by the
   existing application Meeting/session path.
2. **True chronology:** `YOU` and `INCOMING` share a sequence allocated at finalized
   speech/event time, not AI completion time; committed/history ordering uses that
   sequence.
3. **Pause-safe incoming:** incoming may remain active during outbound Pause and is
   rejected after Stop without relying on revoked outbound generation authority.
4. **Self-output safety:** samples observed while TranslateIT's own guarded TTS route is
   active cannot become committed incoming speech; no second echo/suppression runtime is
   introduced.
5. **Optional/degradable:** incoming/device/ASR/translation failure never falsely blocks
   healthy outbound; bounded incoming queues and scheduler priority protect realtime
   outbound before incoming.

# Proof Budget

`ChatGPT -> GitHub` may prove:

- one current capture/finalization/session/conversation owner per responsibility;
- exact Start/Pause/Resume/Stop wiring;
- event-sequence assignment and dedupe source logic;
- suppression-gate wiring around current blocking route dispatch;
- helper priority/session guards;
- frontend/history read-only lane mapping;
- static validator definitions and canonical documentation consistency.

Still `LOCAL PROOF REQUIRED`:

- Windows output-loopback device capture;
- actual suppression against TranslateIT TTS and mixed participant speech;
- microphone/Meeting Sound device changes;
- ASR/translation quality;
- helper contention/latency;
- Pause/Resume/Stop races;
- rendered Meeting Live behavior;
- History persistence with mixed lanes;
- Windows installed runtime.

# Hold

- do not reuse the physical microphone stream as fake Meeting Sound capture;
- do not create a second Meeting/session/conversation store;
- do not allocate shared chronology from ASR/translation callback completion order;
- do not tag incoming work with outbound authority in a way that disables it on Pause;
- do not let own TranslateIT TTS become an INCOMING turn;
- do not invent participant identity or process-specific meeting capture;
- do not add an acoustic-echo framework, incoming TTS, or partial-subtitle system in this slice.

## Next Step

Implement **Canonical Incoming Meeting Sound + Self-Output Suppression** using
`development-brief` + `windows-audio-runtime-development`, beginning with current
official Windows output-loopback/API verification and then modifying only the direct
audio/session/helper/frontend contracts above.