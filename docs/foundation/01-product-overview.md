# TranslateIT — Product Overview

**Status:** Active Policy  
**Updated:** 2026-08-08

## Purpose

TranslateIT is a desktop translation application whose primary purpose is to help
a user communicate across a language barrier during an online meeting through
real-time voice translation.

The product should reduce the amount of manual switching between listening,
transcribing, translating, and speaking a translated response. The user should
interact with one application rather than understand the internal ASR,
translation, TTS, audio-routing, or model/runtime implementation.

## Primary Use Case

The approved primary product direction is:

```text
speech input
-> transcription
-> translation
-> translated voice output
-> online meeting use
```

Voice translation is therefore a core product capability, not an optional legacy
feature.

The exact meeting-audio integration, output routing, GPU/provider/model choices,
and numeric release thresholds are intentionally not defined by this overview.
They must be recovered and specified by the appropriate later foundation owner.

## Secondary Standalone Workflow

TranslateIT also provides text translation as an independently useful workflow.

Text translation must remain usable even when the voice pipeline is unavailable,
blocked, still being configured, or awaiting local runtime proof.

This secondary workflow is not a replacement for the primary meeting-voice
product direction.

## Initial Product Boundary

The current approved launch boundary is:

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

Future platforms, optional cloud-assisted features, additional languages, or
Indonesian TTS are not permanently prohibited. They require a later explicit
product decision and must not expand the initial product by default.

## Voice Input Interaction Boundary

Normal meeting use follows **Session Listening**:

```text
User explicitly starts voice session
-> TranslateIT listens continuously while the session is active
-> VAD/speech-boundary logic identifies utterances
-> utterances move into the translation pipeline
-> User explicitly stops voice session
```

TranslateIT must not begin persistent listening merely because the application is
open.

**Push to Talk** remains a secondary input interaction with `Ctrl+Space` as the
approved default hotkey.

Speech segmentation is defined by behavior rather than fixed legacy constants:

- detect a meaningful natural pause;
- avoid cutting active words/speech unnecessarily;
- begin processing promptly after a valid utterance boundary;
- handle longer speech without losing content.

Numeric silence/VAD/chunk/segment values are implementation tuning that must be
validated against real latency and speech quality. The inherited `700 ms` silence
and `12 s` maximum segment values are not permanent product requirements.

## Latency And Runtime Mode Boundary

The official user-relevant voice latency measurement is:

```text
detected end of utterance
-> first translated audio begins playing
```

TranslateIT should feel responsive enough for natural online conversation, but a
numeric release threshold is benchmark-derived rather than inherited as a fixed
`<= 1 second` promise. Supported target-PC measurements must establish the release
threshold.

Supporting ASR, translation, TTS, and playback timing should remain measurable for
diagnosis.

User-facing runtime modes are:

```text
Realtime
Quality
```

Normal defaults are workflow-aware:

```text
Meeting voice
-> Realtime

Standalone text
-> Quality
```

The runtime may automatically choose a suitable local profile when a language
direction or workflow cannot be served by the preferred profile. Normal users
should not need to select model/provider names. A manual `Realtime` / `Quality`
override may remain available in Settings.

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

The intended product loop is:

```text
User communication intent
↓
TranslateIT receives speech or text
↓
Language content is translated
↓
Translated text is visible to the user
↓
For the primary outbound voice workflow, translated English speech is produced
for meeting use
```

The experience should expose product actions and useful readiness information,
not require normal users to operate internal runtime components directly.

## Current Architecture Baseline

The current single-engine recovery baseline is:

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

Rust/Tauri is the user-facing desktop application direction. Python is an
internal helper runtime and must not become a second competing product shell.

This overview does not authorize a parallel V2/V3/V4 engine, alternate launcher,
or duplicate runtime pipeline.

## Current Implementation Posture

The current `New` frontend entrypoint instantiates `SimpleLauncherController`.
The visible application currently presents text translation as the immediately
usable main workflow while voice remains setup-gated.

That UI state is treated as the current stabilization/implementation posture.
It does **not** change the approved product priority: real-time meeting voice
translation remains primary, and text translation remains the secondary
standalone path.

Current source reflects asymmetric translation support, historical/current
input-mode conflicts, and `Fast` versus `Realtime` naming drift. Approved product
policy above governs intent; implementation must later be aligned through normal
Developing work after recovery is complete.

## Target User

Primary user:

- needs to communicate across a language barrier during an online meeting;
- should be able to use TranslateIT without understanding its internal models,
  helper processes, audio pipeline, or acceleration stack.

Secondary use:

- a user who wants direct desktop Indonesian/English text translation without
  starting the voice workflow.

More specific market/persona segmentation is not fixed by this overview.

## Product Success At This Level

TranslateIT is aligned with this overview when:

- meeting voice translation remains the primary product direction;
- text translation remains independently usable;
- initial product scope stays focused on Windows and Indonesian/English;
- core translation operation can function locally after required assets exist;
- voice listening begins only through an explicit user-started session or PTT;
- speech boundaries are tuned for natural, responsive conversation rather than a
  frozen historical timer;
- official voice latency is measured end-of-utterance -> first translated audio;
- Realtime is the normal meeting-voice mode and Quality the normal standalone-text
  mode;
- one desktop application owns the user experience;
- internal model/provider choices stay implementation details for normal users;
- implementation state is not confused with product priority;
- static source presence is not reported as live runtime readiness;
- later feature decisions trace back to the communication problem above rather
  than expanding the product because adjacent technology is available.

## Explicitly Unresolved

This overview intentionally does **not** decide:

- exact ASR, translation, TTS, or voice provider/model choices;
- GPU/CUDA and CPU fallback policy;
- numeric VAD/silence/chunk/segment tuning;
- numeric target-PC latency release threshold;
- meeting audio integration and virtual microphone behavior;
- microphone monitoring/muting details;
- Auto/Formal/Casual translation tone modes;
- document translation scope;
- history/saved-session product requirements;
- Audio Studio scope;
- installer, packaging, update, or distribution policy beyond Windows as the
  initial supported platform;
- final normal-user versus developer-diagnostics UI boundary.

These must be recovered from current source and inherited evidence, then approved
before becoming durable requirements.

## Evidence Boundary

This file defines **product direction**, not runtime readiness.

Current source confirms that text, voice/readiness, helper, microphone, audio,
translation, and latency-measurement structures exist, but target-environment
behavior remains subject to the evidence rules in root `AGENTS.md`.

Do not infer successful model loading, microphone capture, TTS quality, audio
routing, meeting integration, latency target attainment, CUDA behavior, packaging,
or release readiness from this overview.

## Related

- `AGENTS.md` — repository working and evidence rules
- `CONTEXT.md` — compact stable project context
- `docs/knowledge/next-action.md` — current active recovery step
- `.agents/skills/development-brief/SKILL.md` — Developing front door
