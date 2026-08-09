# TranslateIT — Product Overview

**Status:** Active Policy  
**Updated:** 2026-08-09

## Purpose

TranslateIT is a Windows desktop application whose primary purpose is real-time
local voice translation for online meetings. Internal ASR, translation, TTS,
helper-process, acceleration, and audio-routing details stay behind a simple
product workflow.

## Product Hierarchy

### Primary — Meeting Translation

```text
Outbound
Indonesian speech
-> Indonesian transcript
-> English translation
-> English TTS
-> TranslateIT Meeting Microphone
-> meeting application

Inbound assistance
English meeting speech
-> English transcript
-> Indonesian translated text
-> local user
```

### Secondary — Text Translation

Standalone Indonesian <-> English text translation remains independently usable
without Meeting audio readiness.

### Advanced / Post-Core — Audio Studio

Audio Studio creates/manages an authorized local custom English voice profile for
outbound TTS. It is not an initial core-release blocker.

### Removed — Document Translation

First-class document translation is not part of the current product scope. Do not
build or preserve a Documents workspace, PDF/DOCX/TXT/Markdown parser/export
workflow, document jobs, or document-specific History/Saved capability.

## Initial Boundary

```text
Platform -> Windows
Runtime -> local-first; offline-capable after required assets are installed
Languages -> Indonesian + English
Meeting outbound -> Indonesian speech -> English voice
Meeting inbound -> English speech -> Indonesian text
Secondary utility -> Indonesian <-> English text
```

Not current/initial scope:

- document translation;
- English speech -> Indonesian TTS;
- additional language pairs;
- mandatory/silent cloud services.

## First Use And Daily Use

First use is a guided product setup for physical microphone, Meeting Sound,
TranslateIT Meeting Microphone, and local translation readiness. Normal users do
not manually install/start Python, workers, models, or audio plumbing.

Returning use opens directly to Meeting and performs a quick product-level
preflight. Preferred primary action is `Start Translation`, not wording that
implies TranslateIT creates or joins the external meeting.

Meeting readiness is based on the required outbound path. Incoming English ->
Indonesian text is optional/degradable: outbound may remain usable when incoming is
unavailable.

## Live Meeting Behavior

Primary interaction is **Session Listening**; Push to Talk (`Ctrl+Space`) is the
secondary mode.

Outbound rules:

- speech segmentation is natural/adaptive rather than fixed inherited timing;
- partial ASR may be previewed but never becomes meeting output;
- final/stable utterance is the translation/TTS commit boundary;
- capture continues while earlier translation/TTS is processing or speaking;
- own TTS outputs are serialized;
- session/generation/utterance identity prevents stale work from re-entering;
- meeting delivery is at-most-once by default; uncertain playback is not blindly
  replayed;
- output status describes what TranslateIT can prove, such as `Output complete`,
  rather than claiming a remote participant heard it;
- backlog is bounded and surfaced before stale speech becomes useless;
- Pause stops outbound translated voice/pending outbound work while incoming may
  continue; Resume starts fresh generation authority.

Incoming rules:

- incoming capture is a separate lane from the physical microphone;
- initial output is Indonesian text only;
- partial subtitles may update live but remain transient;
- TranslateIT's own English TTS must not appear as incoming speech;
- participant identity is not invented when only mixed/device-level audio exists;
- incoming can be turned off independently and degrades before core outbound under
  resource pressure.

Turn coordination is conversation-aware. Ready outbound TTS may briefly wait for a
natural gap while incoming speech is active. If no useful gap appears within a
bounded period, expose an explicit user choice such as `Speak Now` or `Cancel`
rather than waiting indefinitely or automatically deciding meeting etiquette.

## Reliability And Stop

Failure is classified as recoverable, degradable, or blocking/unsafe. Recovery is
bounded and has one session/recovery owner. Explicit user action overrides stale
automatic recovery.

Important reliability rules:

- losing the managed Meeting Microphone pauses outbound;
- old queues are never dumped after route recovery;
- stale generation callbacks are discarded;
- local failure never silently routes to cloud;
- minimizing the window does not end a healthy live session;
- loss of user control must not leave uncontrolled invisible meeting output;
- sleep/hibernate interrupts a live session and does not auto-resume voice;
- memory, queues, context, and temporary audio remain bounded in long sessions.

`Stop Translation` is a direct safety action. Once accepted, old-session work loses
authority to create new Meeting Microphone output. Current voice/pending work is
interrupted/invalidated, captures stop, committed conversation is finalized by the
History policy, temporary resources are cleaned, then the session becomes Ended.

## Global Navigation And Cross-Feature Behavior

A live Meeting is application-level state, not state owned by the Meeting page.
Navigation between `Meeting`, `Text`, `History`, and `Settings` must not stop or
recreate a healthy active Meeting. Returning to Meeting reconnects the view to the
same authoritative active session and conversation state.

While Meeting is active:

- a compact global live indicator remains visible outside the Meeting page;
- unsafe outbound failures become global attention states, while incoming-only
  degradation remains scoped/subtle;
- a contextual global `Stop Voice` may appear while translated TTS is actively
  speaking, but normal Pause/turn controls remain on the Meeting page;
- Text, History, and Settings preserve reasonable in-memory view state across
  navigation without becoming Meeting lifecycle owners;
- Meeting processing has priority over Text/History work under resource pressure;
- PTT works across product views only for an already-live Meeting and never starts a
  Meeting by itself;
- minimize keeps the active Meeting running;
- closing the application while Meeting is Live requires explicit `Stop & Close`;
- a critical background/minimized interruption should attract user attention
  without silently stealing foreground focus.

Initial product allows only one active Meeting session and should prevent parallel
independent TranslateIT desktop instances from competing for the same Meeting audio
and user-data resources.

Capability health remains scoped. A Meeting-route/device problem does not make Text
or History unavailable when their own dependencies remain healthy; a shared local
translation-runtime failure may affect both Meeting and Text while History/Settings
remain usable.

## Translation Quality And Modes

Priority:

```text
intended meaning
-> factual/entity fidelity
-> natural target-language grammar
-> appropriate tone
-> literal wording when useful
```

Tone modes: `Auto`, `Formal`, `Casual`; default `Auto`.

Modes:

```text
Meeting -> Realtime
Text -> Quality
```

Names, numbers, dates, URLs, versions, acronyms, and technical identifiers must
remain accurate. Recent committed session context may help translation, but
persistent History is never automatic model context.

CUDA is preferred when validated but not mandatory. CPU fallback is required. If
CPU cannot satisfy benchmark-derived Realtime expectations, report a truthful
degraded/not-Realtime-ready state.

## Text Translation

Text follows a bounded explicit workflow:

```text
Type / paste
-> choose Indonesian <-> English
-> choose tone if needed
-> Translate
-> review/edit target
-> Copy or Save
```

Text does not translate every keystroke. Older async results cannot overwrite newer
user intent. Editing source after a result marks that result outdated. Very large
input is never silently truncated; the app reports the interactive limit clearly
rather than redirecting to a removed Documents feature.

## History, Saved And Privacy

History contains Meeting and Text activity only.

```text
History
├─ Recent
│  ├─ Meeting
│  └─ Text
└─ Saved
   ├─ Meeting
   └─ Text
```

History is automatic when enabled and on by default. Saved is explicit durable user
work with independent lifetime. Clearing History does not delete Saved; removing
Saved does not delete History. Search is local retrieval only and never automatic
model context.

Raw microphone audio, incoming meeting audio, and generated TTS are temporary by
default and are not normal History/Saved content. Diagnostic logs use minimal,
redacted operational data rather than conversation bodies by default.

## Navigation And Settings

Normal top-level navigation converges on:

```text
Meeting
Text
History
Settings
```

`Saved` is accessed through `History -> Saved`, not as top-level navigation.
`Documents` is absent.

Normal Settings converges on:

```text
Meeting
History & Privacy
Advanced
```

Meeting Settings owns persistent speaking-mode and device preferences plus managed
Meeting Microphone setup/check. Device choices are verified before they replace a
working preference. History & Privacy owns future History retention and Clear
History. Advanced owns setup health and Developer Diagnostics.

Normal users do not operate Python, helper/worker lifecycle, provider/model names,
CUDA mode, VAD thresholds, queue sizes, retry counts, model paths, or raw logs as
normal settings. Persist user preferences; recalculate runtime readiness on launch.

## Audio Studio

Audio Studio remains advanced/post-core. Voice authorization is required. Default
local English TTS remains available independently of custom voice profiles.

## Installer And Distribution

Initial distribution is Windows internal/controlled first. Normal installed builds
must not require manual Python, `pip`, environment variables, developer scripts, or
manual core-model placement. Installer readiness requires clean supported-Windows
proof; package configuration alone is insufficient.

## Architecture Baseline

```text
Rust/Tauri desktop shell
+
Python helper runtime
```

One desktop application owns the UX. Python is internal runtime support, not a
second product shell. Parallel V2/V3/V4 engines or launchers require a new explicit
architecture decision.

## Evidence Boundary

This file defines desired product behavior, not current implementation readiness.
Runtime/device/model/audio/rendered/release claims require the proof level defined
by root `AGENTS.md`.

## Related

- `AGENTS.md`
- `CONTEXT.md`
- `docs/foundation/02-product-requirements.md`
- `docs/knowledge/next-action.md`
