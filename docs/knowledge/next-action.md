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

`CONTEXT_RECOVERY_TRANSLATION_BEHAVIOR_AND_TONE`

Product purpose, platform/locality, language/voice direction, voice
input/segmentation, latency/runtime-mode, acceleration/provider, and meeting audio
routing policy are now recovered and approved. The next slice must define what
translation quality means at product level and whether Auto/Formal/Casual are
current product requirements.

## Completed Product Boundary

```text
PRIMARY
Real-time voice translation for online meetings

SECONDARY
Indonesian <-> English text translation

INITIAL PLATFORM
Windows

CORE RUNTIME
Local-first / offline-capable after assets are installed

OUTBOUND VOICE
Indonesian speech -> English voice

INBOUND ASSISTANCE
English speech -> Indonesian text

PRIMARY VOICE INPUT
Session Listening

SECONDARY VOICE INPUT
Push to Talk / Ctrl+Space

SEGMENTATION
Natural-pause behavior; numeric VAD/silence/segment values are runtime tuning

OFFICIAL VOICE LATENCY
Detected utterance end -> first translated audio begins
Numeric release threshold is benchmark-derived

USER MODES
Realtime / Quality
Meeting voice default -> Realtime
Standalone text default -> Quality

ACCELERATION
CUDA preferred, not required
CPU fallback mandatory
No silent cloud fallback

MODELS / PROVIDERS
Replaceable implementation choices

MEETING OUTPUT
Translated English voice only by default
TranslateIT-managed meeting microphone/audio route
Raw Indonesian microphone excluded from meeting output
Local monitoring optional/off by default
Route missing -> Meeting Voice Setup Needed
```

`docs/foundation/01-product-overview.md` and `CONTEXT.md` are aligned with these
approved boundaries. No inherited application/runtime source has been changed by
context recovery.

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

Static/source presence is not live runtime proof.

## Translation Behavior Evidence To Reconcile

Inherited V1-Advance requirements expected translation to be contextual and
meaning-preserving rather than literal. They also expected:

- formal source speech -> formal output;
- casual source speech -> natural casual output;
- graceful mixed Indonesian-English handling;
- Indonesian slang/conversational expression support;
- technical-term preservation where translating the term would confuse meaning;
- user-facing tone modes `Auto`, `Formal`, and `Casual`, with `Auto` default.

Current source does not yet prove that behavior end to end:

- `TranslationLogicRequest` contains a `context_window`, but the current fallback
  logic only records whether context exists; it does not use that window to shape
  model inference in the inspected path;
- the Python local worker translation request currently accepts text, direction,
  and Realtime/Quality mode but no explicit conversation-context or tone field;
- current persisted `RuntimeSettings` has no canonical tone-mode field;
- current Translate settings expose language and Realtime/Quality behavior but
  intentionally hide dictionary/glossary/prompt-style controls until the engine
  supports them;
- deterministic fallback phrases exist for a few meeting/support expressions,
  which is useful fallback evidence but not proof of general contextual/slang
  quality.

Therefore the old quality/tone requirements are still product-intent evidence,
not current runtime proof.

## Holds

Until this recovery slice is approved, do not:

- change application/runtime source to implement tone/context behavior yet;
- assume Auto/Formal/Casual must remain exactly as inherited merely because the
  old PRD called them final;
- expose prompt/model/provider controls to normal users;
- claim contextual, slang, mixed-language, terminology, or tone quality from the
  existence of context structs or deterministic phrase fallbacks;
- create glossary/prompt infrastructure before the product requirement is clear;
- create `02-product-requirements.md` yet.

## Next Step

Recover the **translation-quality and tone-mode product policy**.

Specifically:

1. define whether meaning preservation and natural phrasing outrank literal word
   matching;
2. define expected handling of formal/casual source speech, Indonesian slang,
   mixed ID/EN input, names, numbers, acronyms, and technical terms;
3. decide whether `Auto`, `Formal`, and `Casual` remain the user-facing tone modes
   and whether `Auto` remains default;
4. decide how tone override should behave without changing factual meaning or
   technical terminology;
5. decide whether short conversation history/context should influence translation
   when useful and what privacy/session boundary applies;
6. keep exact prompting, model context-window size, glossary mechanics, and
   provider implementation as implementation details unless a durable product
   reason requires otherwise.

Do **not** change runtime/source while recovering this requirement.

## Completion Boundary For This Step

This slice is complete when meaning-preservation, naturalness, tone behavior,
slang/mixed-language/technical-term handling, and conversation-context use can be
stated as approved product requirements with implementation mechanics and runtime
quality proof kept separate.
