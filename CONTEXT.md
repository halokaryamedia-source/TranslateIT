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

This decision resolves the previous ambiguity between the inherited
meeting-translator requirement and the current text-first UI presentation.
Detailed meeting/audio behavior still requires separate recovery and proof.

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

This policy matches the current Windows-oriented Tauri/NSIS, Windows audio/TTS
support, local RuntimeAssets model paths, and local-only model loading observed
in the inherited source, while avoiding an unnecessary permanent ban on future
platforms or optional cloud features.

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

This architecture baseline may be refined during recovery, but replacing it
requires evidence of a current product need rather than preference for a new
stack.

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

- Indonesian ↔ English initial language scope;
- Indonesian speech → English TTS as the initial voice direction;
- NVIDIA CUDA-first acceleration with mandatory CPU fallback;
- Always-listening default and Push-to-talk secondary;
- `Hold Space` as the push-to-talk default;
- 700 ms silence segmentation threshold;
- 12 second maximum speech segment;
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

Do not use `CONTEXT.md` for:

- current active task status;
- step-by-step implementation plans;
- backlog or roadmap;
- detailed source ownership maps;
- test logs;
- long audit findings;
- historical decision narratives;
- temporary assumptions;
- copied product requirements.

Those responsibilities will get their own canonical owners only when needed.

## Next Context Owner

The active continuation owner is:

```text
docs/knowledge/next-action.md
```

It should hold the single active recovery goal, current state, explicit holds,
and exactly one next step. It must not duplicate this stable context file.
