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

Core conceptual surfaces remain:

```text
First Setup Wizard
├─ Welcome
├─ Microphone
├─ Meeting Sound
├─ Meeting Microphone
└─ Verify / Ready

Normal App
├─ Meeting
├─ Text
├─ History Collection
├─ History Detail
├─ Settings
└─ Diagnostics (nested under Advanced)
```

Runtime lifecycle conditions are states of these workspaces, not separate products.
Global Meeting indicators/alerts and dialogs are shell elements rather than pages.

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

Current source owns this through a focused first-use gate before the normal shell.
Only setup-flow facts are persisted:

```text
meeting_setup_state      -> new | deferred | completed
meeting_setup_checkpoint -> 1..5
```

These facts never represent runtime readiness. `Ready` is revalidated from current
runtime/device evidence. `Set up later` persists defer intent without marking
Meeting Ready.

Physical audio preferences use the existing `RuntimeSettings.audio` owner:

```text
input_device_id  -> null means follow Windows Default; otherwise explicit microphone
output_device_id -> null means follow Windows Default; otherwise explicit Meeting sound
```

New candidate preferences are checked before replacing the previous persisted
preference. A failed candidate check or settings save keeps the previous preference.
An explicit pinned microphone must not silently switch to another microphone if it
disappears; Windows Default remains the intentional follow-default mode.

Meeting Sound candidate checking establishes only native output endpoint/config
availability. It does **not** imply the incoming Meeting Sound capture/translation
lane is implemented or Ready.

## Meeting Readiness And Live Conversation Policy

Returning launch opens Meeting and performs product-level readiness checks. The
primary action is `Start Translation`.

Meeting `Ready` is based on required outbound safety. Incoming English -> Indonesian
text is optional/degradable: healthy outbound may start while incoming is
unavailable.

Start is transactional: `Live` is committed only after required outbound resources
are safely validated/opened. Duplicate Start must not create duplicate sessions.

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
- Pause stops new/pending outbound while incoming may continue;
- Resume creates fresh generation authority;
- Stop revokes old-session authority before cleanup/finalization;
- minimize does not end a healthy Meeting;
- sleep/hibernate interrupts live translation and does not auto-resume voice.

Incoming is a separate lane:

```text
Meeting Sound
-> English ASR
-> Indonesian text
```

It must suppress TranslateIT's own TTS, avoid invented participant identity, and
degrade before core outbound under resource pressure. Turn coordination may wait
briefly for a natural gap, then expose user intent such as `Speak Now` / `Cancel`.

## Translation Behavior

- meaning-preserving/contextual, not word-for-word;
- priority: intended meaning -> factual/entity fidelity -> natural target grammar ->
  appropriate tone;
- Tone: Auto / Formal / Casual; Auto default;
- names, numbers, dates, units, URLs, identifiers, versions, acronyms, and facts stay
  accurate;
- recent committed Meeting context is bounded/local/session-scoped;
- persistent History/Saved never automatically becomes model context.

User-facing execution modes:

```text
Meeting outbound -> Realtime
Standalone Text  -> Quality
```

Current source owns these modes at the caller boundary. `RuntimeSettings.runtime_profile`
remains compatibility-only and must not become a shared engine-mode authority again.
A requested mode must not silently retry the other mode merely to obtain output.

CUDA is preferred when validated but not mandatory. CPU fallback is required; an
insufficient fallback reports Degraded. No silent cloud fallback.

Official outbound latency metric:

```text
detected utterance end
-> first translated audio begins playing
```

Numeric release thresholds are benchmark-derived, not declarative readiness proof.

## Standalone Text

Text is explicit rather than every-keystroke translation:

```text
Type / paste
-> ID <-> EN
-> tone/mode
-> Translate
-> review/edit
-> Copy or Save
```

Older results cannot overwrite newer intent. Editing source after a result marks the
result outdated. Large input is never silently truncated or redirected to Documents.
Text remains independent of Meeting audio readiness/context.

Current active source uses familiar source/target panes, explicit Translate,
contextual persisted ID/EN Swap, editable target, stale/error states, and explicitly
requests the Quality translation capability. Active file-attachment translation is
removed.

The canonical worker tokenizes translation input without truncation and rejects input
whose actual model/tokenizer limit cannot be safely established or is exceeded.
Generated translation is promoted only when end-of-sequence completion can be
verified; missing/unverifiable completion or non-EOS termination is rejected instead
of being exposed as successful Text/TTS output.

Outbound English TTS also requires an explicitly identified English-capable voice.
Piper selection requires matching voice metadata with an English language code;
Windows SAPI selection requires an English culture and explicitly selects the chosen
voice rather than relying on the Windows default.

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

Successful Text translations write Recent only when History is ON. Current History
UI supports Recent/Saved, local search/filter, Text detail, independent Save, Remove
from Saved, History On/Off, and Clear Recent. Legacy `session_chat.rs` and
`session_store.rs` are not canonical product History. Meeting History waits for the
canonical Meeting lifecycle.

## Settings Boundary

Meeting Settings owns Session Listening/PTT preference, physical microphone,
Meeting Sound, TranslateIT Meeting Microphone setup/check, and scoped recovery.
First Setup and Meeting Settings share the same audio candidate-check/commit path.

History & Privacy owns History On/Off, local storage/Saved information, and Clear
History.

Advanced owns setup health and Developer Diagnostics. Normal users do not operate
Python/helper/worker lifecycle, provider/model names, CUDA mode, VAD thresholds,
queue sizes, model paths, or raw logs.

Persist preferences; revalidate readiness instead of persisting permanent
`ready=true` truth.

## Canonical Local AI Runtime

Current source has been consolidated toward one AI execution architecture:

```text
Rust/Tauri product boundary
-> ONE helper scheduler / process bridge
-> ONE persistent realtime_local_worker.py
   ├─ ASR
   ├─ Translation
   └─ TTS
```

Standalone Text and Meeting outbound share this process but own their semantic modes
separately. Waiting scheduler priority is:

```text
Meeting > Text > Diagnostics / preload
```

This priority is non-preemptive for a Text inference already in flight. Do not call
it realtime-optimal until local contention/latency proof exists.

Meeting work uses application `session_id + generation` authority. A stale generation
is rejected before worker execution and again before result promotion. Stop revokes
Meeting authority before cleanup; a matching in-flight Meeting inference may require
hard-cancelling the persistent worker process. Actual cancellation timing remains
local proof.

Static model installation evidence, current worker capability availability, request
inference success, model quality, and Meeting Start safety are distinct facts and
must not be collapsed into one `Ready` boolean.

## Finalized Meeting Outbound Source

The outbound capture boundary is source-separated into rolling and final speech:

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

`ready_for_target_asr_frame` on the rolling buffer is **not** a final utterance signal
and must not be promoted into Meeting output.

Only the application Meeting capture owner activates finalized-output production.
Capture-only/developer runtime owners keep only their rolling diagnostic behavior.

The finalizer does not run AI. One serialized Meeting consumer takes each queued
final once and calls the existing generation-aware AI/output boundary. Temporary
finalized source WAVs are removed after the output attempt.

Current VAD/profile values, the bounded final queue, and the long-utterance safety
ceiling are implementation safety/tuning mechanics, not production-proven timing
policy. They require later microphone/VAD runtime proof. Safety overflow/backlog is
fail-closed rather than creating a fake partial "final" utterance.

Backend Meeting Start has source-connected finalized speech/outbound runtime and
keeps all other required preflight blockers. Stop remains authority-first and clears
capture/finalized/helper/consumer state in that order.

Normal product frontend now reads the canonical backend Meeting session directly
through `get_meeting_session_status`, and its primary action calls
`start_meeting_translation` / `stop_meeting_translation`. The product facade maps the
backend application owner to Ready/Starting/Live/Stopping/conflict states; no second
frontend Meeting session authority was added. Navigation remains presentation-only,
and Mic Test is blocked while runtime Meeting resources are owned.

## Python Project / Development Tooling

Canonical WorkerRuntime Python dependency/tooling owner:

```text
EngineData/Backend/LocalWorker/WorkerRuntime/pyproject.toml
```

It owns the current runtime dependencies, optional guarded virtual-audio-route extra,
Ruff policy, and pytest development dependency/configuration.

Retired duplicate/side-channel owners include:

```text
requirements-realtime.txt
requirements-virtual-audio-route.txt
realtime_stack_manifest.json
setup_pytorch_cuda.ps1
setup_ctranslate2_translation_model.py
```

`uv` is the preferred developer dependency-resolution/environment tool, not an
end-user product requirement. `uv.lock` is not yet committed because no verified
local resolution has been performed; never fabricate a lockfile or resolved pins.

Ruff is the single Python lint/format policy. pytest is the deterministic Python
correctness baseline. Their configuration exists, but execution remains local proof.
`py-spy` is a local operator profiler for the actual persistent worker process and is
not a project/runtime dependency.

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
provide one user-facing setup and must not require manual Python/pip/model/uv
operation. Clean supported-Windows proof is required later. Auto-update is deferred;
code signing is reconsidered before broad/public release.

Audio Studio remains advanced/post-core and is not an initial core blocker.

## Current Implementation Evidence Boundary

Source-side alignment completed on `New` includes:

- focused five-step First Setup with explicit defer/resume facts and no persisted
  readiness truth;
- shared source-side candidate-check -> commit selection for Your microphone and
  Meeting Sound in First Setup and Meeting Settings;
- configured microphone readiness checks and no silent default-microphone fallback
  for an unavailable explicit microphone;
- top-level Meeting / Text / History / Settings shell and approved Settings hierarchy;
- familiar standalone Text workspace and canonical History/Saved persistence;
- one persistent local AI worker execution path with fake/manual/alternate translation
  paths retired;
- scoped capability/readiness truth rather than stale previous-machine manifests;
- caller-owned Meeting Realtime / Text Quality mode behavior;
- one helper scheduler/generation-aware cancellation source contract;
- translation input rejection instead of silent tokenizer truncation;
- translation output rejection when normal EOS completion cannot be verified;
- explicit English-capable Piper/SAPI voice selection before outbound synthesis;
- one WorkerRuntime `pyproject.toml` dependency/tooling owner with Ruff/pytest proof
  baseline and privacy-bounded persistent-worker smoke source;
- application-Meeting-only finalized utterance production with adaptive VAD silence,
  generation/utterance identity, one-shot queue ownership, unique temporary WAVs, and
  one serialized consumer into the canonical outbound AI/output boundary;
- normal Meeting frontend Start/Stop/Live-state wiring through the canonical backend
  application session, without a parallel frontend lifecycle store.

Still incomplete or unproved:

- actual canonical Meeting frontend/Tauri invocation and rendered transition behavior;
- Pause/Resume lifecycle with fresh-generation Resume semantics;
- global/cross-view Meeting strip, full Live transcript/activity presentation, and
  close-live handling;
- actual microphone capture/VAD boundary quality and exactly-once/Stop race behavior;
- actual MarianMT/NLLB EOS behavior and translation quality on target runtime;
- actual English Piper/SAPI voice availability, synthesis success, and audio quality;
- incoming Meeting Sound lane, self-output suppression, turn coordination, and bounded
  recovery;
- Meeting History after canonical lifecycle is active;
- approved tone/context inference, Text Copy/direct Save;
- scheduler contention/preemption suitability for realtime Meeting;
- reproducible Python lock/model revision/checksum acquisition;
- model quality/latency/RAM/VRAM proof;
- Windows microphone-permission deep-link;
- clean installer/runtime asset reconciliation;
- actual Ruff/pytest/typecheck/build/model/device/Windows acceptance.

Source presence does not prove target-PC readiness. Microphone/output endpoint
selection and config probes are **not** live Windows/device proof. Do not claim real
capture/VAD quality, ASR/translation/TTS quality, Meeting Microphone delivery,
incoming audio, self-output suppression, latency, scheduler timing, CUDA behavior,
rendered UI quality, locked dependency reproducibility, installed persistence, or
installer success without the required local evidence.

## Canonical Owners

- `AGENTS.md` — working/evidence rules.
- `CONTEXT.md` — compact stable project context.
- `docs/foundation/01-product-overview.md` — product overview/scope hierarchy.
- `docs/foundation/02-product-requirements.md` — detailed requirements.
- `docs/knowledge/decision-log.md` — durable reasoning.
- `docs/knowledge/next-action.md` — single continuation point.
- `docs/knowledge/source-ownership.md` — semantic source ownership map.

The next task owner is `docs/knowledge/next-action.md`.
