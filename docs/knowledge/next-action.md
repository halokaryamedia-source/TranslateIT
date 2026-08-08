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

`CONTEXT_RECOVERY_INPUT_BEHAVIOR_AND_SEGMENTATION`

Product purpose, initial platform/locality, and initial language/voice direction
are now recovered and approved. The next requirement slice must establish how
voice capture starts/stops and how speech boundaries should be detected.

## Completed Boundary

Completed on `New`:

- branch `New` created from `V1-Advance` baseline commit
  `6fd3485d6b22b9e3f44abc640241532aea61c3c7`;
- root `AGENTS.md` established as working/routing/evidence authority;
- root `CONTEXT.md` established as compact stable recovery context;
- `.agents/skills/development-brief/SKILL.md` established as the only current
  repository-specific Developing front door;
- primary product direction approved as real-time voice translation for online
  meetings;
- standalone text translation retained as the secondary/fallback workflow;
- `docs/foundation/01-product-overview.md` established and kept aligned with
  approved product boundaries;
- initial supported platform approved as Windows;
- core ASR -> translation -> TTS approved as local-first and offline-capable after
  required runtime/model assets are installed;
- initial language scope approved as Indonesian and English;
- text translation approved as Indonesian <-> English;
- outbound meeting voice approved as Indonesian speech -> English translated
  voice;
- inbound meeting assistance approved as English speech -> Indonesian translated
  text;
- English speech -> Indonesian TTS is not an initial requirement;
- no inherited application/runtime source has been changed by context recovery.

## Approved Product Boundary

```text
PRIMARY
Real-time voice translation for online meetings

SECONDARY / STANDALONE
Indonesian <-> English text translation

INITIAL PLATFORM
Windows

CORE RUNTIME
Local-first / offline-capable after assets are installed

OUTBOUND VOICE
Indonesian speech -> English voice

INBOUND ASSISTANCE
English speech -> Indonesian text
```

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

## Input/Segmentation Conflict To Resolve

Inherited V1-Advance contract declares:

```text
default input: always-listening
secondary input: push-to-talk
push-to-talk hotkey: Hold Space
silence threshold: 700 ms
maximum speech segment: 12 s
```

Current source does not cleanly implement that contract:

- current Audio settings visually present `Click Toggle` as default and
  `Push to Talk` as secondary using `Ctrl+Space`;
- current `RuntimeSettings` does not contain a canonical persisted input-mode
  field;
- current `SimpleLauncherController` main voice action behaves as click-to-start /
  click-to-stop capture;
- current capture-helper payload does not include the inherited `input_mode`
  field even though the old contract requires it;
- current VAD/runtime profiles contain much shorter silence/segment boundaries
  than the inherited 700 ms / 12 s rule and appear to represent experimental
  runtime tuning rather than an approved product contract.

Therefore neither the old contract nor the current UI/runtime numbers should be
promoted to current policy without explicit reconciliation.

## Holds

Until later recovery slices approve the relevant requirement, do not:

- resume inherited feature TODOs automatically;
- redesign the product/UI broadly;
- replace the Rust/Tauri + Python helper architecture without a grounded decision;
- create V2/V3/V4, a parallel engine, alternate launcher, or duplicate pipeline;
- mass-rewrite inherited `DevelopingData` documentation;
- treat model/provider, CUDA, latency, virtual microphone, Audio Studio,
  installer, or detailed audio behavior as current policy merely because inherited
  documents called them final/locked;
- treat `always-listening`, `Click Toggle`, `Hold Space`, `Ctrl+Space`, 700 ms,
  12 s, or current VAD tuning values as approved product requirements until the
  active recovery slice resolves them;
- create specialist project skills before a reusable semantic owner is proved;
- claim runtime/device/model/audio/release readiness from static source alone.

## Evidence State

Current recovery has established product direction and launch boundaries by
explicit user decision. Current source additionally proves that input-mode and
speech-boundary behavior is internally inconsistent across old contracts, current
UI, current settings schema, capture payloads, and VAD tuning.

Material live behavior remains unverified unless separately proven.

## Next Step

Recover the **input behavior and speech-segmentation policy**.

Specifically:

1. decide whether normal meeting use should be always-listening, explicit
   click-toggle, or another primary capture interaction;
2. decide whether Push to Talk remains a secondary mode and choose a stable hotkey
   policy without relying on stale UI text;
3. define speech-end behavior semantically first (detect a natural pause and avoid
   cutting words) before freezing numeric thresholds;
4. decide whether 700 ms / 12 s remain product requirements or should become
   tunable implementation defaults validated by latency/accuracy evidence;
5. keep current VAD numeric tuning as implementation evidence only until target-PC
   behavior is measured.

Do **not** create `02-product-requirements.md` until this slice is approved.
Do **not** change application source while recovering this requirement.

## Completion Boundary For This Step

This slice is complete when the primary/secondary voice input interactions and the
semantic speech-segmentation requirement are approved, with numeric tuning clearly
classified as fixed product policy or implementation parameters requiring runtime
validation.
