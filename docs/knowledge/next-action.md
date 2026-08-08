# Next Action

Updated: 2026-08-08
Status: active task snapshot
Working branch: `New`

This note is the single active-task resume point for TranslateIT. New sessions read:

`AGENTS.md` -> `CONTEXT.md` -> this note

Stable facts belong in `CONTEXT.md`; durable approved product/system policy belongs
in `docs/foundation/`; historical material remains recovery evidence until
classified.

## Active Goal

Recover and reconcile TranslateIT into a small current product foundation before
broad development resumes.

## Current Phase

`CONTEXT_RECOVERY_LANGUAGE_AND_VOICE_DIRECTION`

The product purpose, initial platform, and core runtime-locality policy are now
recovered and approved. The next requirement slice must establish the launch
language scope and how voice translation directions should behave.

## Completed Boundary

Completed on `New`:

- branch `New` created from `V1-Advance` baseline commit
  `6fd3485d6b22b9e3f44abc640241532aea61c3c7`;
- root `AGENTS.md` established as working/routing/evidence authority;
- root `CONTEXT.md` established as compact stable recovery context;
- `.agents/skills/development-brief/SKILL.md` established as the only current
  repository-specific Developing front door;
- primary product direction revalidated as real-time voice translation for
  online meetings;
- standalone text translation retained as the secondary/fallback workflow;
- `docs/foundation/01-product-overview.md` established as the durable product
  purpose owner;
- initial supported platform approved as Windows;
- core ASR -> translation -> TTS policy approved as local-first and offline-capable
  after required runtime/model assets are installed;
- future cloud-assisted capability remains optional and must not become a required
  dependency of the core workflow;
- no inherited application/runtime source has been changed by context recovery.

## Approved Product Direction

```text
PRIMARY
Real-time voice translation for online meetings

SECONDARY / STANDALONE
Text translation usable independently of voice readiness
```

High-level intended product flow:

```text
speech input
-> transcription
-> translation
-> translated voice output
-> meeting use
```

## Approved Platform And Locality Policy

```text
Initial supported platform
-> Windows

Core runtime
-> local-first
-> offline-capable after runtime/model assets are installed

Future cloud assistance
-> optional only
-> not a required core dependency
```

Current source supports this direction through Windows-oriented NSIS/Tauri setup,
local RuntimeAssets model paths, local-only model loading, and local TTS/provider
paths. These are implementation/source observations, not target-PC runtime proof.

## Current Architecture Baseline

```text
Rust/Tauri desktop shell
+
Python helper runtime
```

Current source starts from:

```text
EngineData/Frontend/RustApp
EngineData/Backend/LocalWorker/WorkerRuntime
EngineData/Backend/RuntimeContracts
```

Current frontend entrypoint instantiates `SimpleLauncherController`.
This is static/source evidence, not live runtime proof.

## Holds

Until later recovery slices approve the relevant requirement, do not:

- resume inherited feature TODOs automatically;
- redesign the product/UI broadly;
- replace the Rust/Tauri + Python helper architecture without a grounded decision;
- create V2/V3/V4, a parallel engine, alternate launcher, or duplicate pipeline;
- mass-rewrite inherited `DevelopingData` documentation;
- treat language/model/provider, CUDA, latency, virtual microphone, Audio Studio,
  installer, or detailed audio behavior as current policy merely because inherited
  documents called them final/locked;
- introduce a required cloud API into core translation behavior;
- create specialist project skills before a reusable semantic owner is proved;
- claim runtime/device/model/audio/release readiness from static source alone.

## Evidence State

Current recovery has established:

- product purpose by explicit user decision;
- initial supported platform as Windows by explicit user decision;
- local-first/offline-capable core runtime by explicit user decision;
- current high-level single-engine architecture baseline;
- current UI entrypoint and text-first stabilization shape;
- presence of local ASR/translation/TTS/runtime source structures;
- a durable product overview that intentionally leaves unresolved detailed
  requirements outside its authority.

Material live behavior remains unverified unless separately proven.

## Next Step

Recover the **launch language scope and voice-translation direction**.

Specifically:

1. inspect the current language selector/settings restrictions;
2. inspect translation runtime support by direction and mode;
3. inspect current ASR/TTS language assumptions and output behavior;
4. compare those findings with the inherited Indonesian <-> English requirement
   and the inherited Indonesian speech -> English TTS-first rule;
5. distinguish what should be launch product scope from what is merely a current
   model/runtime limitation;
6. present only the high-impact language/voice-direction choices that require
   current user approval.

Do **not** create `02-product-requirements.md` in the same recovery slice.
Do **not** change application source while recovering this requirement.

## Completion Boundary For This Step

This slice is complete when the initial supported language pair(s), text
translation direction(s), and voice-output direction(s) can be stated clearly,
with model/runtime limitations separated from durable product requirements.
