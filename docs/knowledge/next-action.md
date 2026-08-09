# Next Action

Updated: 2026-08-09  
Working branch: `New`  
Status: Repository data-boundary first pass aligned; source-side development continues before local acceptance

This file is the single active continuation owner for TranslateIT.

## Resume

```text
AGENTS.md
-> CONTEXT.md
-> docs/knowledge/next-action.md
-> one relevant canonical owner/source only
```

## Current State

Completed source-side boundaries include:

```text
context/foundation/source recovery
development governance and skill architecture
Product Shell & Readiness source alignment
Repository Data Boundary Alignment — first bounded pass
```

Current architecture remains:

```text
Rust/Tauri desktop shell
+
Python helper runtime
```

## Root Data Boundary Result

Current canonical positioning is now explicit:

```text
EngineData
-> product implementation + production runtime assets/contracts

UserData
-> runtime/user-owned data only

DevelopingData
-> historical/recovery/reference development evidence only
```

Static corrections in the first pass:

- root/EngineData/UserData/DevelopingData READMEs now state the current ownership contract;
- historical `DevelopingData/Documentation/Source` and old `RootFileRules.md` are explicitly superseded rather than current source-of-truth;
- current `New` source validation no longer depends on the inherited V1-Advance CI-scope validator;
- inherited V1/V1-Pull sync/task automation and V1-specific GitHub workflows were removed from `New` while remaining available in historical branch history;
- current developer/source-validation report paths were moved from `UserData/LogData/RuntimeTestReports` to ignored `.tmp/validation/RuntimeTestReports` for the active auto-test, contract-report, and local Tauri compile entrypoints;
- `ProjectPaths` runtime discovery now uses `EngineData + UserData` only and no longer inspects `DevelopingData` even for informational state;
- stale per-task local-delete candidate artifacts were removed from current source.

## Scope Deliberately Preserved

This pass did **not** broad-move or delete ambiguous material such as:

```text
EngineData/Frontend/RustApp/Preview
EngineData/Frontend/RustApp/DesignPreview
EngineData/Frontend/RustApp/docs/ui-reference
Figma/design workflow sources
historical DevelopingData documents/plans/QA evidence
review-before-delete diagnostic scripts whose current ownership is not yet proven
```

Those items need their own bounded owner/caller check before any move/delete decision.

No product feature behavior, AI provider, audio pipeline, storage schema, or package architecture was redesigned by this structural pass.

## Proof State

**CURRENT-PROJECT VERIFIED** at static repository level:

- current root documentation distinguishes EngineData/UserData/DevelopingData ownership;
- current active npm source-contract profile no longer includes `validate:ci-scope`;
- the active auto-test registry no longer registers `ci-scope` and routes disposable developer output to `.tmp/validation`;
- active contract-report and local Tauri compile report entrypoints no longer use UserData as developer-report storage;
- current runtime root discovery does not inspect `DevelopingData`;
- branch-specific V1 workflow/sync automation removed in this pass is no longer current `New` infrastructure.

**LOCAL PROOF REQUIRED** remains deferred for claims that actually need it, including rendered desktop behavior, Windows runtime readiness, device/audio/model behavior, and clean installed package behavior. The local phase is still intentionally later.

## Hold

- Do not broad-delete/move remaining EngineData design/reference/tooling material without proving its current callers/ownership.
- Do not revive historical DevelopingData files as current policy or current validation inputs.
- Do not write developer/source-validation output into UserData.
- Do not start the local acceptance phase yet unless the user changes the current phase order.

## Next Step

Continue the bounded **EngineData ownership classification** for the remaining design/reference/tooling surfaces (such as `Preview`, `DesignPreview`, `docs/ui-reference`, and adjacent Figma/design workflow sources): determine which are current product/build dependencies versus historical/reference material, then correct only the proven boundary violations without broad reorganization.
