# Next Action

Updated: 2026-08-09
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

`CONTEXT_RECOVERY_AUDIO_STUDIO_SCOPE`

Product purpose, platform/locality, language/voice direction, voice
input/segmentation, latency/runtime modes, acceleration/provider policy, meeting
audio routing, translation behavior/tone, History/Saved/privacy policy, and
Document Translation scope are now recovered and approved. The active slice is
defining whether and how **Audio Studio / custom voice actor** belongs in the
initial product.

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
Standalone text/document default -> Quality

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

TRANSLATION BEHAVIOR
Meaning/context first, not word-by-word
Auto / Formal / Casual; Auto default
Technical/entity fidelity preserved
Recent context bounded/local/session-scoped

HISTORY / SAVED / PRIVACY
Local History on by default and user-disableable
Saved requires explicit user action
Raw/TTS audio temporary by default
History is never automatic model context
Diagnostics are minimal/redacted by default

DOCUMENT TRANSLATION
First-class: TXT / MD / DOCX / text-based PDF / SRT / VTT
OCR deferred
DOCX basic semantic structure preservation
PDF exports text/DOCX rather than exact-layout translated PDF
Semantic chunking; Quality default
Document History stores job metadata by default
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

## Audio Studio Evidence

Inherited V1-Advance requirements treated Audio Studio as a secondary feature in
the same TranslateIT V1 engine whose purpose was to create a custom English voice
actor from user voice samples.

Current `New` source/contract evidence shows a much larger but mostly unimplemented
surface:

- Audio Studio supports metadata concepts for imported takes and guided-reading
  takes with states such as draft/staged/accepted/needs-retry/blocked;
- metadata is split between `UserData/CacheData/AudioStudio` and
  `UserData/SavedProject/AudioStudio`;
- current commands can create/list/update/export take/project metadata;
- current provider status explicitly reports `provider_blocked`;
- guided microphone capture, real audio-quality measurement, profile processing,
  generated voice output, and streaming generation are not connected and require
  target-PC evidence;
- current runtime manifest references a custom voice profile (`marcel`) but marks
  the voice actor unavailable, so a custom profile is not current runtime proof;
- an inherited advanced contract proposes starter/production/broadcast profile
  tiers, fixed sample-minute targets, pace/energy/clarity/emotion/style controls,
  multilingual output, dialogue mode, long-form generation, and streaming;
- those advanced surfaces are contract/planning evidence, not proven current
  product needs.

The core meeting product already has a separate requirement for usable local
English TTS. Therefore a custom voice actor does not need to be a prerequisite for
Meeting Voice readiness unless the user explicitly chooses that product direction.

## Holds

Until this recovery slice is approved, do not:

- change application/runtime source to build Audio Studio;
- make custom voice creation a prerequisite for normal meeting translation;
- freeze `marcel` or any other named voice profile as product identity;
- freeze 1/30/180-minute sample targets as product requirements;
- promote starter/production/broadcast tiers without a demonstrated user need;
- promote emotion/style/dialogue/multilingual/long-form controls merely because an
  inherited advanced contract lists them;
- create a separate Audio Studio engine or product;
- use cloud voice cloning/training implicitly;
- retain voice samples without clear local ownership, authorization, and deletion
  behavior;
- create `02-product-requirements.md` yet.

## Next Decision

Recover the **Audio Studio / custom voice actor product boundary**:

1. decide whether Audio Studio remains part of the initial release, becomes an
   optional advanced feature after the core meeting workflow, or is deferred;
2. define its minimum useful purpose (create/manage a local custom English voice
   profile for outbound translated TTS);
3. decide whether imported audio and guided recording are both required inputs;
4. define consent/voice-ownership and local-storage/deletion requirements;
5. decide whether profile quality should be capability/quality-gated instead of
   fixed sample-minute tiers;
6. define fallback behavior when a custom profile is unavailable so normal local
   English TTS continues to work;
7. keep provider/model/training method and advanced style controls as implementation
   or future-scope details unless explicitly justified.

Do **not** change runtime/source while recovering this requirement.

## Completion Boundary For This Step

This slice is complete when Audio Studio release priority, minimum workflow,
voice-authorization/privacy boundary, profile readiness semantics, default-TTS
fallback, and advanced-feature exclusions are explicitly approved with current
metadata-only implementation kept separate from runtime readiness.
