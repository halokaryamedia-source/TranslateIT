# TranslateIT Workspace Context

Status: context recovery in progress  
Working branch: `New`  
Recovery baseline: `V1-Advance` at `6fd3485d6b22b9e3f44abc640241532aea61c3c7`

This file stores only compact, durable facts that are sufficiently grounded for
new TranslateIT sessions. It is not a backlog, product requirements document,
implementation report, or reconstruction of old chat history.

During context recovery, inherited requirements and engineering reports remain
evidence until they are revalidated against current source and current product
intent.

## Current Working Posture

- `New` is the current working branch for recovering, reconciling, and continuing
  TranslateIT.
- `V1-Advance` is the inherited source baseline for this recovery effort.
- The repository default branch is not changed by this bootstrap work.
- Broad feature development, redesign, architecture replacement, and old TODO
  execution are intentionally deferred until enough project context is recovered.
- When old documentation conflicts with current user intent or current source,
  resolve the conflict explicitly rather than silently preserving the old rule.

## Recovered Product Direction

Current product direction was revalidated by the user on 2026-08-08:

- TranslateIT remains primarily a **real-time voice translation application for
  online meetings**.
- The intended primary product flow is speech input -> transcription ->
  translation -> translated voice output for use in a meeting context.
- Text translation remains a supported standalone workflow and should remain
  usable even when the voice pipeline is not ready.
- The current text-first `SimpleLauncherController` UI is treated as the present
  stabilization/usable workflow, not as evidence that the meeting-translation
  product purpose was intentionally replaced.
- Voice functionality is part of the product direction, but current source
  presence does not prove end-to-end voice readiness.

## Recovered Platform And Runtime Policy

Current platform/runtime policy was revalidated by the user on 2026-08-08:

- **Initial supported platform: Windows.** Windows is the only platform that must
  be supported and validated for the first product release target. This does not
  declare that TranslateIT must remain Windows-only forever.
- **Core runtime: local-first and offline-capable.** Once required runtime/model
  assets are installed, core ASR -> translation -> TTS behavior must not require
  a cloud translation/speech API for normal operation.
- Network access may still be used for setup, dependency/model acquisition, or a
  future explicitly approved optional cloud feature.
- A future cloud-assisted capability must remain optional and must not silently
  become a required dependency of the core meeting/text translation workflow.

## Recovered Language And Voice Direction Policy

Current launch language/voice direction was revalidated by the user on
2026-08-08:

- **Initial supported languages:** Indonesian and English only.
- **Text translation:** bidirectional Indonesian <-> English.
- **Primary outbound meeting voice:** Indonesian speech -> Indonesian transcript
  -> English translation -> English TTS/output for meeting use.
- **Primary inbound meeting assistance:** English speech -> English transcript ->
  Indonesian translation -> Indonesian text for the local user.
- **English speech -> Indonesian TTS is not an initial product requirement.** It
  may be added later if there is a real product need.
- Additional languages are future scope and must not be generalized into the
  initial product merely because a model can technically support more languages.

Current source is aligned with the launch pair at the UI level. The implementation
is currently asymmetric: realtime translation is optimized for ID -> EN, while
Quality/NLLB can cover the reverse direction; current local TTS evidence is also
English-oriented. Those are implementation/runtime facts, not permission to
change the approved product directions above.

## Recovered Voice Input And Segmentation Policy

Current voice input/segmentation behavior was revalidated by the user on
2026-08-08:

- **Primary input interaction: Session Listening.** The application does not
  listen merely because it is open. The user explicitly starts a voice session
  once; while that session is active TranslateIT continuously listens and uses
  speech detection to create utterance boundaries until the user explicitly
  stops the voice session.
- **Secondary input interaction: Push to Talk.** This remains an alternative for
  deliberate/manual capture.
- **Default Push-to-Talk hotkey: `Ctrl+Space`.** Avoid plain Space because it
  conflicts with normal typing and common UI interaction.
- **Speech segmentation is semantic, not a fixed timer contract.** TranslateIT
  should detect a meaningful natural pause, avoid cutting active words/speech
  unnecessarily, begin processing quickly after a valid utterance boundary, and
  handle longer speech without losing content.
- Inherited `700 ms` silence and `12 s` maximum segment values are **not permanent
  product requirements**.
- Silence duration, minimum speech duration, pre-roll, chunk sizes, maximum
  segment duration, VAD thresholds, and related numeric values are implementation
  parameters that must be tuned with target-PC latency/quality evidence.

This resolves the old `always-listening`/`Hold Space` contract versus the current
Click Toggle/`Ctrl+Space` UI conflict. Current VAD numeric profiles remain source
experiments/implementation evidence until runtime validation proves appropriate
values.

## Verified Repository Areas

```text
TranslateIT/
├─ EngineData/
├─ DevelopingData/
├─ UserData/
├─ AGENTS.md
├─ CONTEXT.md
└─ README.md
```

### `EngineData/`

Current production/runtime source area inherited from `V1-Advance`.

The currently supported single-engine architecture evidence points to:

```text
user-facing desktop shell
→ EngineData/Frontend/RustApp
→ Rust/Tauri

internal helper runtime
→ EngineData/Backend/LocalWorker/WorkerRuntime
→ Python

runtime contracts
→ EngineData/Backend/RuntimeContracts
```

These paths exist in `New` and are the current starting points for recovery.
Their presence does not by itself prove live runtime readiness.

### `DevelopingData/`

Development-only material. Existing repository guidance allows architecture and
migration plans, audits, reports, QA/validation notes, tooling helpers, and safe
samples here. It must not be treated as production source.

Current inherited engineering documentation is extensive and may contain active,
historical, superseded, planned, or partially implemented material. Do not read
all of it during normal boot.

### `UserData/`

Local runtime/user-data area. Current repository guidance assigns:

```text
UserData/CacheData/    → disposable runtime/session cache
UserData/LogData/      → logs, diagnostics, validation evidence
UserData/SavedProject/ → user-approved saved project/session outputs
```

Do not place engine source or project documentation under `UserData/`.

## Current Architecture Baseline

The strongest inherited architecture evidence currently agrees on one active
runtime shape:

```text
Rust/Tauri desktop shell
+
Python helper runtime
```

For recovery purposes:

- Rust/Tauri is the current user-facing shell candidate and active source path;
- Python is an internal helper runtime, not a second product shell;
- do not create a V2/V3/V4, legacy revival, alternative launcher, or parallel
  engine without a new explicit product/architecture decision;
- inactive DesignIT/FigmaDesignExport material must not silently become an active
  runtime dependency;
- source implementation and live runtime proof remain different claims.

## Current UI/Implementation Shape

Current `New` frontend entrypoint instantiates `SimpleLauncherController`.
The present UI explicitly treats text translation as the main immediately usable
workflow and voice as setup-gated/secondary until its runtime dependencies are
ready.

This describes current implementation shape only. Product priority is governed by
the recovered product direction above: meeting voice translation remains primary,
while text translation remains an independently useful fallback/secondary flow.

## Current Evidence Boundary

Inherited status documentation says the application was not release-ready at the
end of the `V1-Advance` phase and still required substantial local/runtime proof.
Treat that as recovery evidence, not as a current percentage or exact readiness
score.

Do not carry forward the old `38%` readiness estimate as a current fact.

Until deliberate validation occurs, do not claim current-project proof for:

- target-PC application readiness;
- successful end-to-end microphone capture;
- local ASR/model readiness;
- local translation-model readiness;
- TTS/provider quality;
- virtual microphone routing;
- end-to-end low-latency meeting translation;
- installer readiness;
- CUDA behavior on the target machine;
- save/persistence behavior beyond what current source and direct proof establish.

Use the evidence labels defined by `AGENTS.md` when these distinctions matter.

## Inherited Product Claims Requiring Revalidation

The following were explicit requirements or policies in `V1-Advance`, but they
are **not yet durable `New` foundation facts**. Revalidate them before making them
new permanent policy:

- NVIDIA CUDA-first acceleration with mandatory CPU fallback;
- ≤1 second desired post-speech translated-audio latency target;
- built-in virtual microphone requirement;
- 50% headphone monitoring behavior;
- mute-original-microphone behavior;
- specific ASR/translation/TTS model and provider choices;
- Quality/Fast runtime modes;
- Auto/Formal/Casual tone modes;
- document, history, and Audio Studio scope beyond the now-confirmed text
  translation secondary workflow;
- installer/distribution details including `TranslateIT.setup.exe`;
- normal-user versus developer/diagnostic UI exposure.

A recovered claim may later become foundation policy, be adjusted, or be
superseded. Do not preserve it solely because an old requirements file calls it
"final" or "locked".

## Stable Recovery Principles

- Recover context from repository evidence before asking the user to remember old
  implementation history.
- Current user intent may intentionally change an inherited product decision.
- Current source tells us what exists; it does not automatically tell us what the
  product should continue to require.
- Old documentation can explain why something exists, but it does not override a
  newer explicit decision.
- Do not delete or rewrite historical evidence merely because it is no longer
  current.
- Do not turn recovery into a broad refactor.
- Prefer one active product/runtime direction and one canonical owner per
  responsibility.
- Unknowns remain unknown until resolved; do not fill missing context with
  plausible defaults.

## Canonical Terms During Recovery

Use these terms consistently unless a later glossary decision replaces them:

- **Working branch** — `New`, where recovery and future development continue.
- **Recovery baseline** — inherited `V1-Advance` source at the branch point.
- **Primary use case** — real-time voice translation for online meetings.
- **Secondary text workflow** — standalone local text translation that remains
  useful independently of voice readiness.
- **Initial supported platform** — Windows for the first release target; other
  platforms are not current scope but are not permanently prohibited.
- **Local-first core** — core ASR, translation, and TTS can run without required
  cloud APIs after runtime assets are installed.
- **Launch language pair** — Indonesian and English.
- **Outbound meeting voice** — Indonesian speech translated into English voice.
- **Inbound meeting assistance** — English speech translated into Indonesian text.
- **Session Listening** — explicit user-started voice session with continuous
  listening/VAD until the user stops the session.
- **Push to Talk** — secondary manual capture interaction; default hotkey
  `Ctrl+Space`.
- **Segmentation parameters** — numeric VAD/silence/chunk/segment values that are
  implementation tuning, not fixed product constants.
- **Desktop shell** — the user-facing Rust/Tauri application under
  `EngineData/Frontend/RustApp`.
- **Helper runtime** — internal Python runtime under
  `EngineData/Backend/LocalWorker/WorkerRuntime`.
- **Runtime contract** — machine-readable runtime/architecture contract under
  `EngineData/Backend/RuntimeContracts`; evidence of intended/current contracts,
  not automatic live proof.
- **Inherited documentation** — pre-`New` project docs carried from
  `V1-Advance`; recovery evidence until classified/revalidated.
- **Current source** — source present on `New` for the boundary being inspected.
- **Current proof** — evidence actually obtained for the claim in the relevant
  environment/channel.

## Do Not Store Here

Do not use `CONTEXT.md` for current task status, detailed implementation plans,
backlogs, source maps, test logs, long audits, historical narratives, temporary
assumptions, or copied product requirements.

The active continuation owner is `docs/knowledge/next-action.md`.