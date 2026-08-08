# Next Action

Updated: 2026-08-08
Status: active task snapshot
Working branch: `New`

This note is the single active-task resume point for TranslateIT. New sessions read:

`AGENTS.md` -> `CONTEXT.md` -> this note

Do not reconstruct project history here. Stable facts belong in `CONTEXT.md`;
durable product/system policy belongs in `docs/foundation/`; historical evidence
remains inherited evidence until classified.

## Active Goal

Recover and reconcile TranslateIT into a small current product foundation before
broad development resumes.

## Current Phase

`FOUNDATION_PRODUCT_OVERVIEW`

The bootstrap working system is established and the first high-impact product
purpose decision has been recovered and approved.

## Completed Boundary

Completed on `New`:

- branch `New` created from `V1-Advance` baseline commit
  `6fd3485d6b22b9e3f44abc640241532aea61c3c7`;
- root `AGENTS.md` established as agent behavior, context-recovery, anti-slop,
  routing, and proof authority;
- root `CONTEXT.md` established as compact stable recovery context;
- this `next-action.md` established as the single active-task resume point;
- `.agents/skills/development-brief/SKILL.md` established as the only current
  repository-specific Developing front door;
- no specialist TranslateIT skill has been created;
- no inherited runtime/source implementation has been changed by bootstrap or
  product-purpose recovery work.

## Recovered Product Direction

Approved current direction:

```text
PRIMARY
Real-time voice translation for online meetings

SECONDARY / STANDALONE
Text translation that remains usable independently of voice readiness
```

The intended larger product flow remains:

```text
speech input
-> transcription
-> translation
-> translated voice output
-> meeting use
```

Current source/UI presents text translation as the immediately usable main flow
and voice as setup-gated. Treat that as the current stabilization/implementation
shape, not as a replacement of the approved meeting-translator product purpose.

## Current Recovery Baseline

The strongest retained architecture evidence remains:

```text
user-facing desktop shell
-> EngineData/Frontend/RustApp
-> Rust/Tauri

internal helper runtime
-> EngineData/Backend/LocalWorker/WorkerRuntime
-> Python
```

Current frontend entrypoint instantiates `SimpleLauncherController`; older docs
that describe `active-launcher` as the direct UI controller must therefore be
reconciled before becoming current ownership documentation.

This is still static/source evidence, not a claim that the live application is
verified or release-ready.

## Holds

Until later recovery slices reach the relevant owner, do not:

- resume inherited feature TODOs automatically;
- redesign the product or UI broadly;
- replace the Rust/Tauri + Python helper architecture without a grounded current
  architecture decision;
- create V2/V3/V4, a parallel engine, alternative launcher, or duplicate runtime
  pipeline;
- delete or mass-rewrite inherited `DevelopingData` documentation;
- promote inherited platform, language, model, latency, virtual microphone,
  Audio Studio, installer, or detailed audio behavior into permanent policy
  without revalidation;
- create specialist project skills before a distinct reusable semantic owner is
  proved;
- claim local runtime, model, audio, CUDA, virtual-device, installer, or
  end-to-end readiness from static source inspection alone.

## Evidence State

Repository/source inspection confirms:

- `src/main.ts` starts `SimpleLauncherController`;
- current visible UI labels text translation as the main workflow and voice as
  setup-gated;
- current source still contains voice capture/readiness, microphone, helper,
  translation, and audio-runtime structures;
- current source restricts the visible language selector to Indonesian and
  English, but that language scope has not yet been reapproved as durable product
  policy.

The primary meeting-translator direction is now a current user decision and is
recorded in `CONTEXT.md`.

Material live behavior remains unverified unless separately proven.

## Next Step

Create the first durable product foundation owner:

```text
docs/foundation/01-product-overview.md
```

Keep it intentionally small. It should contain only:

1. what TranslateIT is;
2. the approved primary use case;
3. the secondary standalone text workflow;
4. the current single-engine architecture baseline at a high level;
5. the distinction between product direction, current implementation shape, and
   runtime proof;
6. explicit unresolved areas that require later recovery.

Do **not** copy the old V1-Advance PRD into this file.
Do **not** decide Windows-only, exact language scope, exact model/provider stack,
latency targets, virtual microphone behavior, Audio Studio scope, or installer
policy in the same step.

## Completion Boundary For This Step

This step is complete when `01-product-overview.md` exists as a concise durable
owner for the approved product purpose, without importing unresolved inherited
requirements or changing application source.
