# Next Action

Updated: 2026-08-09  
Working branch: `New`  
Status: Repository data boundaries and obsolete design-review ownership aligned; source-side development continues before local acceptance

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

## Completed Root/Runtime Alignment

- root/EngineData/UserData/DevelopingData documentation states the current ownership contract;
- historical `DevelopingData/Documentation/Source` and old `RootFileRules.md` are explicitly superseded;
- current source validation no longer depends on inherited V1-Advance CI-scope policy;
- V1/V1-Pull sync/task automation and branch-specific workflows were removed from `New`;
- active developer/source-validation report paths use ignored `.tmp/validation/RuntimeTestReports` instead of `UserData`;
- `ProjectPaths` runtime discovery uses `EngineData + UserData` only and does not inspect `DevelopingData`.

## Completed Design/Reference Alignment

The obsolete standalone design-review chain is no longer a current EngineData authority:

```text
RustApp/Preview
RustApp/DesignPreview
RustApp/docs/ui-reference
RustApp/page-template.md
RustApp/ui-reference.md
RustApp/src/design-system   # old v28/Figma registry/export/plugin/workflow
```

Associated stale design-review scripts that depended on the old locked-reference approval flow were removed as part of the same boundary cleanup.

Reasoning/evidence:

- the user explicitly confirmed Figma Design is no longer used;
- `DesignPreview` identified itself as V1-Pull design-review source only;
- `Preview` identified itself as separate preview-only HTML/CSS/SVG review;
- old design-system tokens/registries were tied to Main Page v28 and Figma handoff;
- old UI approval/reference reports were tied to that baseline and still wrote developer evidence into `UserData`;
- current `src/main.ts` directly imports production CSS and starts `SimpleLauncherController`.

Active runtime files are preserved based on callers rather than naming. In particular, files such as `referenceLayout.css` and `lockedReferenceShellParts.ts` remain current because production imports/contracts still use them.

## Proof State

**CURRENT-PROJECT VERIFIED** at static repository level:

- current production entrypoint does not depend on standalone Preview/DesignPreview/Figma assets;
- current active source validators bind the product shell directly to production source rather than the retired Figma/reference package;
- runtime source is explicitly prohibited from importing Preview-only files;
- the obsolete design-review source carried historical V1-Pull/v28 ownership and is no longer kept as a competing current authority.

**LOCAL PROOF REQUIRED** remains deferred for rendered desktop behavior, Windows runtime readiness, device/audio/model behavior, and clean installed package behavior. The local phase is still intentionally later.

## Hold

- Do not recreate a Figma/export/standalone preview workflow without a new explicit product decision.
- Do not delete runtime source merely because filenames contain `reference`, `preview`, or inherited terminology; caller/contract evidence still controls.
- Do not revive historical DevelopingData files as current policy or validation inputs.
- Do not write developer/source-validation output into UserData.
- Do not start the local acceptance phase yet unless the user changes the phase order.

## Next Step

Continue bounded **EngineData tooling ownership classification**: inspect package-level scripts/diagnostics that are not part of current npm/source-contract profiles, determine which are genuine product/build tooling versus obsolete/local development utilities, and move/remove only the proven boundary violations without changing runtime behavior.
