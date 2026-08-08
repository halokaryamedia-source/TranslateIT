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

`CONTEXT_RECOVERY_LATENCY_AND_RUNTIME_MODES`

Product purpose, platform/locality, language/voice direction, and voice
input/segmentation behavior are now recovered and approved. The next slice must
define what responsive meeting translation means and how Realtime/Quality modes
should behave at product level.

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

## Latency And Mode Evidence To Reconcile

Inherited V1-Advance product requirements wanted translated audio to begin within
about `<= 1 second` after the user finished speaking when realistically
achievable.

Current source contains a rebuilt latency meter that explicitly measures:

```text
speech end -> first translated voice event
ASR duration
translation duration
TTS duration
playback enqueue -> start
```

but it also declares historical latency metrics untrusted and does not establish
a verified target-PC release threshold.

Runtime/profile naming is also inconsistent:

- persisted Rust settings use `Realtime` and `Quality`;
- default persisted runtime profile is `Realtime`;
- current UI labels the latency-oriented option `Fast` and the other `Quality`;
- worker translation maps non-Quality behavior to the realtime Marian path and
  Quality to the NLLB path;
- current realtime translation path is optimized for ID -> EN, while EN -> ID may
  require Quality/fallback behavior.

Therefore old `<=1s`, old default `Quality`, current default `Realtime`, and
`Fast`/`Realtime` naming must not be silently treated as one coherent policy.

## Holds

Until later recovery slices approve the relevant requirement, do not:

- resume inherited feature TODOs automatically;
- change application/runtime source to match recovered policy yet;
- treat a `<=1s` latency target as verified or release-ready without target-PC
  evidence;
- expose model/provider names as user-facing runtime modes;
- create mode-specific parallel pipelines when one pipeline/profile boundary can
  own the behavior;
- treat CUDA, virtual microphone, Audio Studio, installer, or detailed output
  routing as approved merely because inherited docs called them final/locked;
- claim runtime/device/model/audio/release readiness from static source alone.

## Next Step

Recover the **latency objective and runtime-mode product policy**.

Specifically:

1. define the official user-relevant latency measurement boundary;
2. decide whether a numeric latency target should be a hard current requirement
   or a benchmark-derived release threshold;
3. reconcile `Fast` versus `Realtime` naming;
4. decide the default mode for the primary meeting workflow;
5. decide whether mode choice should be user-controlled, workflow-selected, or a
   combination of both;
6. keep model/provider selection as implementation detail rather than product
   vocabulary.

Do **not** create `02-product-requirements.md` until this slice is approved.
Do **not** change source while recovering this requirement.

## Completion Boundary For This Step

This slice is complete when latency measurement semantics, target-policy type,
runtime-mode names, default behavior, and user-control boundary are explicitly
approved with target-PC measurement requirements clearly separated from static
source evidence.
