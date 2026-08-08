# Next Action

Updated: 2026-08-08
Status: active task snapshot
Working branch: `New`

This note is the single active-task resume point for TranslateIT. New sessions read:

`AGENTS.md` -> `CONTEXT.md` -> this note

Do not reconstruct project history here. Stable facts belong in `CONTEXT.md`;
durable product/system policy will belong in `docs/foundation/` after recovery;
historical evidence remains inherited evidence until classified.

## Active Goal

Recover and reconcile enough TranslateIT context to resume development without
relying on forgotten chat history, stale assumptions, or unverified old
requirements.

## Current Phase

`CONTEXT_RECOVERY_PRODUCT_DIRECTION`

The minimal bootstrap working system is now established. Broad product
development remains deferred while the first product-direction context is
recovered.

## Completed Bootstrap Boundary

Completed on `New`:

- branch `New` created directly from `V1-Advance` baseline commit
  `6fd3485d6b22b9e3f44abc640241532aea61c3c7`;
- root `AGENTS.md` created as agent behavior, context-recovery, anti-slop,
  routing, and proof authority;
- root `CONTEXT.md` created with compact stable recovery facts and inherited
  product claims requiring revalidation;
- this `next-action.md` established as the single active-task resume point;
- `.agents/skills/development-brief/SKILL.md` created as the only current
  repository-specific Developing front door;
- no specialist TranslateIT skill has been created;
- no inherited runtime/source implementation has been changed by bootstrap work.

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

This is a recovery baseline, not a claim that the live application is currently
verified or release-ready.

## Holds

Until context recovery reaches the relevant owner, do not:

- resume inherited feature TODOs automatically;
- redesign the product or UI broadly;
- replace the Rust/Tauri + Python helper architecture without a grounded current
  architecture decision;
- create V2/V3/V4, a parallel engine, alternative launcher, or duplicate runtime
  pipeline;
- delete or mass-rewrite inherited `DevelopingData` documentation;
- promote inherited model choices, latency targets, language scope, virtual
  microphone behavior, Audio Studio scope, installer details, or similar old
  requirements into permanent `New` policy without revalidation;
- create specialist project skills before a distinct reusable semantic owner is
  proved;
- claim local runtime, model, audio, CUDA, virtual-device, installer, or
  end-to-end readiness from static source inspection alone.

## Evidence State

Bootstrap evidence establishes branch ancestry, repository structure, the
current recovery files, inherited source paths, and the presence of the
single-engine architecture contract.

Material live behavior remains unverified unless separately proven. Use root
`AGENTS.md` evidence labels rather than inferring readiness.

## Recovery Method

For each recovery slice:

1. identify one concrete product/system question;
2. inspect the smallest current source boundary that can inform it;
3. inspect the closest inherited requirement/contract/history only as needed;
4. separate current implementation, historical intent, unfinished plan, stale
   assumption, and unknown;
5. ask the user only about unresolved decisions that materially affect current
   product direction;
6. record only stable recovered results in the correct canonical owner.

Do not create a general recovery report per slice.

## Next Step

Recover the **current product purpose and primary use case** before creating
`docs/foundation/`.

Specifically:

1. inspect current `New` source/UI naming and the smallest relevant inherited
   product requirement/architecture evidence;
2. determine what the existing application is actually shaped to do today;
3. separate that from old intended features that may never have become real
   product behavior;
4. identify only the high-impact product-purpose choices that require current
   user revalidation;
5. present the recovered product-direction summary to the user for decision.

Do **not** create the product overview/foundation file in the same slice. The
purpose must be recovered and approved first.

## Completion Boundary For This Step

This recovery slice is complete when the current product purpose, primary user/use
case, and major scope boundary can be stated from evidence with remaining
high-impact uncertainties clearly separated for user revalidation.
