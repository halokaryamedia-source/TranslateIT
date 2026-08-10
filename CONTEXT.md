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
simple setup/decision composition. Meeting Live is transcript-first, with activity and
session controls remaining in the same workspace. Global Meeting indicators/alerts/
dialogs are shell elements rather than pages.

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
Meeting Sound candidate checking proves endpoint/config availability only, not the
incoming translation lane.

## Meeting Lifecycle And Conversation Policy

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
- rolling/partial outbound ASR is preview-only;
- finalized stable utterance is the product output boundary;
- own TTS output is serialized and delivery is at-most-once by default;
- session/generation/utterance identity prevents stale work re-entry;
- backlog and live transcript memory are bounded;
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
degrade before core outbound under resource pressure. It is not source-implemented
as the normal Meeting incoming lane yet.

## Translation Behavior

- meaning-preserving/contextual, not word-for-word;
- priority: intended meaning -> factual/entity fidelity -> natural target grammar ->
  appropriate tone;
- Tone: Auto / Formal / Casual; Auto default;
- names, numbers, dates, units, URLs, identifiers, versions, acronyms, and facts stay
  accurate;
- recent committed Meeting context may later be bounded/local/session-scoped;
- persistent History/Saved never automatically becomes model context.

User-facing execution modes:

```text
Meeting outbound -> Realtime
Standalone Text  -> Quality
```

`RuntimeSettings.runtime_profile` remains compatibility-only and must not become a
shared engine-mode authority again. No silent Realtime <-> Quality retry and no silent
cloud fallback.

CUDA is preferred when validated but not mandatory. CPU fallback is required.
Official outbound latency begins at detected utterance end and ends when translated
audio first begins playing; release thresholds are benchmark-derived.

## Standalone Text

```text
Type / paste
-> ID <-> EN
-> Translate
-> review/edit
-> Copy or Save
```

Text translation is explicit rather than every-keystroke. Older results cannot
overwrite newer intent. Source edits mark old result outdated. Large input is never
silently truncated or redirected to Documents. Current source explicitly requests
Quality and requires verifiable EOS completion before successful translation output.

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

Text History/Saved is source-connected. Persistent Meeting History remains a later
finalization handoff from the canonical transient committed-turn source. Persistent
History does **not** own Live transcript state. Saved remains explicit/independent.

At Meeting finalization, current `history_enabled` is the policy owner for automatic
Recent retention: ON permits a Meeting Recent handoff; OFF must discard transient
conversation bodies. This finalization handoff is the next source slice and is not yet
implemented.

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

This priority is non-preemptive for Text inference already in flight.

Meeting work uses application `session_id + generation` authority. Stale generations
are rejected before worker execution and before result promotion. Pause invalidates
the current outbound generation while retaining the Meeting session; Resume establishes
a fresh generation for the same session. Actual cancellation/restart timing remains
local proof.

Static model installation, current worker capability, request inference success,
model quality, and Meeting Start safety remain distinct facts.

## Finalized Meeting Outbound Source

```text
application Meeting microphone capture
├─ rolling audio buffer -> preview / diagnostics only
└─ finalized utterance producer
   -> Realtime VAD + adaptive end silence
   -> session_id + generation + utterance_id
   -> bounded one-shot queue
   -> unique temporary WAV
   -> serialized Meeting consumer
      -> final Indonesian ASR
      -> verified Realtime English translation
      -> committed-turn transient source
      -> English TTS
      -> guarded Meeting Microphone route
```

Only the application Meeting capture owner activates finalized-output production.
The finalizer does not run AI. Temporary finalized source WAVs are removed after the
outbound attempt.

Pause revokes generation authority before matching route/capture/helper/consumer
cleanup while retaining the application session. Resume keeps the same session
identity, creates fresh generation authority, rechecks preflight, and transactionally
reopens capture/finalized consumption. Stop remains distinct full-session cleanup.

## Canonical Committed Meeting Turns

`commands/meeting_session.rs` now owns one bounded, memory-only committed-turn store
for the active application Meeting. No second frontend, worker, Diagnostics,
`runtime_state.rs`, or persistent-History conversation owner was introduced.

A turn is committed only after final Indonesian ASR text and verified-complete English
translation exist under the same still-authoritative generation.

```text
MeetingCommittedTurn
├─ session_id
├─ sequence                 # monotonic across Resume generations
├─ generation
├─ utterance_id              # generation-local
├─ lane = you
├─ source_text               # final Indonesian
├─ translated_text           # verified English
├─ delivery_state
├─ created_unix_ms
└─ updated_unix_ms
```

Dedupe identity is `(session_id, generation, utterance_id)`. Current delivery states
are `preparing_voice`, `speaking`, `output_complete`, `output_failed`, and
`interrupted`. Terminal states cannot be overwritten by stale callbacks.

Pause retains committed turns and interrupts non-terminal turns from the revoked
generation. Resume appends fresh-generation turns to the same session chronology.
Start rollback and full Stop clear the transient store. The snapshot explicitly
reports when the live bound has dropped earlier turns.

`output_complete` is a TranslateIT-side guarded output-completion claim, not proof
that a remote participant heard the audio.

## Normal Meeting Frontend And Live Transcript

Normal lifecycle truth remains:

```text
get_meeting_session_status
start_meeting_translation
pause_meeting_translation
resume_meeting_translation
stop_meeting_translation
```

Conversation bodies use a separate read-only projection:

```text
get_meeting_committed_turns
-> runtimeApi MeetingCommittedTurnsSnapshot
-> MeetingLiveActivityPresentation
```

`MeetingSessionStatus` remains lightweight and contains no conversation bodies.

The Meeting Live presentation still shows canonical activity states and now renders
chronological outbound `YOU` transcript turns. Indonesian final text has primary
visual weight; English verified translation is secondary; delivery status remains
visible. The frontend rebuilds the list from backend snapshots rather than accumulating
turns as its own store.

Before rendering body text, the presentation requires the committed-turn snapshot to
belong to the same `session_id` as the lifecycle snapshot. Snapshot mismatch during a
transition is presented as temporary refresh state rather than stale transcript.
Bounded transcript truncation is disclosed.

Conversation text is assigned with DOM `textContent`. Worker response JSON, legacy
pipeline transcript state, Diagnostics/logs, and rolling audio are not Live transcript
sources.

Incoming `INCOMING` turns are not fabricated because the incoming Meeting lane is not
implemented.

## Settings Boundary

Meeting Settings owns speaking mode, physical microphone, Meeting Sound, managed
Meeting Microphone setup/check, and scoped recovery. History & Privacy owns History
On/Off and Clear History. Advanced owns setup health and Developer Diagnostics.
Normal users do not operate Python/helper/model/CUDA/VAD/queue internals. Persist
preferences; revalidate readiness rather than persisting `ready=true` truth.

## Python Project / Development Tooling

Canonical Python dependency/tooling owner:

```text
EngineData/Backend/LocalWorker/WorkerRuntime/pyproject.toml
```

It owns runtime dependencies, optional guarded route extra, Ruff policy, and pytest
development configuration. `uv` is the preferred developer resolver/environment tool,
not an end-user requirement. `uv.lock` is not fabricated and awaits verified local
resolution. Ruff/pytest configuration exists but has not been executed in the current
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
supported-Windows proof remains later. Audio Studio remains advanced/post-core.

## Current Implementation Evidence Boundary

Source-side alignment completed on `New` includes:

- First Setup facts/device candidate-check boundaries and current navigation hierarchy;
- standalone Text + canonical Text History/Saved persistence;
- one persistent AI worker + one helper scheduler;
- caller-owned Meeting Realtime / Text Quality;
- translation bounds/EOS correctness and explicit English TTS voice selection;
- finalized Meeting utterance production and one serialized outbound consumer;
- canonical Meeting Start/Stop and navigation-independent application authority;
- Pause/Resume with retained `session_id`, invalidated old generation, fresh-generation
  Resume, and rollback-to-Paused;
- read-only Meeting Live activity from canonical Meeting status;
- bounded transient committed Meeting turn source in `meeting_session.rs`;
- separate registered/API `get_meeting_committed_turns` projection;
- chronological outbound `YOU` transcript rendering from backend snapshots without
  frontend accumulation or persistent History writes;
- static validator definitions for committed-turn ownership/non-owner boundaries.

Still incomplete or unproved:

- Meeting History finalization handoff from committed turns;
- actual Rust/TypeScript compilation and static-validator execution;
- actual Tauri invocation and rendered transcript behavior;
- global/cross-view Meeting strip and close-live handling;
- microphone/VAD quality and exactly-once/Stop/Pause race timing;
- actual model translation/TTS quality and Meeting Microphone delivery;
- incoming Meeting Sound, self-output suppression, turn coordination, and recovery;
- approved tone/context inference, Text Copy/direct Save;
- scheduler contention suitability for realtime Meeting;
- reproducible Python lock/model revision/checksum acquisition;
- model quality/latency/RAM/VRAM proof;
- Windows microphone-permission deep-link and route proof;
- clean installer/runtime asset reconciliation;
- actual Ruff/pytest/model/device/Windows acceptance.

Source presence does not prove target-PC readiness. Do not claim real capture/VAD,
ASR/translation/TTS quality, Meeting Microphone delivery, incoming audio, latency,
scheduler timing, CUDA behavior, rendered UI quality, installed persistence, or
installer success without required local evidence.

## Canonical Owners

- `AGENTS.md` — working/evidence rules.
- `CONTEXT.md` — compact stable project context.
- `docs/foundation/01-product-overview.md` — product overview/scope hierarchy.
- `docs/foundation/02-product-requirements.md` — detailed requirements.
- `docs/knowledge/decision-log.md` — durable reasoning.
- `docs/knowledge/next-action.md` — single continuation point.
- `docs/knowledge/source-ownership.md` — semantic source ownership map.

The next task owner is `docs/knowledge/next-action.md`.
