# TranslateIT — Product Overview

**Status:** Active Policy  
**Updated:** 2026-08-09

## Purpose

TranslateIT is a desktop translation application whose primary purpose is to help
a user communicate across a language barrier during an online meeting through
real-time voice translation.

The product should reduce the amount of manual switching between listening,
transcribing, translating, and speaking a translated response. The user should
interact with one application rather than understand internal ASR, translation,
TTS, audio-routing, acceleration, or provider implementation.

## Primary Use Case

```text
speech input
-> transcription
-> translation
-> translated voice output
-> online meeting use
```

Voice translation is a core product capability, not an optional legacy feature.

## Secondary Standalone Workflow

TranslateIT also provides text translation as an independently useful workflow.
Text translation must remain usable even when the voice pipeline is unavailable,
blocked, still being configured, or awaiting local runtime proof.

## Initial Product Boundary

```text
Platform
-> Windows is the initial supported and validated target

Core runtime
-> local-first
-> offline-capable after required runtime/model assets are installed
-> required cloud translation/speech APIs are not part of the core path

Initial languages
-> Indonesian
-> English

Text translation
-> Indonesian <-> English

Outbound meeting voice
-> Indonesian speech -> English translated voice

Inbound meeting assistance
-> English speech -> Indonesian translated text

Not required initially
-> English speech -> Indonesian translated voice
-> additional language pairs
```

Future platforms, optional cloud assistance, additional languages, or Indonesian
TTS require later explicit product decisions and must not expand the initial
product automatically.

## Voice Input Interaction Boundary

Normal meeting use follows **Session Listening**:

```text
User explicitly starts voice session
-> TranslateIT listens continuously while active
-> VAD/speech-boundary logic identifies utterances
-> utterances move into the translation pipeline
-> User explicitly stops voice session
```

TranslateIT must not begin persistent listening merely because the application is
open.

**Push to Talk** remains a secondary interaction with `Ctrl+Space` as the approved
default hotkey.

Speech segmentation is behavioral rather than a frozen timer contract:

- detect meaningful natural pauses;
- avoid cutting active words/speech unnecessarily;
- begin processing promptly after a valid utterance boundary;
- handle longer speech without losing content.

Numeric VAD/silence/chunk/segment values are implementation tuning. The inherited
`700 ms` silence and `12 s` maximum segment values are not permanent product
requirements.

## Latency And Runtime Mode Boundary

Official user-relevant voice latency is measured as:

```text
detected end of utterance
-> first translated audio begins playing
```

TranslateIT should feel responsive enough for natural online conversation, but the
numeric release threshold is benchmark-derived rather than inherited as a fixed
`<= 1 second` promise.

Supporting ASR, translation, TTS, and playback timing should remain measurable for
diagnosis.

User-facing runtime modes are:

```text
Realtime
Quality
```

Normal defaults are workflow-aware:

```text
Meeting voice -> Realtime
Standalone text -> Quality
```

The runtime may automatically choose a suitable local profile when the preferred
profile cannot serve a language direction/workflow. Normal users should not need
to select model/provider names. A manual `Realtime` / `Quality` override may
remain available in Settings.

## Acceleration And Provider Boundary

TranslateIT prefers **NVIDIA CUDA acceleration** when available and validated,
especially for the Realtime meeting workflow. An NVIDIA GPU is not an absolute
product requirement.

CPU fallback is mandatory:

```text
Standalone text on CPU
-> must remain supported when the local runtime is otherwise usable

Meeting voice on CPU
-> allowed when measured performance is usable
-> Degraded / not Realtime-ready when benchmark requirements are not met
```

The application must not silently send speech/text to a cloud service when local
GPU/CPU execution is slow or unavailable.

Current ASR, translation, and TTS models/providers are replaceable implementation
choices rather than product identity. A replacement is valid when it preserves the
approved local-first behavior and required supported-language, quality, latency,
and packaging characteristics.

Normal users should see product-level status such as `Ready`, `Degraded`, `Setup
Needed`, `GPU Accelerated`, or `CPU Mode`. Exact model IDs, provider names,
compute types, CUDA backend details, and fallback reasons belong in Developer
Diagnostics.

## Meeting Audio Routing Boundary

For the primary outbound workflow, the meeting should receive **translated English
voice only**:

```text
Physical microphone
-> TranslateIT capture / ASR
-> Indonesian -> English translation
-> English TTS
-> TranslateIT-managed meeting microphone/audio route
-> Zoom / Meet / Teams / other meeting app
```

The physical microphone remains available to TranslateIT for capture, but raw
Indonesian microphone audio is excluded from the meeting-output route by default.
A global Windows microphone mute is not required.

The normal product concept is a **TranslateIT meeting microphone** (or equivalent
managed Windows audio endpoint). The underlying virtual-audio driver/provider is a
replaceable implementation detail; a specific third-party brand and a custom
TranslateIT kernel/audio driver are not product requirements.

Original Indonesian voice and translated English TTS must not be mixed into the
meeting by default. Any future bilingual/pass-through mode requires an explicit
separate product decision.

Local translated-voice monitoring is:

```text
optional
-> off by default
-> user-adjustable volume
```

The inherited fixed `50%` monitoring level is not a product constant.

When the virtual meeting route is unavailable:

```text
Meeting Voice -> Setup Needed
Text translation -> remains available
Transcript/local translation -> remains available
Local TTS preview -> remains available when its provider is ready
```

TranslateIT must not silently substitute the physical microphone, speaker output,
or cloud routing. Initial integration uses the standard Windows microphone-device
model; meeting-app-specific plugins/APIs are not required initially.

## Translation Behavior Boundary

TranslateIT translates **meaning and communication intent**, not word-for-word
surface form.

Translation quality priority is:

```text
1. intended meaning
2. factual/entity fidelity
3. natural target-language grammar
4. appropriate tone
5. literal wording when useful
```

Names, numbers, dates, units, URLs, code identifiers, versions, acronyms, and
technical facts should remain accurate. Mixed Indonesian/English input and common
Indonesian conversational/slang expressions should be handled naturally, while
technical terms should remain untranslated when translating them would confuse
accepted meaning.

User-facing tone modes are:

```text
Auto
Formal
Casual
```

`Auto` is the default. It should preserve/infer source tone naturally. `Formal`
should make user-authored output professional, clear, and polite without changing
facts. `Casual` should make user-authored output conversational without inventing
slang or changing intent.

Outbound/user-authored translation may use all three tone modes. Inbound meeting
assistance should preserve the other participant's source tone through Auto
behavior by default rather than stylistically rewriting what they said.

TranslateIT may use a bounded amount of recent conversation context to resolve
pronouns, omitted subjects, repeated terminology, continuity, or tone. That
context is local and session-scoped by default, must not override the current
utterance, and must not introduce facts that were never spoken/written.

```text
Realtime
-> contextual and semantically correct
-> latency-aware context/inference strategy

Quality
-> deeper contextual/nuance processing allowed
-> higher latency acceptable
```

Prompt design, glossary mechanics, protected-term implementation, model context
window size, and model/provider strategy are implementation details rather than
normal-user product settings.

## History, Saved And Privacy Boundary

TranslateIT keeps **Local History on by default**, but persistence remains local
and user-controlled.

```text
History
-> automatic local record when enabled
-> searchable / individually deletable / clearable
-> can be disabled without disabling translation

Saved
-> explicit user action
-> intentionally preserved work/session
-> independent from automatic History
```

Clearing History must not delete explicitly Saved sessions.

Normal History may store the original/transcribed text, translated text, timestamp,
workflow, language direction, tone, and runtime mode. Raw microphone audio is not
part of normal History.

Active translation context is not History. It remains bounded and session-local;
persistent History must not be fed back into model context automatically. Restoring
prior context requires an explicit user action.

Audio retention defaults are conservative:

```text
Raw/source microphone audio -> temporary/disposable
Generated translated TTS -> temporary by default
Saved replay audio -> only through explicit save action
```

Diagnostic logs should store operational metadata and redacted diagnostics rather
than full conversation bodies. Full transcript/audio/content collection for
troubleshooting requires an explicit diagnostic workflow.

Core History/Saved behavior is local-only. Existing storage ownership remains:

```text
UserData/CacheData    -> temporary runtime/session data
UserData/LogData      -> diagnostics and validation evidence
UserData/SavedProject -> persistent user-visible/user-approved data
```

## Problem TranslateIT Solves

Cross-language online conversation normally forces the user to combine several
separate steps or tools:

- capture or understand spoken input;
- obtain a transcript;
- translate the meaning;
- produce a response the other participant can understand;
- manage audio/runtime state while the meeting is still happening.

TranslateIT aims to make those steps one coherent desktop experience while
keeping a direct text-translation path available when voice translation is not
ready or not needed.

## Product Goal

```text
User communication intent
↓
TranslateIT receives speech or text
↓
Language content is translated
↓
Translated text is visible to the user
↓
For the primary outbound workflow, translated English speech is produced
for meeting use
```

The experience should expose product actions and useful readiness information,
not require normal users to operate internal runtime components directly.

## Current Architecture Baseline

```text
Rust/Tauri desktop shell
+
Python helper runtime
```

Current source ownership starts from:

```text
Desktop application
-> EngineData/Frontend/RustApp

Internal helper runtime
-> EngineData/Backend/LocalWorker/WorkerRuntime

Runtime contracts
-> EngineData/Backend/RuntimeContracts
```

Rust/Tauri is the user-facing desktop application. Python is an internal helper
runtime and must not become a second competing product shell.

Old Rust-only/no-Python CUDA planning is stale implementation history where it
conflicts with this current single-engine direction.

## Current Implementation Posture

The current `New` frontend entrypoint instantiates `SimpleLauncherController`.
The visible application currently presents text translation as the immediately
usable workflow while voice remains setup-gated.

That UI state is a stabilization/implementation posture. It does **not** change
the approved product priority: real-time meeting voice translation remains
primary.

Current virtual-audio source can select existing virtual audio devices and contains
a guarded Python provider for routing TTS WAV output, but it explicitly does not
prove that audio reaches a real meeting input. Translation source also contains
context-window structures and limited deterministic fallback phrases, but it does
not yet prove general contextual/tone quality. Current persistence code also mixes
some History/Saved semantics and does not yet prove complete search/delete/clear
privacy behavior. Product policy above governs the required experience;
implementation alignment happens through normal Developing work after recovery.

## Target User

Primary user:

- needs to communicate across a language barrier during an online meeting;
- should be able to use TranslateIT without understanding internal models,
  helper processes, audio pipelines, or acceleration stacks.

Secondary use:

- direct desktop Indonesian/English text translation without starting voice.

## Product Success At This Level

TranslateIT is aligned with this overview when:

- meeting voice translation remains the primary product direction;
- text translation remains independently usable;
- initial scope stays focused on Windows and Indonesian/English;
- core translation can function locally after required assets exist;
- voice listening begins only through an explicit user-started session or PTT;
- speech boundaries are tuned for natural, responsive conversation;
- official voice latency is measured end-of-utterance -> first translated audio;
- Realtime is the normal meeting-voice mode and Quality the normal standalone-text
  mode;
- CUDA is preferred but CPU-only systems retain a truthful supported/degraded local
  path;
- model/provider names remain internal implementation details for normal users;
- outbound meeting audio contains translated English voice rather than raw
  Indonesian microphone audio by default;
- meeting routing fails explicitly to Setup Needed rather than silently falling
  back to an unsafe/unapproved route;
- local translated-voice monitoring is optional and user-controlled;
- translation preserves meaning, entities, natural language, and appropriate tone
  rather than optimizing literal word matching;
- recent context may improve continuity without becoming automatic persistent
  memory;
- Local History is user-controlled and separate from explicitly Saved work;
- raw audio is not persistently retained by default;
- diagnostic logging avoids full conversation content by default;
- one desktop application owns the user experience;
- implementation state is not confused with product priority;
- static source presence is not reported as live runtime readiness.

## Explicitly Unresolved

This overview intentionally does **not** decide:

- exact implementation model/provider selection;
- numeric VAD/silence/chunk/segment tuning;
- numeric target-PC latency release threshold;
- exact virtual-audio driver/provider implementation;
- exact prompt/glossary/context-window implementation;
- document translation scope;
- Audio Studio scope;
- installer, packaging, update, or distribution policy beyond Windows as the
  initial supported platform;
- final normal-user versus developer-diagnostics UI boundary beyond the approved
  readiness/provider/privacy-detail split.

## Evidence Boundary

This file defines **product direction**, not runtime readiness.

Current source confirms that text, voice/readiness, helper, microphone, audio,
translation, latency-measurement, local acceleration/provider, guarded virtual
routing, translation-context, and persistence structures exist, but
target-environment behavior remains subject to the evidence rules in root
`AGENTS.md`.

Do not infer successful model loading, microphone capture, contextual/tone quality,
TTS quality, meeting audio delivery, History/Saved completeness, latency target
attainment, CUDA performance, packaging, or release readiness from this overview.

## Related

- `AGENTS.md` — repository working and evidence rules
- `CONTEXT.md` — compact stable project context
- `docs/knowledge/next-action.md` — current active recovery step
- `.agents/skills/development-brief/SKILL.md` — Developing front door
