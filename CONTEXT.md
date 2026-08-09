# TranslateIT Workspace Context

Updated: 2026-08-09  
Working branch: `New`  
Recovery baseline: `V1-Advance` at `6fd3485d6b22b9e3f44abc640241532aea61c3c7`

This file stores compact durable project context only. Detailed product requirements
belong in `docs/foundation/02-product-requirements.md`; active task state belongs in
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

**Document Translation is removed from the current product scope.** Do not develop
or preserve a Documents workspace/parser/export/job/history subsystem merely from
inherited policy/source.

## Product Navigation

Normal top-level navigation converges on:

```text
Meeting
Text
History
Settings
```

`Saved` remains distinct durable ownership but is accessed through:

```text
History
├─ Recent
└─ Saved
```

Normal Settings converges on:

```text
Meeting
History & Privacy
Advanced
```

`General`, `Translation`, `Documents`, and top-level `Saved` are not normal current
product destinations.

## Initial Product Boundary

- Initial supported platform: **Windows**.
- Core runtime: **local-first and offline-capable after required assets are
  installed**.
- Initial languages: **Indonesian and English**.
- Core outbound: Indonesian speech -> English voice.
- Core inbound assistance: English speech -> Indonesian text.
- Text: Indonesian <-> English.
- English speech -> Indonesian TTS is not initial scope.
- Additional languages are future scope.
- Cloud assistance may be added later only explicitly; core behavior never silently
  depends on it.

## First Use And Daily Meeting Use

First use is guided setup for physical microphone, Meeting Sound, TranslateIT
Meeting Microphone, and local translation readiness. Normal users never manually
operate Python/helper/worker/model setup.

Returning launch goes directly to Meeting and runs a quick product-level preflight.
Preferred primary action is `Start Translation`.

Meeting `Ready` is based on the required outbound path. Incoming English ->
Indonesian text is optional/degradable: healthy outbound may start when incoming is
unavailable.

Start is transactional: `Live` is committed only after final required outbound
validation/opening. Duplicate Start must not create duplicate sessions.

## Voice And Realtime Conversation

- Primary voice interaction: **Session Listening**.
- Secondary interaction: **Push to Talk**, default `Ctrl+Space`.
- Segmentation uses natural/adaptive speech boundaries; inherited fixed `700 ms` /
  `12 s` values are not product constants.
- Partial outbound ASR is preview-only and never meeting output.
- Final/stable utterance is the outbound translation/TTS commit boundary.
- Capture continues while earlier TTS is processing/speaking.
- Own TTS outputs are serialized.
- Session/generation/utterance identity prevents stale asynchronous work from
  re-entering current state.
- Application-side Meeting playback is at-most-once by default; uncertain playback
  is not blindly replayed.
- Outbound backlog is bounded and surfaced before stale voice becomes misleading.
- Pause stops outbound voice/pending outbound work while incoming may continue.
- Resume starts fresh generation authority.

Incoming is a separate Meeting Sound lane:

```text
Meeting Sound
-> English ASR
-> Indonesian text
```

Incoming may show transient partial subtitles, must suppress TranslateIT's own TTS,
must not invent participant identity, and degrades before core outbound under
resource pressure.

Turn coordination is conversation-aware: ready TTS may briefly wait for a natural
gap while incoming speech is active. Waiting is bounded; when no useful gap appears,
user intent such as `Speak Now` / `Cancel` controls interruption rather than an
automatic indefinite wait.

## Translation Behavior

- Translation is contextual and meaning-preserving, not word-for-word.
- Priority: intended meaning -> factual/entity fidelity -> natural target grammar ->
  appropriate tone -> literal wording when useful.
- Tone modes: `Auto`, `Formal`, `Casual`; `Auto` default.
- Names, numbers, dates, units, URLs, code identifiers, versions, acronyms, and
  technical facts remain accurate.
- Recent committed Meeting context is bounded, local, and session-scoped.
- Persistent History/Saved never automatically become model context.

## Runtime Modes, Reliability And Recovery

- User-facing modes: `Realtime` and `Quality`.
- Meeting default: `Realtime`.
- Text default: `Quality`.
- CUDA preferred when validated; NVIDIA is not mandatory.
- CPU fallback mandatory; insufficient Realtime performance reports Degraded.
- No silent cloud fallback.
- Meeting has resource priority; incoming degrades before core outbound.
- Recovery is bounded and owned by one session/recovery authority.
- Explicit newer user action overrides stale automatic recovery.
- Missing Meeting Microphone pauses/blocks outbound; old queues are never dumped on
  recovery.
- Minimize/hide does not end a healthy Meeting; loss of user control must not leave
  uncontrolled invisible output.
- Sleep/hibernate interrupts live translation and does not auto-resume voice.
- Long sessions keep memory, queues, context, and temporary artifacts bounded.

Official outbound latency metric:

```text
detected utterance end
-> first translated audio begins playing
```

Numeric release threshold is benchmark-derived.

## Stop And History Finalization

`Stop Translation` is a direct safety action. Once accepted, old-session work loses
authority to create new Meeting Microphone output. Current/pending output and
captures stop, committed conversation follows the History policy, temporary state
is cleaned, then the session becomes Ended.

Failed Start that never reached Live, and a normally stopped live session with zero
meaningful committed turns, do not create useless History entries.

## Standalone Text

Text is explicit, not every-keystroke translation:

```text
Type / paste
-> ID <-> EN
-> Auto/Formal/Casual
-> Quality default
-> Translate
-> review/edit
-> Copy or Save
```

Older request results cannot overwrite newer user intent. Editing source after a
result marks the result outdated. Large input is never silently truncated; if it
exceeds the supported Text boundary, report that clearly and ask the user to
shorten/split it rather than redirecting to Documents.

Text remains independent of Meeting audio readiness and Meeting context.

## History, Saved, Privacy And Storage

- History: automatic when enabled, on by default, local-only, user-disableable.
- History contains Meeting and Text only.
- Saved: explicit durable user work, independent from History lifetime.
- Clear/delete History never deletes Saved; removing Saved never deletes History.
- History search is local retrieval only, never model context.
- Turning History off affects new/current retention but does not delete already
  completed History.
- Raw microphone/incoming audio and TTS audio are temporary by default.
- Diagnostic logs contain minimal/redacted operational data and no conversation
  bodies by default.

Storage ownership:

```text
UserData/CacheData/    -> disposable runtime/session data
UserData/LogData/      -> minimal/redacted operational diagnostics
UserData/SavedProject/ -> persistent user-visible/user-approved data
```

## Settings Boundary

Meeting Settings owns Session Listening/PTT preference, physical microphone,
Meeting Sound, TranslateIT Meeting Microphone setup/check, and scoped recovery.
New device selections are verified before replacing a previous working preference.

History & Privacy owns History on/off, local storage information, Saved information,
and Clear History.

Advanced owns setup health and Developer Diagnostics. Normal users do not operate
Python/helper/worker lifecycle, model/provider names, CUDA mode, VAD thresholds,
queue sizes, retry counts, model paths, or raw logs.

Persist preferences; revalidate runtime readiness on launch instead of persisting
`ready=true` as permanent truth.

## Audio Studio

Audio Studio remains **advanced/post-core** and is not an initial core-release
blocker. It may create an authorized local custom English outbound voice profile.
Default local English TTS remains available independently.

## Installer And Distribution

- Windows internal/controlled distribution first.
- One user-facing installer/setup experience.
- Installed builds must not require manual Python, `pip`, environment variables,
  developer scripts, or manual core-model placement.
- Clean supported-Windows proof is required for installer readiness.
- System Python may remain a development fallback only.
- Auto-update deferred; code signing reconsidered before broad/public distribution.

## Current Architecture Baseline

```text
Rust/Tauri desktop shell
+
Python helper runtime
```

Current source/data roots:

```text
Desktop application -> EngineData/Frontend/RustApp
Internal helper -> EngineData/Backend/LocalWorker/WorkerRuntime
Runtime contracts -> EngineData/Backend/RuntimeContracts
Runtime assets -> EngineData/Backend/RuntimeAssets
Runtime/user data -> UserData
Historical/reference evidence -> DevelopingData
```

`EngineData` is canonical product implementation. `UserData` is runtime/user data,
not source authority. `DevelopingData` is historical/reference evidence and outside
normal production/runtime dependency and discovery contracts.

## Current Implementation Evidence Boundary

The current `New` frontend/source still predates parts of the newly approved product
flow, including old Documents/top-level Saved/navigation/settings surfaces. Source
presence does not prove target-PC readiness.

Do not claim live success without appropriate evidence for microphone capture,
ASR/translation/TTS quality, self-output suppression, turn coordination, CUDA,
Meeting Microphone delivery, latency, History/Saved durability, Audio Studio, or
self-contained installer behavior.

## Canonical Owners

- `AGENTS.md` — working/evidence rules.
- `CONTEXT.md` — compact stable project context.
- `docs/foundation/01-product-overview.md` — product overview/scope hierarchy.
- `docs/foundation/02-product-requirements.md` — detailed approved requirements.
- `docs/knowledge/decision-log.md` — durable reasoning.
- `docs/knowledge/next-action.md` — current continuation point.
- `docs/knowledge/source-ownership.md` — requirement-to-source ownership map.

The next task owner is `docs/knowledge/next-action.md`.
