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

The exact meeting-audio integration, capture behavior, output routing, latency,
and provider/model choices are intentionally not defined by this overview. They
must be recovered and specified by the appropriate later foundation owner.

## Secondary Standalone Workflow

TranslateIT also provides text translation as an independently useful workflow.

Text translation must remain usable even when the voice pipeline is unavailable,
blocked, still being configured, or awaiting local runtime proof.

This secondary workflow is not a replacement for the primary meeting-voice
product direction.

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
For the primary voice workflow, translated speech is produced for meeting use
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

Current source presence also does not prove that voice, models, audio routing,
or other runtime capabilities work end to end on a target machine.

## Target User

Primary user:

- needs to communicate across a language barrier during an online meeting;
- should be able to use TranslateIT without understanding its internal models,
  helper processes, audio pipeline, or acceleration stack.

Secondary use:

- a user who wants direct desktop text translation without starting the voice
  workflow.

More specific market/persona segmentation is not fixed by this overview.

## Product Success At This Level

TranslateIT is aligned with this overview when:

- meeting voice translation remains the primary product direction;
- text translation remains independently usable;
- one desktop application owns the user experience;
- internal runtime complexity does not become a second user-facing product;
- implementation state is not confused with product priority;
- static source presence is not reported as live runtime readiness;
- later feature decisions trace back to the communication problem above rather
  than expanding the product because adjacent technology is available.

## Explicitly Unresolved

This overview intentionally does **not** decide:

- initial operating-system/platform scope;
- local-only versus cloud-assisted runtime policy;
- final supported language set or launch language pair;
- exact ASR, translation, TTS, or voice provider/model choices;
- GPU/CUDA and CPU fallback policy;
- speech segmentation and input-mode behavior;
- latency targets;
- meeting audio integration and virtual microphone behavior;
- microphone monitoring/muting details;
- translation tone/profile modes;
- document translation scope;
- history/saved-session product requirements;
- Audio Studio scope;
- installer, packaging, update, or distribution policy;
- final normal-user versus developer-diagnostics UI boundary.

These must be recovered from current source and inherited evidence, then approved
before becoming durable requirements.

## Evidence Boundary

This file defines **product direction**, not runtime readiness.

Current source confirms that text, voice/readiness, helper, microphone, audio, and
translation structures exist, but target-environment behavior remains subject to
the evidence rules in root `AGENTS.md`.

Do not infer successful model loading, microphone capture, TTS quality, audio
routing, meeting integration, latency, CUDA behavior, packaging, or release
readiness from this overview.

## Related

- `AGENTS.md` — repository working and evidence rules
- `CONTEXT.md` — compact stable project context
- `docs/knowledge/next-action.md` — current active recovery step
- `.agents/skills/development-brief/SKILL.md` — Developing front door
