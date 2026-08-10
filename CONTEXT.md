# TranslateIT Workspace Context

Updated: 2026-08-10  
Working branch: `New`  
Recovery baseline: `V1-Advance` at `6fd3485d6b22b9e3f44abc640241532aea61c3c7`

This file stores compact durable project context only. Detailed requirements belong
in `docs/foundation/02-product-requirements.md`; active continuation belongs in
`docs/knowledge/next-action.md`.

## Product Direction

TranslateIT is primarily a **Windows desktop application for real-time voice
translation in online meetings**.

Primary outbound flow:

```text
Indonesian speech
-> Indonesian transcript
-> English translation
-> English TTS
-> TranslateIT Meeting Microphone
-> meeting application
```

Primary inbound assistance:

```text
English meeting speech
-> English transcript
-> Indonesian translated text
-> local user
```

Standalone Indonesian <-> English Text is the bounded secondary workflow.

**Document Translation is removed from current product scope.** Do not revive a
Documents workspace, parser/export/job system, OCR, file-attachment translation, or
document-specific History/Saved infrastructure from inherited source.

## Product Navigation And UI Principle

Normal top-level navigation:

```text
Meeting
Text
History
Settings
```

History:

```text
History
├─ Recent
└─ Saved
```

Normal Settings:

```text
Meeting
History & Privacy
Advanced
    └─ Diagnostics
```

`Saved` remains distinct durable ownership but is not top-level navigation.
`General`, global `Translation`, `Documents`, and top-level `Saved` are not normal
current destinations.

UI target is **Modern + Easy to use + Familiar** for a nontechnical Windows desktop
user. Prefer conventional desktop patterns, obvious wording/actions, low control
density, restrained surfaces, and progressive disclosure over novelty or technical
flexibility.

Meeting lifecycle conditions are states of one Meeting workspace. Meeting Ready is a
simple setup/decision composition; Meeting Live is transcript-first by approved
product direction, with activity and session controls remaining in the same workspace.
Global Meeting indicators/alerts/dialogs are shell elements rather than pages.

## Initial Product Boundary

- Initial platform: **Windows**.
- Core runtime: local-first/offline-capable after required assets are installed.
- Initial languages: Indonesian and English.
- Outbound: Indonesian speech -> English voice.
- Incoming assistance: English speech -> Indonesian text.
- Text: Indonesian <-> English.
- English speech -> Indonesian TTS is not initial scope.
- Additional languages are future scope.
- Core never silently depends on cloud assistance.

## First Use And Device Preferences

First use is guided setup for `Your microphone`, `Meeting sound`, `TranslateIT
Meeting Microphone`, and local translation readiness. Setup may be intentionally
deferred without pretending Meeting succeeded; Text remains independently usable
when its translation runtime is available.

Only setup-flow facts are persisted:

```text
meeting_setup_state      -> new | deferred | completed
meeting_setup_checkpoint -> 1..5
```

These facts never represent runtime readiness. `Ready` is revalidated from current
runtime/device evidence.

Physical audio preferences use `RuntimeSettings.audio`:

```text
input_device_id  -> null means follow Windows Default; otherwise explicit microphone
output_device_id -> null means follow Windows Default; otherwise explicit Meeting sound
```

New candidates are checked before replacing a previous persisted preference. An
explicit pinned microphone must not silently fall back to another microphone.
Meeting Sound candidate checking proves only endpoint/config availability, not the
incoming translation lane.

## Meeting Readiness And Live Conversation Policy

Returning launch opens Meeting and performs product-level readiness checks. The
primary action is `Start Translation`.

Meeting `Ready` is based on required outbound safety. Incoming English -> Indonesian
text is optional/degradable. Start is transactional and duplicate Start must not
create duplicate sessions.

The active Meeting session is application-level state, not page-local state.
Navigation to Text, History, or Settings must not stop/recreate a healthy Meeting.
One active Meeting session per runtime is the initial contract.

Conversation behavior:

- Session Listening primary; Push-to-Talk secondary (`Ctrl+Space`).
- natural/adaptive speech boundaries, not inherited fixed timing constants;
- partial outbound ASR is preview-only;
- final/stable utterance is the translation/TTS commit boundary;
- own TTS is serialized and delivery is at-most-once by default;
- session/generation/utterance identity prevents stale work re-entry;
- backlog is bounded;
- Pause stops new/pending outbound while retaining the application Meeting session;
- Resume creates fresh generation authority for the same `session_id`;
- Stop is distinct full-session authority revoke + cleanup;
- minimize does not end a healthy Meeting;
- sleep/hibernate interrupts live translation and does not auto-resume voice.

Incoming remains a separate lane:

```text
Meeting Sound
-> English ASR
-> Indonesian text
```

It must suppress TranslateIT's own TTS, avoid invented participant identity, and
degrade before core outbound under resource pressure.

## Translation Behavior

- meaning-preserving/contextual, not word-for-word;
- priority: intended meaning -> factual/entity fidelity -> natural target grammar ->
  appropriate tone;
- Tone: Auto / Formal / Casual; Auto default;
- names, numbers, dates, units, URLs, identifiers, versions, acronyms, and facts stay
  accurate;
- recent committed Meeting context may be bounded/local/session-scoped;
- persistent History/Saved never automatically becomes model context.

User-facing execution modes:

```text
Meeting outbound -> Realtime
Standalone Text  -> Quality
```

`RuntimeSettings.runtime_profile` is compatibility-only and must not become a shared
engine-mode authority again. No silent Realtime <-> Quality retry and no silent cloud
fallback.

CUDA is preferred when validated but not mandatory. CPU fallback is required. Final
latency thresholds are benchmark-derived; official outbound latency starts at detected
utterance end and ends when translated audio first begins playing.

## Standalone Text

Text follows an explicit action workflow:

```text
Type / paste
-> ID <-> EN
-> Translate
-> review/edit
-> Copy or Save
```

Older results cannot overwrite newer intent. Editing source after a result marks the
result outdated. Large input is never silently truncated or redirected to Documents.
Current source explicitly requests Quality translation and requires verifiable EOS
completion before successful output.

Outbound English TTS requires an explicitly identified English-capable Piper/SAPI
voice rather than an arbitrary/default voice.

## History, Saved, Privacy And Storage

- History is local, automatic when enabled, ON by default, and user-disableable.
- History contains Meeting and Text only.
- Saved is explicit durable work with independent lifetime.
- Clear/delete History never deletes Saved; removing Saved never deletes History.
- Turning History off affects new/current retention but does not delete existing
  History/Saved.
- History search is local retrieval only, never model context.
- Raw microphone/incoming audio and generated TTS are temporary by default.
- Logs are minimal/redacted and do not contain conversation bodies by default.

Storage roots:

```text
UserData/CacheData/    -> disposable runtime/session data
UserData/LogData/      -> minimal/redacted diagnostics
UserData/SavedProject/ -> persistent user-visible/user-approved data
```

Canonical product History:

```text
UserData/SavedProject/History/
├─ Recent/
└─ Saved/
```

Text History/Saved is source-connected. Meeting History still waits for a grounded
committed-turn handoff; persistent History must not become the live transcript owner
by accident.

## Settings Boundary

Meeting Settings owns Session Listening/PTT preference, physical microphone, Meeting
Sound, managed Meeting Microphone setup/check, and scoped recovery. History & Privacy
owns History On/Off and Clear History. Advanced owns setup health and Developer
Diagnostics. Normal users do not operate Python/helper/model/CUDA/VAD/queue internals.
Persist preferences; revalidate readiness instead of persisting `ready=true` truth.

## Canonical Local AI Runtime

Current source has one AI execution architecture:

```text
Rust/Tauri product boundary
-> ONE helper scheduler / process bridge
-> ONE persistent realtime_local_worker.py
   ├─ ASR
   ├─ Translation
   └─ TTS
```

Standalone Text and Meeting outbound share the process but own their semantic modes
separately. Waiting priority is:

```text
Meeting > Text > Diagnostics / preload
```

This priority is non-preemptive for a Text inference already in flight.

Meeting work uses application `session_id + generation` authority. Stale generations
are rejected before worker execution and before result promotion. Pause invalidates
the current outbound generation while retaining the Meeting session, then targets
matching route/capture/helper/finalized-consumer work. Resume establishes a fresh
generation for the same session and may restore the existing helper runtime after a
matching hard cancellation. Stop remains the full-session revoke/cleanup. Actual
cancellation/restart timing remains local proof.

Static model installation, current worker capability, request inference success,
model quality, and Meeting Start safety are distinct facts and must not be collapsed
into one `Ready` boolean.

## Finalized Meeting Outbound Source

The outbound capture boundary is source-separated:

```text
application Meeting microphone capture
├─ rolling audio buffer -> preview / diagnostics only
└─ finalized utterance producer
   -> Realtime VAD profile + adaptive end silence
   -> session_id + generation + utterance_id
   -> one-shot queue consumption
   -> unique temporary 16 kHz mono WAV
   -> canonical Meeting ASR -> Realtime translation -> English TTS -> route
```

`ready_for_target_asr_frame` on the rolling buffer is **not** a final utterance signal.
Only the application Meeting capture owner activates finalized-output production.
The finalizer does not run AI; one serialized Meeting consumer processes each queued
final once and removes temporary finalized WAVs afterward.

Pause revokes generation authority before matching route/capture/helper/consumer
cleanup while retaining the application session as Paused. Resume keeps the same
session identity, creates fresh generation authority, rechecks preflight, and
transactionally reopens capture/finalized consumption; failed reopen returns the new
generation to Paused. Stop remains distinct full-session cleanup.

## Normal Meeting Frontend And Live Activity

Normal frontend lifecycle truth comes from:

```text
get_meeting_session_status
start_meeting_translation
pause_meeting_translation
resume_meeting_translation
stop_meeting_translation
```

`runtimeProductFacade` maps the application owner into
Ready/Starting/Live/Paused/Resuming/Stopping/conflict states. The existing Simple
Launcher owns lifecycle actions; navigation remains presentation-only and Mic Test is
blocked while a runtime Meeting session exists.

The current Live surface also has a bounded **read-only activity presentation**:

```text
MeetingLiveActivityPresentation
-> get_meeting_session_status
-> mapProductMeetingState
-> current Meeting panel
```

It refreshes only while the Meeting workspace is visible and the existing primary
Meeting status is active. Canonical outbound stages are mapped to plain-language
Listening / Transcribing / Translating / Preparing voice / Speaking / Needs attention /
Paused copy. Ready setup rows are restored when the primary controller returns to a
non-active state. The renderer does not call lifecycle mutation actions and does not
create a frontend Meeting store.

Current `MeetingSessionStatus` does **not** expose committed Indonesian transcript and
English translation bodies as bounded product turn state. Those values exist only
inside active outbound processing. Therefore chronological transcript rows are not yet
implemented and must not be manufactured from worker response JSON, rolling audio,
Diagnostics, logs, or frontend accumulation. The next canonical boundary is to plan
one transient committed-turn owner and its later History handoff.

## Python Project / Development Tooling

Canonical Python dependency/tooling owner:

```text
EngineData/Backend/LocalWorker/WorkerRuntime/pyproject.toml
```

It owns runtime dependencies, optional guarded route extra, Ruff policy, and pytest
development configuration. `uv` is the preferred developer resolver/environment tool,
not an end-user requirement. `uv.lock` is not fabricated and awaits verified local
resolution. Ruff/pytest configuration exists but has not been executed in this
ChatGPT -> GitHub channel. `py-spy` remains an external local profiler.

## Architecture / Distribution

Canonical architecture:

```text
Rust/Tauri desktop shell
+
Python helper runtime
```

Current roots:

```text
Desktop application -> EngineData/Frontend/RustApp
Internal helper      -> EngineData/Backend/LocalWorker/WorkerRuntime
Runtime contracts    -> EngineData/Backend/RuntimeContracts
Runtime assets       -> EngineData/Backend/RuntimeAssets
Runtime/user data    -> UserData
Historical evidence  -> DevelopingData
```

`EngineData` is implementation authority. `UserData` is runtime/user data.
`DevelopingData` is historical/reference evidence, not normal production dependency.

Windows internal/controlled distribution is first. Installed builds must eventually
provide one setup and must not require manual Python/pip/model/uv operation. Clean
supported-Windows proof is required later. Audio Studio remains advanced/post-core.

## Current Implementation Evidence Boundary

Source-side alignment completed on `New` includes:

- five-step First Setup with defer/resume facts and no persisted readiness truth;
- candidate-check -> commit device selection and no silent explicit-mic fallback;
- Meeting / Text / History / Settings shell and approved Settings hierarchy;
- standalone Text and canonical Text History/Saved persistence;
- one persistent local AI worker + one helper scheduler;
- caller-owned Meeting Realtime / Text Quality;
- translation input bounds, EOS completion checks, and explicit English TTS voice selection;
- application-Meeting-only finalized utterance production and one serialized outbound consumer;
- normal Meeting Start/Stop/Live wiring through canonical backend authority;
- Meeting Pause/Resume with retained `session_id`, invalidated old generation, fresh-generation Resume, and rollback-to-Paused;
- read-only Meeting Live activity presentation derived from canonical outbound status without transcript-body fabrication or a second lifecycle store.

Still incomplete or unproved:

- canonical bounded committed Meeting turn/transcript source and chronological Live transcript;
- actual frontend/Tauri invocation and rendered Start/Pause/Resume/Stop/activity behavior;
- global/cross-view Meeting strip and close-live handling;
- microphone/VAD quality and exactly-once/Stop/Pause race behavior;
- actual model EOS behavior/translation quality and English TTS voice/audio quality;
- incoming Meeting Sound, self-output suppression, turn coordination, and bounded recovery;
- Meeting History committed-turn handoff;
- approved tone/context inference, Text Copy/direct Save;
- scheduler contention suitability for realtime Meeting;
- reproducible Python lock/model revision/checksum acquisition;
- model quality/latency/RAM/VRAM proof;
- Windows microphone-permission deep-link and Meeting route proof;
- clean installer/runtime asset reconciliation;
- actual validator/Ruff/pytest/typecheck/build/model/device/Windows acceptance.

Source presence does not prove target-PC readiness. Do not claim real capture/VAD,
ASR/translation/TTS quality, Meeting Microphone delivery, incoming audio, latency,
scheduler timing, CUDA behavior, rendered UI quality, locked dependency
reproducibility, installed persistence, or installer success without required local
evidence.

## Canonical Owners

- `AGENTS.md` — working/evidence rules.
- `CONTEXT.md` — compact stable project context.
- `docs/foundation/01-product-overview.md` — product overview/scope hierarchy.
- `docs/foundation/02-product-requirements.md` — detailed requirements.
- `docs/knowledge/decision-log.md` — durable reasoning.
- `docs/knowledge/next-action.md` — single continuation point.
- `docs/knowledge/source-ownership.md` — semantic source ownership map.

The next task owner is `docs/knowledge/next-action.md`.
