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

`CONTEXT_RECOVERY_PLATFORM_AND_RUNTIME_LOCALITY`

The primary product purpose has been recovered, approved, and captured in the
first durable foundation owner. The next requirement slice must establish where
the application is intended to run and whether core translation behavior remains
local-first.

## Completed Boundary

Completed on `New`:

- branch `New` created from `V1-Advance` baseline commit
  `6fd3485d6b22b9e3f44abc640241532aea61c3c7`;
- root `AGENTS.md` established as working/routing/evidence authority;
- root `CONTEXT.md` established as compact stable recovery context;
- `.agents/skills/development-brief/SKILL.md` established as the only current
  repository-specific Developing front door;
- primary product direction revalidated as real-time voice translation for
  online meetings;
- standalone text translation retained as the secondary/fallback workflow;
- `docs/foundation/01-product-overview.md` established as the durable owner for
  that approved product purpose;
- no inherited application/runtime source has been changed by bootstrap or
  product recovery work.

## Approved Product Direction

```text
PRIMARY
Real-time voice translation for online meetings

SECONDARY / STANDALONE
Text translation usable independently of voice readiness
```

High-level intended product flow:

```text
speech input
-> transcription
-> translation
-> translated voice output
-> meeting use
```

Current text-first UI is a stabilization/implementation posture, not a replacement
of this product direction.

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

## Holds

Until later recovery slices approve the relevant requirement, do not:

- resume inherited feature TODOs automatically;
- redesign the product/UI broadly;
- replace the Rust/Tauri + Python helper architecture without a grounded decision;
- create V2/V3/V4, a parallel engine, alternate launcher, or duplicate pipeline;
- mass-rewrite inherited `DevelopingData` documentation;
- treat Windows-only, local-only, language/model/provider, CUDA, latency, virtual
  microphone, Audio Studio, installer, or detailed audio behavior as current
  policy merely because inherited documents called them final/locked;
- create specialist project skills before a reusable semantic owner is proved;
- claim runtime/device/model/audio/release readiness from static source alone.

## Evidence State

Current recovery has established:

- current product purpose by explicit user decision;
- current high-level single-engine architecture baseline;
- current UI entrypoint and text-first stabilization shape;
- presence of voice/readiness/helper/audio/translation source structures;
- a durable product overview that intentionally leaves unresolved requirements
  outside its authority.

Material live behavior remains unverified unless separately proven.

## Next Step

Recover the **platform and runtime-locality boundary**.

Specifically:

1. inspect the smallest current source/config/build boundary for OS/platform
   assumptions;
2. inspect current helper/model/runtime code for local execution versus external
   network/cloud dependencies;
3. compare those findings with the inherited Windows-only and local-first
   requirements;
4. separate implementation constraints from actual product requirements;
5. present only the high-impact decisions that require current user approval.

Do **not** create `02-product-requirements.md` in the same recovery slice.
Do **not** change application source while recovering this requirement.

## Completion Boundary For This Step

This slice is complete when the intended initial platform and the policy for local
versus cloud-assisted core translation can be stated clearly, with current source
evidence separated from user-approved product policy.
