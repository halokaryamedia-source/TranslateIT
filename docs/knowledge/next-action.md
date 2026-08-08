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

`CONTEXT_RECOVERY_GPU_AND_PROVIDER_POLICY`

Product purpose, platform/locality, language/voice direction, voice
input/segmentation, and latency/runtime-mode policy are now recovered and
approved. The next slice must define acceleration/fallback behavior and how
specific ASR/translation/TTS implementations relate to product requirements.

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
(user explicitly starts once -> continuous listening/VAD -> user stops)

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

## GPU / Provider Evidence To Reconcile

The strongest current architecture contract says:

```text
NVIDIA CUDA -> primary acceleration target
CPU fallback -> mandatory
Python helper -> allowed for ASR / translation / TTS / diagnostics / model handling
```

Current Python helper follows this general pattern:

- ASR selects CUDA when CTranslate2 CUDA is available, otherwise CPU;
- translation selects CUDA through Torch when available, otherwise CPU;
- CPU operation is marked degraded rather than silently reported as equivalent;
- ASR models currently reference Faster-Whisper local assets;
- translation currently uses a realtime Marian ID->EN path and a Quality NLLB
  path;
- local TTS currently uses Piper when available and Windows SAPI as a fallback;
- model/provider assets are loaded from local project/runtime paths.

However, some older Rust CUDA/diagnostic files still encode an abandoned-looking
`final runtime must not require Python` direction and native-Rust-only CUDA
planning. That conflicts with the stronger architecture contract and the current
`New` single-engine baseline, so those statements are stale implementation
history rather than current architecture authority.

Current static/source evidence also does **not** prove CUDA, model quality, TTS
quality, or realtime performance on a supported target PC.

## Holds

Until this recovery slice is approved, do not:

- change application/runtime source to match recovered policy yet;
- treat NVIDIA hardware as an absolute product requirement solely because CUDA is
  the current preferred accelerator;
- treat CPU fallback as equivalent to Realtime meeting performance without
  benchmark evidence;
- automatically cloud-fallback when local GPU/CPU inference is slow or blocked;
- freeze Faster-Whisper, Marian, NLLB, Piper, Windows SAPI, or a custom voice
  profile as permanent product identity merely because they are current source
  choices;
- revive the stale Rust-only/no-Python runtime direction;
- expose model/provider selection as normal-user product vocabulary;
- claim CUDA/model/provider readiness from static source alone.

## Next Step

Recover the **GPU acceleration, CPU fallback, and model/provider product policy**.

Specifically:

1. decide whether NVIDIA/CUDA is a required platform constraint or the preferred
   acceleration path for the initial Windows target;
2. define what CPU fallback must guarantee for standalone text and for meeting
   voice;
3. decide how the product should behave when CPU fallback cannot meet the
   benchmark-derived Realtime threshold;
4. decide whether current ASR/translation/TTS model/provider names are durable
   product requirements or replaceable implementation defaults;
5. preserve the approved local-first rule and prohibit silent cloud fallback;
6. define which acceleration/provider details belong in normal-user readiness
   versus developer diagnostics.

Do **not** create `02-product-requirements.md` until this slice is approved.
Do **not** change runtime/source while recovering this requirement.

## Completion Boundary For This Step

This slice is complete when acceleration preference, CPU degraded behavior,
provider/model ownership, local fallback rules, and user-visible readiness
semantics are explicitly approved with target-PC evidence requirements separated
from source/config presence.
