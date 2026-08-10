# TranslateIT Workspace Context

Updated: 2026-08-10  
Working branch: `New`  
Recovery baseline: `V1-Advance` at `6fd3485d6b22b9e3f44abc640241532aea61c3c7`

This file stores compact durable project context only. Detailed requirements belong
in `docs/foundation/02-product-requirements.md`; active continuation belongs in
`docs/knowledge/next-action.md`.

## Product Direction

TranslateIT is primarily a **Windows desktop application for real-time local voice
translation in online meetings**.

```text
Outbound
Indonesian speech -> Indonesian transcript -> English translation -> English TTS
-> TranslateIT Meeting Microphone -> meeting application

Incoming assistance
English meeting speech -> English transcript -> Indonesian translated text -> local user
```

Standalone Indonesian <-> English Text is the bounded secondary workflow.
Document Translation is removed from current product scope.

## Product Navigation / UI

Normal navigation:

```text
Meeting
Text
History
Settings
```

History is `Recent / Saved`. Normal Settings is `Meeting / History & Privacy /
Advanced -> Diagnostics`. Saved is not top-level navigation.

UI target is **Modern + Easy to use + Familiar**. Meeting lifecycle conditions are
states of one workspace. Meeting Ready is setup/decision-oriented; Meeting Live is
transcript-first. Global Meeting indicators/alerts/dialogs are shell elements, not
separate product pages.

## Initial Boundary

- Platform: Windows.
- Runtime: local-first/offline-capable after required assets are installed.
- Languages: Indonesian + English initially.
- Meeting outbound: Indonesian speech -> English voice.
- Incoming assistance: English speech -> Indonesian text.
- Text: Indonesian <-> English.
- No silent cloud dependency/fallback.

## First Use / Devices

First use guides `Your microphone`, `Meeting sound`, `TranslateIT Meeting Microphone`,
and local translation readiness. Only setup progress facts are persisted:

```text
meeting_setup_state      -> new | deferred | completed
meeting_setup_checkpoint -> 1..5
```

Physical audio preferences remain in `RuntimeSettings.audio`:

```text
input_device_id  -> physical microphone
output_device_id -> Meeting Sound output endpoint
```

`null` means Follow Windows Default. Explicit pinned missing devices are not silently
replaced.

`probe_output_device_candidate` verifies that the selected Meeting Sound endpoint has a
usable output mix configuration. The actual loopback stream is owned separately by
`engine/audio/meeting_sound_capture.rs` and remains Windows runtime proof. Current
incoming source resolves the selected/default endpoint when its lane starts; automatic
mid-session rebind after a Windows Default output change is not implemented yet.

## Meeting Lifecycle / Conversation Policy

The active Meeting is one application-level, navigation-independent session.

- Start is transactional and duplicate Start does not create another session.
- finalized utterances, not rolling/partial audio, are product output truth.
- Meeting outbound uses Realtime; Text uses Quality.
- outbound session/generation authority rejects stale work.
- Pause retains `session_id` and invalidates the current **outbound** generation.
- Resume creates a fresh outbound generation for the same session.
- healthy incoming Meeting Sound is session-scoped and may continue during outbound Pause.
- Stop revokes outbound authority, ends both audio lanes, finalizes History policy, and
  clears transient Meeting state.
- minimize/hide does not end a healthy Meeting.
- native Close requires safe canonical Stop before main-window destruction when a
  Meeting still exists.
- sleep/hibernate must not silently resume voice after interruption; implementation is
  still incomplete.

## Canonical Local AI Runtime

```text
Rust/Tauri desktop boundary
-> ONE helper scheduler / process bridge
-> ONE persistent realtime_local_worker.py
   ├─ ASR
   ├─ Translation
   └─ TTS
```

Current waiting priority is:

```text
Meeting outbound
> Meeting incoming
> Text
> Diagnostics / preload
```

The scheduler remains non-preemptive for already-running work. Outbound helper requests
carry Meeting generation authority. Incoming requests carry application Meeting
`session_id + lane=incoming` and are checked against current session eligibility before
execution and promotion.

Actual contention/performance remains local proof.

## Dual-Lane Audio / Finalized Speech

Physical microphone:

```text
RuntimeSettings.audio.input_device_id
-> engine/audio/live_capture.rs
-> outbound finalized speech
```

Meeting Sound:

```text
RuntimeSettings.audio.output_device_id
-> engine/audio/meeting_sound_capture.rs
-> selected render/output endpoint loopback
-> incoming finalized speech
```

The Meeting Sound owner uses the existing CPAL/WASAPI dependency path rather than a
second Windows audio runtime. Actual Windows loopback/device behavior remains local
proof; mid-session Follow Windows Default rebind is a separate source gap.

`engine/audio/finalized_utterance.rs` now owns one dual-lane finalization boundary:

```text
FinalizedMeetingUtterance
session_id
sequence                 # session-wide speech/event order, assigned before AI
lane = you | incoming
generation = Some(...)   # outbound only; incoming None
utterance_id             # lane-local provenance
frame
```

Lane VAD state is independent, but `sequence` is shared. New Start resets that event
sequence. Pause preserves the sequence and incoming producer. Resume adds a fresh
outbound generation to the same chronology. Stop clears both.

Incoming pending finalized speech is bounded and freshness-biased so old subtitle work
does not grow without bound.

## Canonical Committed Meeting Turns

`commands/meeting_session.rs` remains the only memory-only conversation-body owner:

```text
session_id
sequence
generation: optional     # outbound only
utterance_id
lane = you | incoming
source_text
translated_text
delivery_state: optional # outbound only
created_unix_ms
updated_unix_ms
```

Dedupe is `(session_id, sequence)`. Turns are inserted/read in the preassigned
speech/event order even if later model callbacks finish earlier.

Outbound delivery states remain:

```text
preparing_voice
speaking
output_complete
output_failed
interrupted
```

Incoming has no delivery state because it performs text assistance only.

### Outbound

```text
finalized YOU event
-> final Indonesian ASR
-> generation check
-> verified Realtime Indonesian -> English translation
-> committed YOU turn
-> English TTS
-> guarded Meeting Microphone route
```

### Incoming

```text
finalized INCOMING event
-> final English ASR
-> same Meeting session check
-> verified Realtime English -> Indonesian translation
-> same session check
-> committed INCOMING turn
```

Failed/empty/canceled incoming work does not become normal transcript/History content.
Incoming failure is optional/degradable and does not block otherwise healthy required
outbound.

## Self-Output Suppression

`meeting_session.rs` owns one transient session-scoped atomic suppression gate;
`meeting_sound_capture.rs` only consumes it.

```text
TranslateIT is about to route its English TTS
-> reset incoming speech boundary
-> suppression ON
-> guarded blocking Meeting route playback

Meeting Sound callback while suppression ON
-> discard samples
-> reset incoming VAD boundary
-> create no INCOMING event from that interval

route returns/cancels
-> suppression OFF
-> reset boundary
-> healthy incoming resumes listening
```

If the suppression gate itself is unavailable, outbound route delivery is blocked
rather than risking TranslateIT's own English TTS becoming an `INCOMING` turn.

Initial tradeoff: participant speech mixed into Meeting Sound while TranslateIT is
speaking may be omitted. Acoustic echo cancellation, waveform/content fingerprinting,
participant separation, and partial incoming subtitles are not part of this current
source boundary.

## Normal Meeting Frontend / Live Transcript

Lifecycle truth remains the canonical Meeting commands. Conversation bodies use only:

```text
get_meeting_committed_turns
-> runtimeApi MeetingCommittedTurnsSnapshot
-> MeetingLiveActivityPresentation
```

`MeetingSessionStatus` stays body-free and now includes lightweight incoming
capture/stage/degraded/suppressed status.

Live transcript renders the canonical `sequence`:

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

Frontend rebuilds from backend snapshots rather than accumulating conversation
authority. Incoming-only degradation stays scoped to Meeting.

## Global Meeting Cross-View / Safe Close

The existing desktop shell owns a bounded global Meeting presentation helper:

```text
GlobalMeetingShell
-> get_meeting_session_status
-> mapProductMeetingState
-> compact strip outside Meeting
```

The strip exposes only `Open Meeting`; normal Pause/Resume/Stop remain Meeting-workspace
actions.

`Stop & Close` reuses canonical `stop_meeting_translation`, including both audio lanes
and History finalization, and requires a fresh status read showing no remaining session
before `Window.destroy()`. Orderly `ExitRequested` delegates to the same Stop owner.

Actual native close ordering/races remain local proof.

## History, Saved, Privacy And Storage

History is local, ON by default, user-disableable, and contains Meeting/Text only.
Saved is explicit durable ownership with independent lifetime. Clear Recent does not
delete Saved; removing Saved does not delete Recent. Persistent History/Saved is never
automatic model context.

Canonical storage:

```text
UserData/CacheData/               -> disposable runtime/session data
UserData/LogData/                 -> minimal/redacted diagnostics
UserData/SavedProject/History/
├─ Recent/
└─ Saved/
```

Full Stop persists only the immutable final committed-turn snapshot when current
`history_enabled` allows it. The same `HistoryTurn.lane` stores `YOU` and `INCOMING`;
incoming delivery state remains null. Meeting History detail uses the same lane visual
semantics as Live.

Raw microphone/Meeting Sound audio and generated TTS are not normal History content.

## Translation / Text / Settings

Translation priority is intended meaning -> factual/entity fidelity -> natural target
grammar -> appropriate tone.

Approved tone policy is `Auto / Formal / Casual`, default Auto, but canonical inference
still does **not** consume the approved tone or bounded committed Meeting context. That
is the next planning boundary.

Standalone Text is explicit Translate -> review/edit -> Copy/Save; large input is not
silently truncated or redirected to Documents. Text History is source-connected; Text
Copy/direct Save remains incomplete.

Meeting Settings owns speaking/device/managed Meeting Microphone preferences. History
& Privacy owns History On/Off and Clear History. Advanced owns setup health and
Diagnostics.

## Python Tooling / Distribution

`EngineData/Backend/LocalWorker/WorkerRuntime/pyproject.toml` is the one Python
dependency/tooling owner. `uv` is developer tooling, not an end-user requirement.
`uv.lock` awaits verified local resolution; Ruff/pytest are configured but not executed
in the current ChatGPT -> GitHub channel.

Canonical architecture remains Rust/Tauri desktop shell + Python helper runtime.
`EngineData` is implementation authority, `UserData` runtime/user data, and
`DevelopingData` historical/reference evidence.

## Current Implementation Evidence Boundary

Source-side alignment on `New` now includes:

- setup/device preference and Meeting/Text/History/Settings hierarchy;
- one persistent AI worker + one lane-aware helper scheduler;
- Meeting Realtime / Text Quality ownership;
- physical-mic outbound capture + initial Meeting Sound output-loopback source owner;
- shared finalized `YOU` / `INCOMING` event sequence before AI;
- canonical Start/Stop and Pause/Resume generation/session lifecycle;
- serialized outbound and incoming Meeting consumers;
- deterministic self-output suppression source gate around guarded TTS route playback;
- one bounded dual-lane committed Meeting turn store;
- read-only dual-lane Live transcript projection;
- Meeting History Stop finalization through current `history_enabled`;
- dual-lane Meeting History detail + generic Saved reuse;
- global cross-view Meeting strip;
- safe `Stop & Close` + orderly native-exit delegation;
- static source-contract validator definitions for these boundaries.

Still incomplete or unproved:

- mid-session Follow Windows Default Meeting Sound output-device change/rebind handling is not implemented;
- TypeScript/Rust compilation and static-validator execution;
- actual Windows Meeting Sound loopback, suppression effectiveness, physical mic/VAD,
  initial pinned/default-device behavior, and audio route delivery;
- actual ASR/translation/TTS model quality/latency and lane contention suitability;
- rendered Meeting/History/global-strip/dialog behavior;
- lifecycle/audio race timing and filesystem History persistence;
- tone/context inference, Text Copy/direct Save;
- multi-instance enforcement and sleep/hibernate behavior;
- reproducible Python lock/model acquisition metadata;
- clean installer/runtime asset reconciliation.

Source presence does not prove target-PC readiness, Windows audio behavior, native close,
persistence, model quality, or rendered UI. Do not claim those without required local
proof.

## Canonical Owners

- `AGENTS.md` — working/evidence rules.
- `CONTEXT.md` — compact stable context.
- `docs/foundation/` — durable product/system policy.
- `docs/knowledge/decision-log.md` — durable reasoning.
- `docs/knowledge/next-action.md` — single continuation point.
- `docs/knowledge/source-ownership.md` — semantic source ownership map.

The next task owner is `docs/knowledge/next-action.md`.
