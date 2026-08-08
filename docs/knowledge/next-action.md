# Next Action

Updated: 2026-08-08
Status: active task snapshot
Working branch: `New`

This note is the single active-task resume point for TranslateIT. New sessions should read:

`AGENTS.md` -> `CONTEXT.md` -> this note

Do not reconstruct project history here. Stable facts belong in `CONTEXT.md`; durable product/system policy will belong in `docs/foundation/` after recovery; historical evidence remains in inherited reports/reviews until classified.

## Active Goal

Recover and reconcile enough TranslateIT context to resume development without relying on forgotten chat history, stale assumptions, or unverified old requirements.

## Current Phase

`BOOTSTRAP_WORKFLOW_SETUP`

The `New` branch was created from the `V1-Advance` recovery baseline. The first repository-owned working rules are now being established before product recovery and feature development continue.

## Completed Bootstrap Boundary

Completed on `New`:

- branch `New` created directly from `V1-Advance` baseline commit `6fd3485d6b22b9e3f44abc640241532aea61c3c7`;
- root `AGENTS.md` created as the agent-behavior, context-recovery, anti-slop, routing, and proof authority;
- root `CONTEXT.md` created with compact verified repository/architecture facts and an explicit list of inherited product claims requiring revalidation;
- no runtime/source implementation has been changed by the bootstrap work.

## Current Recovery Baseline

The strongest currently retained architecture evidence is:

```text
user-facing desktop shell
-> EngineData/Frontend/RustApp
-> Rust/Tauri

internal helper runtime
-> EngineData/Backend/LocalWorker/WorkerRuntime
-> Python
```

This is a recovery baseline, not a claim that the live application is currently verified or release-ready.

## Holds

Until context recovery reaches the relevant owner, do not:

- resume inherited feature TODOs automatically;
- redesign the product or UI broadly;
- replace the Rust/Tauri + Python helper architecture without a new grounded architecture decision;
- create V2/V3/V4, a parallel engine, alternative launcher, or duplicate runtime pipeline;
- delete or mass-rewrite inherited `DevelopingData` documentation;
- promote inherited product claims such as model choices, latency targets, language scope, virtual microphone behavior, Audio Studio scope, or installer details into new permanent policy without revalidation;
- create multiple specialist skills merely because several technologies appear in the repository;
- claim local runtime, model, audio, CUDA, virtual-device, installer, or end-to-end readiness from static source inspection alone.

## Evidence State

Current bootstrap evidence establishes repository structure, inherited source paths, branch ancestry, and the presence of the documented single-engine architecture contract.

Material live behavior remains unverified unless separately proven. Use `AGENTS.md` evidence labels, including `LOCAL PROOF REQUIRED` and `UNKNOWN`, rather than inferring readiness.

## Recovery Method

When recovery begins after bootstrap:

1. inspect the smallest relevant current source boundary;
2. inspect the closest inherited documentation/contracts only when needed;
3. separate current implementation, historical intent, unfinished plan, stale assumption, and unknown;
4. ask the user only about unresolved decisions that materially affect current product direction;
5. record stable results in the correct canonical owner instead of accumulating another general report.

## Next Step

Create the repository-wide bootstrap skill:

```text
.agents/skills/development-brief/SKILL.md
```

The skill should become the single front door for non-trivial Developing work. It must establish the real goal, distinguish user outcome from a suggested technical method, identify current authority/evidence, define minimal scope and acceptance criteria, choose the execution/proof boundary, and allow `No development required` as a valid result.

Do not create any specialist TranslateIT skill in the same step.

## Completion Boundary For This Step

This active step is complete when `development-brief` exists, is intentionally small, is aligned with root `AGENTS.md`, and no unrelated source/docs changes are introduced.