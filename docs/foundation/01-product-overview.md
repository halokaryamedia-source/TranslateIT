# TranslateIT — Product Overview

**Status:** Active Policy  
**Updated:** 2026-08-10

## Purpose

TranslateIT is a Windows desktop application whose primary purpose is **simple,
reliable Indonesian <-> English translation for online meetings**.

The product must prefer a translation that completes successfully over a larger
feature set, extra modes, stylistic controls, or speculative context behavior.
Internal ASR, translation, TTS, helper-process, acceleration, and audio-routing
details stay behind a small product workflow.

The interaction reference is the simplicity of modern meeting speech-translation
features: choose the language pair, start translation, speak normally, allow a small
completeness delay when needed, and stop when finished. TranslateIT does not need to
copy another product's implementation or supported languages.

## Core Product

### Meeting — Required Outbound

```text
Indonesian speech
-> final Indonesian transcript
-> English translation
-> English TTS
-> TranslateIT Meeting Microphone
-> meeting application
```

This is the **required core path**. If this path is healthy, optional features must not
prevent it from working.

### Meeting — Optional Incoming Assistance

```text
English meeting speech
-> final English transcript
-> Indonesian translated text
-> local user
```

Incoming is useful but optional. Incoming capture, suppression, ASR, or translation
failure must never block otherwise healthy outbound translation.

### Text

```text
Indonesian text <-> English text
```

Text remains a small standalone utility using the same canonical translation behavior
as Meeting where practical.

## Initial Product Boundary

```text
Platform        -> Windows
Languages       -> Indonesian + English only
Meeting control -> Start Translation / Stop Translation
Outbound        -> ID speech -> EN voice
Incoming        -> EN speech -> ID text, optional
Text            -> ID <-> EN
Runtime         -> local-first after required assets are installed
```

## Deliberately Removed From Initial Core

The following are not part of the initial product target because they increase
behavioral, UI, runtime, or proof complexity without being required for successful
translation:

- Pause / Resume;
- Push to Talk;
- Stop Voice;
- Speak Now / Cancel conversational delivery coordination;
- partial/evolving subtitles or partial translated voice;
- user-facing `Realtime` / `Quality` translation modes;
- user-facing `Auto / Formal / Casual` tone modes;
- conversation-context prompting or previous-turn model context;
- glossary/terminology memory as a separate subsystem;
- automatic History / Saved as an initial release dependency;
- Audio Studio / custom voice as an initial release dependency;
- additional language pairs;
- incoming Indonesian TTS;
- document translation;
- silent cloud fallback.

These items may be reconsidered only after the small core is proven usable on the
target Windows environment. Existing source for removed/deferred features is not proof
that the feature remains current product scope.

## Translation Engine Principle

The initial translation product should expose **one behavior**, not multiple model or
quality choices.

```text
current utterance
-> one canonical bidirectional ID <-> EN translation path
-> complete translation or explicit failure
```

The initial implementation should prefer one bidirectional local translation model/path
for both directions rather than maintaining separate user-visible Realtime/Quality
products. Exact model/provider remains replaceable until target-PC validation proves a
candidate suitable.

The current utterance is translated independently. Previous Meeting turns, History,
Saved data, or Text activity are not automatic model context.

Translation priorities remain small:

```text
1. preserve intended meaning
2. preserve names / numbers / technical facts
3. produce understandable natural target-language grammar
4. avoid silently returning incomplete output
```

A small delay after the user finishes speaking is acceptable when required to obtain a
complete stable utterance and complete translation. Instant partial output is not a
product requirement.

## Speech Boundary

Normal Meeting use is continuous Session Listening after explicit Start.

Only a finalized speech utterance may enter normal translation/TTS/transcript output.
Rolling audio and partial ASR may exist internally for implementation purposes but are
not normal product output.

The application may continue capturing the next utterance while the previous one is
being translated or spoken, but translated TTS output remains serialized so voices do
not overlap.

## Incoming Safety

Incoming Meeting Sound remains a separate optional lane from the physical microphone.

TranslateIT's own English TTS must not be presented as incoming speech. However,
**incoming protection must not block required outbound translation**. If safe incoming
capture/suppression cannot be maintained, the incoming lane becomes unavailable or is
temporarily ignored while outbound continues.

No participant identity is invented from mixed device-level audio.

## Runtime Simplicity

One desktop application, one canonical Meeting session owner, one helper/runtime path,
and one translation behavior remain the target.

Resource priority is intentionally simple:

```text
Meeting outbound
> Meeting incoming
> Text
> diagnostics / setup work
```

Queues are bounded. Old/stale work must be discarded rather than played or displayed
late as if it were current.

CUDA may accelerate the runtime when validated, but the UI does not expose model,
provider, CUDA, VAD, queue, or worker controls. CPU operation remains truthful: if it is
too slow for practical Meeting use, report that instead of pretending equivalent
performance.

## Stop And Close

`Stop Translation` is the only normal Meeting termination action.

```text
Stop
-> revoke current Meeting output authority
-> stop microphone / Meeting Sound capture
-> cancel/join pending Meeting work
-> clear transient conversation/audio state
-> session ended
```

Normal minimize does not stop a healthy Meeting. Closing the application while a
Meeting is active still requires the existing safe Stop-before-close behavior.

## Product Navigation

Initial normal navigation is reduced to:

```text
Meeting
Text
Settings
```

Meeting is the default workspace.

There is no initial top-level History/Saved workspace. Live Meeting transcript is
transient session state used for current comprehension only.

Settings is reduced to:

```text
Meeting
Advanced
```

Meeting settings own microphone, Meeting Sound, and managed Meeting Microphone setup.
Advanced contains developer diagnostics and setup evidence; it is not a normal runtime
control panel.

## Text Workflow

Text stays conventional:

```text
Type / paste
-> choose ID <-> EN direction
-> Translate
-> review result
-> Copy
```

There is no tone selector, mode selector, Meeting-context reuse, or automatic Save in
the initial core. Very large input is never silently truncated.

## Privacy / Storage

Normal core translation does not require persistent conversation storage.

```text
UserData/CacheData -> temporary runtime/audio artifacts
UserData/LogData   -> minimal/redacted diagnostics
```

Raw microphone audio, Meeting Sound audio, generated TTS, and live transcript bodies
are temporary by default for the initial core.

Persistent History/Saved remains post-core and must not be required for translation to
work.

## UI Direction

The UI target remains modern, familiar, and low-density.

Meeting Ready should answer only:

```text
Are the required devices ready?
What language pair is active?
Start Translation
```

Meeting Live should emphasize:

```text
Translation Live
chronological finalized transcript
simple current activity
Stop Translation
```

Do not surface internal translation modes, tone controls, context controls, queue
controls, model names, provider names, or engineering detail in normal use.

## Proof Standard

A feature is not considered core-ready because source exists. Initial product success
requires local Windows evidence for the small core:

- microphone capture;
- final ASR;
- ID -> EN translation;
- EN -> ID translation when incoming is enabled;
- English TTS;
- Meeting Microphone delivery;
- optional incoming Meeting Sound behavior;
- safe Stop/Close;
- acceptable latency and stability on the target machine.

Features outside this list must not delay proving the translator itself works.

## Related

- `AGENTS.md`
- `CONTEXT.md`
- `docs/foundation/02-product-requirements.md`
- `docs/knowledge/decision-log.md`
- `docs/knowledge/next-action.md`
- `docs/knowledge/source-ownership.md`
