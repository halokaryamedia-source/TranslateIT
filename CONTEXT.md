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
-> TranslateIT meeting microphone/audio route
-> meeting application
```

Primary inbound assistance:

```text
English speech
-> English transcript
-> Indonesian translated text
-> local user
```

Standalone Indonesian <-> English text translation is a supported secondary
workflow. First-class document translation is also secondary.

## Initial Product Boundary

- Initial supported platform: **Windows**.
- Core runtime: **local-first and offline-capable after required assets are
  installed**.
- Initial languages: **Indonesian and English**.
- English speech -> Indonesian TTS is not an initial requirement.
- Additional languages are future scope.
- Cloud assistance may be added later only as an explicit optional feature; core
  behavior must not silently depend on it.

## Voice Interaction

- Primary voice interaction: **Session Listening**. The user explicitly starts a
  session; TranslateIT then listens continuously and segments speech until the user
  stops the session.
- Secondary interaction: **Push to Talk**, default `Ctrl+Space`.
- Speech segmentation is natural-pause/VAD based. Old fixed `700 ms` silence and
  `12 s` segment values are not product constants.
- Official voice latency metric: detected utterance end -> first translated audio.
  Numeric release threshold is benchmark-derived.

## Translation Behavior

- Translation is contextual and meaning-preserving, not word-for-word.
- Priority: intended meaning -> factual/entity fidelity -> natural target grammar ->
  appropriate tone -> literal wording when useful.
- Initial tone modes: `Auto`, `Formal`, `Casual`; `Auto` default.
- Names, numbers, dates, units, URLs, code identifiers, versions, acronyms, and
  technical facts should remain accurate.
- Mixed Indonesian/English and conversational/slang input should be handled
  naturally.
- Recent translation context is bounded, local, and session-scoped. Persistent
  History is never automatic model context.

## Runtime Modes And Acceleration

- User-facing modes: `Realtime` and `Quality`.
- Meeting voice default: `Realtime`.
- Standalone text and document default: `Quality`.
- CUDA is preferred acceleration, not a mandatory hardware requirement.
- CPU fallback is mandatory. If CPU cannot meet Realtime expectations, report a
  truthful degraded/not-Realtime-ready state.
- ASR/translation/TTS model and provider names are replaceable implementation
  choices rather than product identity.
- No silent cloud fallback.

## Meeting Audio Routing

- Meeting output contains translated English TTS, not raw Indonesian microphone
  audio, by default.
- Physical microphone remains available to TranslateIT for ASR capture.
- Product concept: **TranslateIT meeting microphone/audio route** using the standard
  Windows microphone-device model.
- Underlying virtual-audio provider is replaceable; a custom TranslateIT kernel
  driver is not required if another supported provider satisfies the experience.
- Local translated-voice monitoring is optional, off by default, and
  user-adjustable.
- Missing meeting route -> `Setup Needed`; do not silently fall back to raw mic,
  speakers, or cloud.

## History, Saved, Privacy And Storage

- Keep Local History: on by default, local-only, user-disableable.
- History is automatic when enabled; **Saved** is explicit user-preserved work.
- Clearing History must not delete Saved sessions.
- Raw/source microphone audio and generated TTS audio are temporary by default;
  persistent replay audio requires explicit save.
- Diagnostic logs should contain minimal operational/redacted data and no full
  conversation content by default.
- Persistent History must not automatically feed model context.

Storage ownership:

```text
UserData/CacheData/    -> disposable runtime/session data
UserData/LogData/      -> minimal/redacted runtime operational diagnostics
UserData/SavedProject/ -> explicit persistent user-visible/user-approved data
```

Developer/source-validation reports are not UserData; disposable development evidence belongs under ignored `.tmp/` paths.

## Document Translation

First-class initial formats:

```text
.txt
.md
.docx
text-based .pdf
.srt
.vtt
```

- TXT/MD: translated preview + same-format export.
- DOCX: translated preview + translated DOCX with practical preservation of
  paragraphs, headings, lists, tables, basic formatting, and document order.
  Pixel-perfect Word layout is not guaranteed.
- PDF: text-layer extraction only; translated preview + text/DOCX export. Exact
  layout-preserving translated PDF is not required initially.
- OCR/scanned PDF: deferred; clearly report when OCR is required.
- SRT/VTT: preserve sequence/timestamps.
- Larger documents use semantic chunking with bounded adjacent context.
- JSON/CSV/YAML/XML remain quick text attachments only; no initial
  structure-preserving document-export promise.
- Document working data stays temporary/local; persistent output requires explicit
  Save/Export. Document History stores job metadata by default, not the full body.

## Audio Studio

Audio Studio remains part of TranslateIT as an **advanced/post-core feature** and
is not an initial core-release blocker.

Purpose:

```text
authorized voice samples
-> import or guided recording
-> local quality review
-> accept/retry/remove takes
-> build local custom English voice profile
-> preview
-> activate for outbound translated TTS
```

- Voice authorization is required.
- Profile readiness is quality/provider-driven, not fixed 1/30/180-minute tiers.
- Default local English TTS remains available independently.
- Custom-profile failure falls back visibly to Default Voice.
- Working Audio Studio data stays under `CacheData`; persistent project/profile data
  stays under `SavedProject`.
- Samples/profile must be user-deletable.
- Broadcast tiers, emotion/style studio, multilingual cloning, dialogue mode, and
  long-form production studio are not initial scope.

## Installer And Distribution

Initial distribution policy:

- Windows internal/controlled distribution first.
- One user-facing installer/setup experience.
- Normal installed builds must not require manual Python, `pip`, model downloads,
  environment variables, or developer scripts.
- Release package must provide the desktop app, packaged helper runtime and
  dependencies, required core ASR/translation assets, default local English TTS,
  and supported meeting-audio-route setup path.
- System Python may remain a development fallback, not a production prerequisite.
- Model binaries may remain out of Git but are required release-build inputs.
- Core offline behavior should be available after installation.
- `DevelopingData` and existing developer `UserData` are not packaged as runtime
  content.
- Auto-update is deferred.
- Code signing is not an internal-release blocker but should be reconsidered before
  broad/public distribution.
- Exact installer filename is a build convention, not product identity.
- Installer readiness requires clean-Windows install/launch/runtime/model/text/TTS/
  relevant audio proof; an NSIS config alone is not proof.

## Normal UI And Developer Diagnostics

Normal product navigation should converge on:

```text
Meeting
Text
Documents
History
Saved
Settings
```

- Meeting is the primary product workspace.
- Normal users see product actions, translation/transcript results, language/tone/
  mode choices, audio devices, meeting microphone, privacy/history controls, and
  simple readiness/recovery actions.
- Normal readiness states: `Ready`, `Degraded`, `Setup Needed`, `Unavailable`,
  `Checking`.
- Normal recovery actions: retry, `Fix Setup`, and `Open Diagnostics`.
- Normal users do not operate Python, helper process lifecycle, worker internals,
  model paths, preload/smoke tools, CUDA/provider internals, pipeline handoffs, or
  raw logs.
- Developer Diagnostics remains available under an Advanced/Developer entry and may
  expose full runtime evidence and engineering controls.
- Audio Studio is advanced/post-core rather than primary navigation initially.
- Canonical mode naming is `Realtime / Quality`; `Fast` is superseded.

## Current Architecture Baseline

```text
Rust/Tauri desktop shell
+
Python helper runtime
```

Current source/data roots:

```text
Desktop application
-> EngineData/Frontend/RustApp

Internal helper runtime
-> EngineData/Backend/LocalWorker/WorkerRuntime

Runtime contracts
-> EngineData/Backend/RuntimeContracts

Runtime assets
-> EngineData/Backend/RuntimeAssets

Runtime/user data
-> UserData

Historical/recovery/reference development evidence
-> DevelopingData
```

`EngineData` is canonical product implementation. `UserData` is a runtime/user-data destination, not source authority. `DevelopingData` is non-authoritative historical/reference evidence and is outside normal production/runtime dependency and discovery contracts.

Rust/Tauri owns the user-facing application. Python is an internal helper runtime,
not a second product shell. Do not create parallel V2/V3/V4 engines or launchers
without a new explicit architecture decision.

## Current Implementation Evidence Boundary

The current `New` frontend instantiates `SimpleLauncherController`; current source presence does not prove target-PC readiness.

Do not claim live success without appropriate evidence for:

- microphone capture;
- local ASR/translation/TTS quality;
- contextual/tone translation quality;
- CUDA performance;
- virtual meeting-microphone delivery;
- benchmark latency;
- History/Saved completeness;
- DOCX/PDF parsing/export;
- Audio Studio capture/profile generation;
- self-contained installer behavior.

Use the evidence labels in root `AGENTS.md`.

## Canonical Owners

- `AGENTS.md` — agent working/evidence rules.
- `CONTEXT.md` — compact stable project context.
- `docs/foundation/01-product-overview.md` — product overview and scope hierarchy.
- `docs/foundation/02-product-requirements.md` — detailed approved product requirements.
- `docs/knowledge/next-action.md` — current continuation point.
- `docs/knowledge/source-ownership.md` — semantic requirement-to-source map.
- `.agents/skills/development-brief/SKILL.md` — non-trivial Developing front door.

The next task owner is `docs/knowledge/next-action.md`.
