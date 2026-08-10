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

Readiness is revalidated. Physical audio preferences remain in `RuntimeSettings.audio`:

```text
input_device_id  -> physical microphone
output_device_id -> Meeting Sound output endpoint
```

`null` means Follow Windows Default. Candidate devices are checked before replacing
prior preferences, and explicit missing devices must not silently fall back.

Current `probe_output_device_candidate` verifies only endpoint/config availability; it
does not yet capture Meeting Sound.

## Meeting Lifecycle / Conversation Policy

The active Meeting session is application-level, navigation-independent state. Initial
product permits one active Meeting session per runtime.

- Start is transactional and duplicate Start does not create another session.
- finalized utterances, not rolling/partial audio, are product output truth.
- Meeting outbound uses Realtime; Text uses Quality.
- outbound session/generation/utterance authority rejects stale work.
- Pause retains `session_id` and invalidates current **outbound** generation.
- Resume creates fresh outbound generation authority for the same session.
- Stop revokes output authority before resource cleanup and finalization.
- minimize/hide does not end a healthy Meeting.
- native Close is distinct from minimize: an application Meeting must safely Stop
  before the main window is destroyed.
- sleep/hibernate must not silently resume voice after interruption.

Incoming is a separate optional lane inside the **same** Meeting session. Its source
boundary is now planned but not yet implemented. Healthy incoming must be able to
continue while outbound is Paused; Stop still ends both lanes before History
finalization.

## Canonical Local AI Runtime

```text
Rust/Tauri desktop boundary
-> ONE helper scheduler / process bridge
-> ONE persistent realtime_local_worker.py
   ├─ ASR
   ├─ Translation
   └─ TTS
```

Current source waiting priority remains `Meeting > Text > Diagnostics / preload` and
is non-preemptive. The planned incoming slice will refine waiting Meeting work to:

```text
Meeting outbound > Meeting incoming > Text > Diagnostics / preload
```

There will still be one scheduler/worker. Actual contention/performance remains local
proof.

Translation input is not silently truncated, generated translation requires
verifiable completion, and outbound TTS requires an explicit English-capable
Piper/SAPI voice.

## Current Outbound Audio / AI Source

```text
physical microphone
-> live_capture.rs
-> finalized_utterance.rs
-> finalized temporary WAV
-> meeting_session.rs serialized outbound consumer
-> final Indonesian ASR
-> verified Realtime English translation
-> committed YOU turn
-> English TTS
-> guarded Meeting Microphone route
```

The current finalized producer is outbound-only in source. `meeting_session.rs` owns
the single bounded memory-only committed-turn store.

Current outbound committed data:

```text
session_id
sequence
generation
utterance_id
lane = you
source_text
translated_text
delivery_state
created_unix_ms
updated_unix_ms
```

Current outbound delivery states are `preparing_voice`, `speaking`, `output_complete`,
`output_failed`, and `interrupted`. The store is bounded and reports dropped earlier
turns.

## Planned Incoming Meeting Sound Boundary

Incoming implementation will preserve distinct responsibility while sharing the same
Meeting/session/conversation authority.

```text
RuntimeSettings.audio.output_device_id
-> dedicated Rust/Windows Meeting Sound output-loopback capture
-> shared finalized Meeting-speech boundary
-> finalized INCOMING event
-> final English ASR
-> verified Realtime English -> Indonesian translation
-> same committed-turn store
-> Live transcript / final History
```

Planned capture owner:

```text
engine/audio/meeting_sound_capture.rs
```

It owns Windows output-loopback PCM only. It does not own lifecycle, inference,
conversation state, History, or frontend state. Exact Windows API/binding must be
verified before source implementation.

### Shared speech/event ordering

Two lanes cannot safely allocate conversation chronology after model completion.
`audio/finalized_utterance.rs` will therefore become the one Meeting finalized-event
owner with independent lane VAD state and a **session-wide sequence allocated when
speech finalizes, before AI**.

Conceptual finalized event:

```text
session_id
sequence                 # speech/event order
lane = you | incoming
generation = Some(...)   # outbound only; incoming None
utterance_id
frame
```

New Start resets the event sequence. Pause disables outbound finalization while
retaining incoming and session sequence. Resume attaches the fresh outbound generation
to that same session chronology.

The committed store remains in `meeting_session.rs` and will accept the preassigned
sequence, deduplicating by `(session_id, sequence)`. Planned lane-neutral turn data has
optional `generation` and optional `delivery_state`; incoming has no voice-delivery
claim.

### Incoming Pause authority

Incoming is session-scoped rather than outbound-generation-scoped. Its AI requests
must verify the same application Meeting `session_id` remains active and not Stopping/
ended. This permits incoming during outbound Pause without creating another authority.

### Self-output suppression

Current guarded virtual-audio provider performs blocking TTS WAV playback. The planned
minimum suppression policy uses one transient atomic gate owned/orchestrated by
`meeting_session.rs` around that blocking route:

```text
TranslateIT TTS route starts
-> suppression ON
-> Meeting Sound samples discarded
-> in-progress incoming VAD reset
-> no incoming event can finalize from this interval

route returns/cancels
-> suppression OFF
-> incoming resumes from a fresh boundary
```

This intentionally may omit participant speech mixed into Meeting Sound while
TranslateIT itself is speaking. That fail-closed tradeoff is preferred to presenting
TranslateIT's own English TTS as remote speech. No acoustic-echo framework, content-
similarity filter, waveform fingerprint store, or second suppression runtime is part
of the planned slice.

Incoming partial subtitles remain optional and are not part of the first source slice.
Participant identity is not invented from mixed/device-level audio.

## Normal Meeting Frontend / Live Transcript

Lifecycle truth remains the canonical Meeting commands. Conversation bodies use:

```text
get_meeting_committed_turns
-> runtimeApi MeetingCommittedTurnsSnapshot
-> MeetingLiveActivityPresentation
```

`MeetingSessionStatus` contains no conversation body. Current source renders outbound
`YOU` turns only. The incoming slice will keep the same projection and render:

```text
YOU
Indonesian primary
English secondary
outbound delivery state

INCOMING
Indonesian translation primary
English source secondary
no participant identity / no voice-delivery claim
```

Frontend must continue rebuilding from backend snapshots rather than accumulating
conversation authority. A lightweight body-free incoming runtime status may be added
for listening/processing/degraded/suppressed presentation.

## Global Meeting Cross-View / Safe Close

The existing desktop shell owns a bounded global Meeting presentation helper:

```text
GlobalMeetingShell
-> get_meeting_session_status
-> mapProductMeetingState
-> compact strip outside Meeting
```

The strip is read-only lifecycle presentation. It shows application Meeting state on
Text/History/Settings and exposes only `Open Meeting`. Pause/Resume/Stop remain local
Meeting actions.

Native close is source-wired fail-closed. `Stop & Close` reuses canonical
`stop_meeting_translation`, including History finalization, and requires a fresh status
read showing no session before `Window.destroy()`. Orderly `ExitRequested` likewise
delegates to the same Stop owner rather than reproducing cleanup.

Actual close ordering/races and Windows native behavior remain local proof.

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

Text and finalized outbound Meeting History are source-connected. History does not own
Live transcript state.

Full Stop persists only the immutable final committed-turn snapshot when current
`history_enabled` allows it. Persistence failure cannot prevent safety-critical Stop.
History schema v2 carries `dropped_turn_count`; `HistoryTurn.lane` already supports
`incoming`, so planned incoming turns can reuse the same persistence owner without a
new History schema/store for conversation content.

Raw audio and generated TTS are not normal History content.

## Translation / Text / Settings

Translation priority is intended meaning -> factual/entity fidelity -> natural target
grammar -> appropriate tone. Tone policy is Auto/Formal/Casual, default Auto; current
canonical inference still does not consume the approved tone/context contract.

Standalone Text is explicit Translate -> review/edit -> Copy/Save; large input is not
silently truncated or redirected to Documents. Text History is source-connected; Text
Copy/direct Save remains incomplete.

Meeting Settings owns speaking/device/managed Meeting Microphone preferences. History
& Privacy owns History On/Off and Clear History. Advanced owns setup health and
Diagnostics. Normal users do not operate Python/helper/model/CUDA/VAD/queue internals.

## Python Tooling / Distribution

`EngineData/Backend/LocalWorker/WorkerRuntime/pyproject.toml` is the one Python
dependency/tooling owner. `uv` is developer tooling, not an end-user requirement.
`uv.lock` awaits verified local resolution; Ruff/pytest are configured but not executed
in the current ChatGPT -> GitHub channel.

Canonical architecture remains Rust/Tauri desktop shell + Python helper runtime.
`EngineData` is implementation authority, `UserData` runtime/user data, and
`DevelopingData` historical/reference evidence. Windows internal/controlled
distribution is first; clean-machine packaging proof remains later.

## Current Implementation Evidence Boundary

Source-side alignment on `New` includes:

- setup/device preference and Meeting/Text/History/Settings hierarchy;
- one persistent AI worker + one helper scheduler;
- Meeting Realtime / Text Quality ownership;
- finalized outbound Meeting utterance production and serialized outbound execution;
- canonical Start/Stop and Pause/Resume fresh-generation lifecycle;
- bounded committed outbound Meeting turn owner + read-only Live transcript projection;
- Meeting History Stop finalization through current `history_enabled`;
- finalized Meeting History detail + generic Saved reuse;
- global cross-view Meeting strip;
- safe `Stop & Close` with post-Stop session verification;
- orderly native-exit delegation to the same Stop owner;
- static source-contract validation definitions for these implemented boundaries.

Incoming architecture is now **planned/owner-resolved but not implemented**:

- distinct Meeting Sound output-loopback capture owner;
- shared finalized speech/event sequence across `YOU` + `INCOMING`;
- session-scoped incoming authority that may survive outbound Pause;
- deterministic self-output suppression gate;
- one committed-turn store and one helper scheduler with planned lane priority.

Still incomplete or unproved:

- actual incoming Meeting Sound source implementation and `INCOMING` Live turns;
- Rust/TypeScript compilation and static-validator execution;
- Windows output-loopback, self-output suppression, VAD, device changes, model/audio
  quality, Meeting Microphone delivery, and lifecycle race timing;
- rendered Meeting/History/global-strip/dialog behavior;
- tone/context inference, Text Copy/direct Save;
- multi-instance enforcement and sleep/hibernate behavior;
- scheduler contention suitability;
- reproducible Python lock/model acquisition metadata;
- model quality/latency/RAM/VRAM and clean installer/runtime reconciliation.

Source presence does not prove target-PC readiness, native close behavior, persistence,
or Windows audio behavior. Do not claim model/device/audio/rendered/installed success
without the required local proof.

## Canonical Owners

- `AGENTS.md` — working/evidence rules.
- `CONTEXT.md` — compact stable context.
- `docs/foundation/` — durable product/system policy.
- `docs/knowledge/decision-log.md` — durable reasoning.
- `docs/knowledge/next-action.md` — single continuation point.
- `docs/knowledge/source-ownership.md` — semantic source ownership map.

The next task owner is `docs/knowledge/next-action.md`.