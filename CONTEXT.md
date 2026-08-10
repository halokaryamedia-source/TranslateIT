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
`input_device_id` and `output_device_id`; null means follow Windows Default. Candidate
devices are checked before replacing prior preferences, and explicit missing devices
must not silently fall back.

## Meeting Lifecycle / Conversation Policy

The active Meeting session is application-level, navigation-independent state. Initial
product permits one active Meeting session per runtime.

- Start is transactional and duplicate Start does not create another session.
- finalized utterances, not rolling/partial audio, are product output truth.
- Meeting outbound uses Realtime; Text uses Quality.
- session/generation/utterance authority rejects stale work.
- Pause retains `session_id` and invalidates current outbound generation.
- Resume creates fresh generation authority for the same session.
- Stop revokes output authority before resource cleanup and finalization.
- minimize/hide does not end a healthy Meeting.
- native Close is distinct from minimize: an application Meeting must safely Stop
  before the main window is destroyed.
- sleep/hibernate must not silently resume voice after interruption.

Incoming remains a separate unimplemented normal-product lane and must eventually
suppress TranslateIT's own TTS and avoid invented participant identity.

## Canonical Local AI Runtime

```text
Rust/Tauri desktop boundary
-> ONE helper scheduler / process bridge
-> ONE persistent realtime_local_worker.py
   ├─ ASR
   ├─ Translation
   └─ TTS
```

Waiting priority is `Meeting > Text > Diagnostics / preload`; it does not preempt Text
inference already running. Translation input is not silently truncated, generated
translation requires verifiable EOS completion, and outbound TTS requires an explicit
English-capable Piper/SAPI voice. Actual model/audio/performance remains local proof.

## Finalized Meeting Outbound / Committed Turns

```text
application Meeting microphone
├─ rolling audio -> preview / diagnostics only
└─ finalized utterance producer
   -> session_id + generation + utterance_id
   -> bounded one-shot queue + unique temporary WAV
   -> serialized Meeting consumer
      -> final Indonesian ASR
      -> verified Realtime English translation
      -> bounded transient committed-turn source
      -> English TTS
      -> guarded Meeting Microphone route
```

`commands/meeting_session.rs` owns the single memory-only committed-turn store.
A turn is committed only after final Indonesian ASR and verified-complete English
translation under the same authoritative generation.

```text
session_id
sequence                 # monotonic across Resume generations
generation
utterance_id
lane = you
source_text
translated_text
delivery_state
created_unix_ms
updated_unix_ms
```

Dedupe is `(session_id, generation, utterance_id)`. Delivery states are
`preparing_voice`, `speaking`, `output_complete`, `output_failed`, `interrupted`;
terminal states reject stale overwrite. Pause retains turns and interrupts non-terminal
revoked-generation work; Resume continues the same session chronology. The store is
bounded and explicitly reports dropped earlier turns.

## Normal Meeting Frontend / Live Transcript

Lifecycle truth remains the canonical Meeting commands. Conversation bodies use a
separate read-only projection:

```text
get_meeting_committed_turns
-> runtimeApi MeetingCommittedTurnsSnapshot
-> MeetingLiveActivityPresentation
```

`MeetingSessionStatus` contains no conversation body. Meeting Live rebuilds its
chronological `YOU` list from backend snapshots: Indonesian final text primary,
English verified translation secondary, truthful delivery state. Snapshot/lifecycle
`session_id` mismatch is not rendered as current text; bounded truncation is disclosed.
Frontend does not accumulate conversation authority.

## Global Meeting Cross-View / Safe Close

The existing desktop shell now owns a bounded global Meeting presentation helper:

```text
GlobalMeetingShell
-> get_meeting_session_status
-> mapProductMeetingState
-> compact strip outside Meeting
```

The strip is read-only lifecycle presentation. It shows application Meeting state on
Text/History/Settings and exposes only `Open Meeting`, delegated to existing
navigation. Pause/Resume/Stop remain Meeting-workspace actions; no second frontend
Meeting store exists.

Native close is source-wired fail-closed:

```text
close request
-> prevent close
-> fresh canonical Meeting status

no Meeting session
-> forced main-window destroy

application Meeting session
-> Keep Open / Stop & Close

unknown status / other owner
-> remain open
```

`Stop & Close` uses `runtimeProductFacade.runProductMeetingAction("stop")`, therefore
reuses canonical `stop_meeting_translation` including Meeting History finalization.
The shell requires the action result and a fresh status read to show no remaining
session before `Window.destroy()`.

If lifecycle is already `Stopping`, a pending-close transport flag waits for canonical
Stop completion rather than dispatching duplicate cleanup. The main Tauri capability
explicitly grants the required `core:window:allow-destroy` command.

`src-tauri/src/main.rs` also provides an orderly `ExitRequested` fail-safe. It checks
canonical application Meeting ownership and delegates to the same backend Stop owner;
it does not reproduce capture/helper/History cleanup. If cleanup still leaves an
application Meeting and the user control window exists, exit is prevented and the
window is restored.

Actual close-request ordering, rendering, Stop races, forced process termination,
crash/power-loss behavior, and Windows native behavior remain local/platform proof.

## History, Saved, Privacy And Storage

History is local, ON by default, user-disableable, and contains Meeting/Text only.
Saved is explicit durable ownership with independent lifetime. Clear Recent does not
delete Saved; removing Saved does not delete Recent. Persistent History/Saved is never
automatic model context.

Storage roots remain:

```text
UserData/CacheData/    -> disposable runtime/session data
UserData/LogData/      -> minimal/redacted diagnostics
UserData/SavedProject/ -> persistent user-visible/user-approved data
```

Canonical History:

```text
UserData/SavedProject/History/
├─ Recent/
└─ Saved/
```

Text and finalized Meeting History are source-connected. Persistent History does
**not** own the Live transcript.

Full Stop keeps safety cleanup first, then persists only the immutable final committed-
turn snapshot when current `history_enabled` allows it. History persistence failure is
reported but cannot prevent safety-critical Stop; transient conversation bodies are
still cleared. Empty Meetings do not create empty Recent entries. Pause/Resume do not
persist History and no live incremental Meeting History writer exists.

History schema version 2 carries backward-compatible `dropped_turn_count`. Finalized
Meeting History stores duration, interrupted status, ID->EN metadata and `HistoryTurn`
rows with sequence/lane/source/translation/delivery state/time. Raw audio and generated
TTS are not normal History content. History detail and generic Save / Remove from Saved
are shared by Meeting and Text.

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

Source-side alignment on `New` now includes:

- setup/device preference and Meeting/Text/History/Settings hierarchy;
- one persistent AI worker + one helper scheduler;
- Meeting Realtime / Text Quality ownership;
- finalized Meeting utterance production and serialized outbound execution;
- canonical Start/Stop and Pause/Resume fresh-generation lifecycle;
- bounded committed Meeting turn owner + read-only Live transcript projection;
- Meeting Live chronological outbound transcript from backend snapshots;
- Meeting History Stop finalization through current `history_enabled` into canonical
  Recent History, followed by transient-body cleanup;
- backward-compatible History truncation metadata and finalized Meeting History detail;
- generic Saved actions shared by Text and Meeting;
- global cross-view Meeting strip from canonical lifecycle status;
- safe `Stop & Close` source wiring with post-Stop session verification;
- orderly native-exit delegation to the same backend Stop owner;
- static source-contract validation definitions for these boundaries.

Still incomplete or unproved:

- incoming Meeting Sound, committed `INCOMING` turns, self-output suppression, turn
  coordination, and recovery;
- actual Rust/TypeScript compilation, static-validator execution, native close events,
  and Tauri/filesystem persistence runtime;
- rendered Meeting/History/global-strip/dialog behavior;
- microphone/VAD and Pause/Resume/Stop/close race timing;
- actual model translation/TTS quality and Meeting Microphone delivery;
- tone/context inference, Text Copy/direct Save;
- multi-instance enforcement and sleep/hibernate behavior;
- scheduler contention suitability;
- reproducible Python lock/model acquisition metadata;
- model quality/latency/RAM/VRAM and Windows route proof;
- clean installer/runtime asset reconciliation.

Source presence does not prove target-PC readiness, native close behavior, or
persistence behavior. Do not claim model/device/audio/rendered/installed success
without the required local proof.

## Canonical Owners

- `AGENTS.md` — working/evidence rules.
- `CONTEXT.md` — compact stable context.
- `docs/foundation/` — durable product/system policy.
- `docs/knowledge/decision-log.md` — durable reasoning.
- `docs/knowledge/next-action.md` — single continuation point.
- `docs/knowledge/source-ownership.md` — semantic source ownership map.

The next task owner is `docs/knowledge/next-action.md`.
