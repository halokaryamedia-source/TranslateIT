# Next Action

Updated: 2026-08-09  
Working branch: `New`  
Status: Repository root/design/tooling/frontend-shell ownership aligned; source-side development continues before local acceptance

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
EngineData Frontend Source Reachability Alignment — active shell pass
GitHub README refresh
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

## Frontend Reachability Result

Current HTML/build entrypoints are:

```text
index.html
├─ src/main.ts
│  -> SimpleLauncherController
│  -> current shell/settings/result/startup helpers
│
└─ src/audioStudioEntry.ts
   -> Audio Studio theme entry
   -> Audio Studio binding stubs retained because they are still explicitly loaded
```

The primary active-shell `src/app/active-launcher` boundary now retains only helpers with a current production caller:

```text
audioStudioAdvancedBinding.ts
audioStudioBinding.ts
chatViews.ts
dom.ts
launcherAttachmentRules.ts
launcherDeveloperLog.ts
launcherDeveloperSettings.ts
launcherLanguageRules.ts
launcherSettingsActions.ts
launcherSettingsRenderer.ts
launcherTextRules.ts
lockedReferenceShellParts.ts
settingsViews.ts
shell.ts
startupDiagnostics.ts
uiPageFactory.ts
windowRescue.ts
```

Removed from current product source were the unreachable parallel `LauncherController` path and its legacy binding/watch/route/preview/controller helpers, including the unmounted virtual-route selection surface. Historical Git commits remain provenance; dead source was not moved into `DevelopingData` as a second archive.

`dom.ts` no longer owns the obsolete `bindUi()` selector map. Current settings rendering accepts only the `settingsContent` boundary it actually needs.

Current validation was reconciled with the product graph:

- translation-flow validation no longer requires a disabled preview-translation stub;
- virtual-route validation now checks current engine/provider/product-readiness ownership and no longer depends on retired frontend route-selection bindings or `DevelopingData` notes;
- the redundant legacy action-binding diagnostic report was removed from the current auto-test/contract-report graph.

The Audio Studio binding pair was **not** removed because caller inspection found `index.html -> audioStudioEntry.ts` still loads them. Their actual product completeness remains a separate Audio Studio concern; this reachability pass does not promote them to a completed feature.

## Structural Alignment Already Completed

- current root/EngineData/UserData/DevelopingData documentation states the current ownership contract;
- current runtime discovery uses `EngineData + UserData` and does not inspect `DevelopingData`;
- developer/source-validation reports use ignored `.tmp/validation/` rather than `UserData`;
- historical V1/V1-Pull automation, Figma/standalone Preview ownership, and orphan RustApp tooling are no longer current `New` infrastructure;
- current production UI source remains caller-driven even when retained filenames contain inherited terms such as `reference`.

## Proof State

**CURRENT-PROJECT VERIFIED** at static repository level:

- `index.html` identifies the two frontend build entrypoints;
- `main.ts` starts only `SimpleLauncherController`;
- retained active-launcher files have a current caller from either the primary shell graph or the explicit Audio Studio entry;
- the removed legacy frontend path was not imported by the current primary product entrypoint/controller;
- source validators/reports were reconciled so they no longer keep retired UI source alive as a validation dependency;
- current virtual-route source validation no longer reads historical `DevelopingData` material.

**LOCAL PROOF REQUIRED** remains deferred for rendered desktop behavior, Windows runtime readiness, device/audio/model behavior, and clean installed package behavior. The local acceptance phase remains intentionally later.

## Hold

- Do not recreate a parallel launcher/controller/binding stack without a new explicit architecture decision.
- Do not keep inactive source merely because a validator can reference it; validators follow canonical product source ownership.
- Do not delete a source merely because it is outside `main.ts`; HTML/build entrypoints and other current callers must also be checked.
- Do not use `UserData` for developer/source-validation output.
- Do not revive historical `DevelopingData` files as current source or policy.
- Do not start the local acceptance phase yet unless the user changes the phase order.

## Next Step

Continue bounded **frontend bridge/shared reachability classification** from `SimpleLauncherController -> runtimeProductFacade/runtimeApi -> direct bridge/shared imports`, while also respecting explicit HTML/build entrypoints: identify orphan bridge APIs, legacy compatibility surfaces, and shared contracts that no longer have a current product/runtime consumer, then remove/reconcile only the proven inactive ownership without changing current product behavior.
