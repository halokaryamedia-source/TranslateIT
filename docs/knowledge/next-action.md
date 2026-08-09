# Next Action

Updated: 2026-08-09  
Working branch: `New`  
Status: Repository root/design/tooling ownership aligned; source-side development continues before local acceptance

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
Repository Data Boundary Alignment — root/runtime pass
EngineData Design/Reference Ownership Alignment — Figma/preview pass
EngineData Tooling Ownership Alignment — RustApp scripts pass
```

Current architecture remains:

```text
Rust/Tauri desktop shell
+
Python helper runtime
```

## Canonical Data Boundaries

```text
EngineData
-> product implementation + production runtime assets/contracts

UserData
-> runtime/user-owned data only

DevelopingData
-> historical/recovery/reference development evidence only
```

## Completed Structural Alignment

- current root/EngineData/UserData/DevelopingData documentation states the current ownership contract;
- current runtime discovery uses `EngineData + UserData` and does not inspect `DevelopingData`;
- developer/source-validation reports use ignored `.tmp/validation/` rather than `UserData`;
- historical V1/V1-Pull branch automation and obsolete Figma/standalone Preview ownership are no longer current `New` infrastructure;
- current production UI source remains caller-driven even when inherited filenames contain terms such as `reference`.

## Tooling Ownership Result

`EngineData/Frontend/RustApp/scripts/` now follows this reachability contract:

```text
package.json
-> canonical developer/source-validation entrypoints

auto_test_registry.mjs
-> canonical registered test graph

reachable helper/fixture
-> direct dependency of one of the above
```

The scripts cleanup removed 35 orphan utilities/validators that were not reachable from the current tool graph. The removed chain included overlapping aggregate gates, V1/V1-Pull-era diagnostics, unused model setup/inventory experiments, one-off repair/audit scripts, and local report scripts that wrote developer evidence into `UserData`.

`run_worker_contract_report.mjs` was decoupled from obsolete local diagnostic scripts and now derives used worker-command evidence from current product source plus the current worker handlers/core contract.

`EngineData/Backend/LocalWorker/WorkerRuntime/README.md` was also reconciled because it still advertised retired npm profiles. The WorkerRuntime itself remains current; its remaining local helper scripts are not normal-user setup or current package entrypoints unless a later bounded local-AI/release task explicitly adopts them.

## Proof State

**CURRENT-PROJECT VERIFIED** at static repository level:

- package profiles and `auto_test_registry.mjs` identify the retained current validation graph;
- retained diagnostic helpers are directly referenced by that graph;
- the removed scripts had no current package/registry ownership and included concrete stale assumptions such as removed npm profiles, V1/V1-Pull gates, duplicate aggregate validation, or UserData-bound developer reports;
- current worker-contract diagnostics no longer treat orphan local-report scripts as product-contract input;
- LocalWorker documentation no longer instructs developers to use retired npm profiles.

**LOCAL PROOF REQUIRED** remains deferred for rendered desktop behavior, Windows runtime readiness, device/audio/model behavior, and clean installed package behavior. The local acceptance phase remains intentionally later.

## Hold

- Do not recreate orphan validation/model/repair scripts without a current owner and acceptance need.
- Do not use `UserData` for developer/source-validation output.
- Do not revive historical DevelopingData files as current source or policy.
- Do not start the local acceptance phase yet unless the user changes the phase order.

## Next Step

Continue bounded **EngineData frontend source reachability classification**: start from `src/main.ts` and `SimpleLauncherController`, map only direct production imports/callers into `src/app/active-launcher`, identify unreachable legacy controller/binding paths, and remove/reconcile only source proven inactive without changing current product behavior.
