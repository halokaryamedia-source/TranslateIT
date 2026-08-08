# TranslateIT — Product Overview

**Status:** Active Policy  
**Updated:** 2026-08-09

## Purpose

TranslateIT is a Windows desktop translation application whose primary purpose is
to help a user communicate across a language barrier during an online meeting
through real-time local voice translation.

The product should hide internal ASR, translation, TTS, helper-process,
acceleration, and audio-routing complexity behind a simple product workflow.

## Product Hierarchy

### Primary — Meeting Voice

```text
Indonesian speech
-> transcription
-> English translation
-> English TTS
-> TranslateIT meeting microphone
-> meeting application
```

Inbound meeting assistance translates English speech into Indonesian text for the
local user.

### Secondary — Text Translation

Standalone Indonesian <-> English text translation remains independently usable
when voice is unavailable, not configured, or not needed.

### Secondary — Document Translation

First-class document translation supports TXT, Markdown, DOCX, text-based PDF,
SRT, and VTT within a bounded local workflow.

### Advanced / Post-Core — Audio Studio

Audio Studio creates and manages an authorized local custom English voice profile
for outbound translated TTS. It is part of TranslateIT but is not an initial
core-release blocker.

## Initial Product Boundary

```text
Platform
-> Windows

Runtime
-> local-first
-> offline-capable after required assets are installed

Languages
-> Indonesian
-> English

Core outbound voice
-> Indonesian speech -> English voice

Core inbound assistance
-> English speech -> Indonesian text

Not initial scope
-> English speech -> Indonesian TTS
-> additional language pairs
-> mandatory cloud services
```

Optional future cloud assistance may exist only through an explicit later product
decision and must not silently replace the local core.

## Meeting Interaction

Normal meeting use follows **Session Listening**:

```text
Start Meeting / Start Voice
-> TranslateIT prepares required local runtime automatically
-> continuous listening while the session is active
-> natural-pause/VAD utterance boundaries
-> ASR -> translation -> TTS
-> translated voice routed to meeting input
-> Stop Meeting / Stop Voice
```

Push to Talk remains a secondary mode using `Ctrl+Space` by default.

Normal users should not manually operate helper processes, workers, preload steps,
or pipeline internals.

## Translation Quality

TranslateIT translates meaning and communication intent rather than literal word
order.

Priority:

```text
intended meaning
-> factual/entity fidelity
-> natural target-language grammar
-> appropriate tone
-> literal wording when useful
```

User-facing tone modes are `Auto`, `Formal`, and `Casual`, with `Auto` default.
Recent conversation context may help translation when bounded to the current local
session, but persistent History is never automatic model context.

## Runtime Modes

User-facing modes are:

```text
Realtime
Quality
```

Normal defaults:

```text
Meeting voice -> Realtime
Standalone text -> Quality
Document translation -> Quality
```

The runtime may choose an appropriate local implementation profile when the
preferred mode cannot serve a direction/workflow. Model/provider names remain
implementation details.

## Performance And Acceleration

CUDA is preferred when available and validated, especially for Realtime meeting
voice. An NVIDIA GPU is not mandatory.

CPU fallback is required. If CPU performance cannot satisfy Realtime expectations,
TranslateIT must report a truthful degraded/not-Realtime-ready state rather than
pretending equivalent performance.

The user-relevant latency metric is:

```text
detected end of utterance
-> first translated audio begins playing
```

The release threshold is benchmark-derived rather than inherited as a fixed
`<= 1 second` promise.

## Meeting Audio

The primary outbound meeting route sends **translated English voice**, not raw
Indonesian microphone audio, by default.

```text
Physical microphone
-> TranslateIT capture
-> translation pipeline
-> English TTS
-> TranslateIT meeting microphone/audio route
-> Zoom / Meet / Teams / other meeting app
```

The physical microphone remains available to TranslateIT for capture. Local
translated-voice monitoring is optional, off by default, and user-adjustable.

The underlying Windows virtual-audio provider is replaceable. Missing route means
`Setup Needed`; TranslateIT must not silently substitute raw mic, speaker output, or
cloud routing.

## History, Saved And Privacy

```text
History
-> automatic local record when enabled
-> on by default
-> searchable / deletable / clearable
-> user-disableable

Saved
-> explicit user action
-> intentionally preserved session/work
```

Clearing History must not delete Saved sessions.

Raw/source microphone audio and generated TTS are temporary by default. Persistent
replay audio requires explicit save. Diagnostic logs should contain minimal,
redacted operational information rather than full conversation bodies by default.

## Document Translation

Initial first-class formats:

```text
TXT
Markdown
DOCX
text-based PDF
SRT
VTT
```

- DOCX preserves practical semantic/basic structure but does not guarantee
  pixel-perfect Word layout.
- PDF is text-layer extraction only initially and exports translated text/DOCX;
  exact-layout translated PDF is not required.
- Scanned/image-only PDF and OCR are deferred.
- SRT/VTT preserve timestamps and sequence.
- Larger documents use semantic chunking and bounded adjacent context.
- Processing artifacts remain local/temporary; persistent output requires explicit
  Save/Export.

Quick text attachments such as JSON/CSV/YAML/XML are not equivalent to
structure-preserving document translation.

## Audio Studio

Minimum intended workflow:

```text
Create Voice Profile
-> Import Samples or Guided Recording
-> Local Quality Check
-> Accept / Retry / Remove
-> Build Local English Voice Profile
-> Preview
-> Activate
```

Voice authorization is required. Readiness is quality/provider-driven rather than
fixed sample-minute tiers. Default local English TTS remains available when custom
voice is absent or fails.

Broadcast tiers, emotion/style production controls, multilingual cloning, dialogue
mode, and long-form voice-production studio are not initial scope.

## Installer And Distribution

Initial distribution is Windows internal/controlled first.

The normal user receives one installer/setup experience. A normal installed build
must not require manual Python, `pip`, environment variables, developer scripts, or
manual core-model installation.

Release inputs/package must provide:

```text
Rust/Tauri desktop app
packaged Python/helper runtime
required runtime dependencies
core ASR assets
core ID/EN translation assets
default local English TTS
meeting-audio-route setup/support
```

Model binaries may remain outside Git but are required release-build inputs.
System Python may remain a development fallback only.

Auto-update is deferred. Code signing is not an internal-release blocker but should
be revisited before broad/public distribution. Exact installer filename is a build
convention, not product identity.

Installer readiness requires clean supported-Windows proof; NSIS configuration or
a successful package build alone is insufficient.

## Product UI Boundary

Normal product navigation should converge on:

```text
Meeting
Text
Documents
History
Saved
Settings
```

Meeting is the primary workspace.

Normal users see:

- product actions and translated results;
- transcript and meeting state;
- language direction;
- `Auto / Formal / Casual`;
- `Realtime / Quality`;
- microphone/speaker/meeting-microphone choices;
- Local History/privacy controls;
- simple readiness and recovery actions.

Normal readiness states:

```text
Ready
Degraded
Setup Needed
Unavailable
Checking
```

Normal recovery actions should be product-level, such as `Retry`, `Fix Setup`, or
`Open Diagnostics`.

Developer Diagnostics remains available under an Advanced/Developer entry and may
show helper lifecycle, model/provider details, CUDA/CPU information, pipeline
stages, exact latency breakdown, virtual-route details, logs, evidence, and
engineering test controls.

`Fast` is superseded as a product term; canonical mode naming is
`Realtime / Quality`.

## Architecture Baseline

```text
Rust/Tauri desktop shell
+
Python helper runtime
```

Source ownership begins at:

```text
EngineData/Frontend/RustApp
EngineData/Backend/LocalWorker/WorkerRuntime
EngineData/Backend/RuntimeContracts
EngineData/Backend/RuntimeAssets
```

One desktop application owns the UX. Python is internal runtime support, not a
second product shell. Parallel V2/V3/V4 engines or launchers require a new explicit
architecture decision.

## Product Success At This Level

TranslateIT is aligned when:

- meeting voice is visibly the primary product workflow;
- text and approved document translation remain independently useful;
- initial scope stays Windows + Indonesian/English;
- the installed core is local-first/offline-capable;
- user-facing controls describe product behavior rather than engine internals;
- translation preserves meaning, entities, naturalness, and appropriate tone;
- meeting output carries translated English voice by default;
- History/privacy behavior is explicit and local;
- Audio Studio remains advanced and non-blocking;
- installer setup owns required core runtime dependencies;
- implementation presence is not confused with target-PC readiness.

## Evidence Boundary

This file defines product direction, not current implementation readiness.

Current source remains partially aligned and contains inherited stabilization and
developer-facing surfaces. Do not infer successful microphone capture, translation
quality, TTS quality, meeting routing, latency, CUDA performance, persistence,
document parsing/export, Audio Studio profile generation, or installer readiness
without the evidence required by root `AGENTS.md`.

## Related

- `AGENTS.md` — repository working/evidence rules.
- `CONTEXT.md` — compact stable project context.
- `docs/foundation/02-product-requirements.md` — detailed approved requirements.
- `docs/knowledge/next-action.md` — active continuation point.
- `.agents/skills/development-brief/SKILL.md` — non-trivial Developing front door.
