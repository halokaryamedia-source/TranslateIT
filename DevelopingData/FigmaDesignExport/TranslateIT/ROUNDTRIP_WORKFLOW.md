# TranslateIT Figma Roundtrip Workflow

This document explains how to protect TranslateIT UI work when moving between HTML, Figma, exported UI Build Package JSON, generated frontend, and app runtime.

## Goal

Avoid these problems:

- Figma edits are lost because they were not recorded back to repo files.
- Exported packages accidentally remove backend actions.
- Component names drift between exports.
- Icons or bindings disappear without review.
- Generated frontend overwrites runtime UI too early.

## Safe Workflow

```txt
Single HTML package
        ↓
validate-single-html-package.mjs
        ↓
Figma plugin import
        ↓
Figma visual review/edit
        ↓
Export UI Build Package JSON
        ↓
validate-ui-build-package.mjs
        ↓
check-component-contract.mjs
        ↓
check-roundtrip-risk.mjs
        ↓
create-ui-package-snapshot.mjs
        ↓
diff-ui-build-packages.mjs against previous approved package
        ↓
run-ui-sync-gate.mjs
        ↓
build-ui-package-to-frontend.mjs
        ↓
manual approval before runtime sync
```

## Snapshot Every Export

After each export, save it as:

```txt
BuildPackage/ui-build-package.json
```

Then run:

```powershell
node .\tools\create-ui-package-snapshot.mjs .\ui-build-package.json .\Snapshots
```

This creates:

```txt
Snapshots/<timestamp>-<source>-<hash>.json
Snapshots/<timestamp>-<source>-<hash>.manifest.json
```

The manifest stores:

- package hash;
- quality metadata;
- source import name;
- count of screens;
- count of components;
- count of backend bindings;
- count of icons;
- count of color tokens.

## Compare Exports

When a newer export exists, compare it against the previous approved snapshot:

```powershell
node .\tools\diff-ui-build-packages.mjs .\Snapshots\old.json .\ui-build-package.json .\ui-package-diff-report.md
```

Review the report before codegen or runtime sync.

Important sections:

- Added Components;
- Removed Components;
- Changed Components;
- Added Bindings;
- Removed Bindings;
- Changed Bindings;
- Added Icons;
- Removed Icons;
- Changed Icons;
- Added/Removed Color Tokens.

## Roundtrip Risk Check

Run:

```powershell
node .\tools\check-roundtrip-risk.mjs .\ui-build-package.json
```

This checks for:

- design-only section leakage;
- weak or missing stable names;
- weak source metadata;
- repeated actions;
- missing quality metadata;
- blocked readiness;
- low readiness score;
- missing backend bindings;
- missing component entries.

Warnings do not always mean failure. They mean human review is required.

## Rules Before Runtime Sync

Do not sync when:

- readiness is `BLOCKED`;
- readiness score is below 70;
- removed components are unexplained;
- removed bindings are unexplained;
- removed icons are unexplained;
- action bindings lost `data-backend`;
- generated tree contains `Component Preview`, `Import Report`, or `Archive`;
- package cannot pass `run-ui-sync-gate.mjs`.

## Recommended Approval Order

```txt
1. HTML validation pass
2. Figma export package validation pass
3. Component contract check pass or reviewed warnings
4. Roundtrip risk check pass or reviewed warnings
5. Diff report reviewed
6. Sync gate pass
7. Generated frontend reviewed
8. Runtime mapping approved
```

## Source of Truth Rule

Figma may be used for visual editing and handoff, but final reusable UI decisions must be recorded back into repo-managed source files:

- HTML package source;
- component contract;
- UI Build Package snapshot;
- generated report;
- frontend integration adapter.

Do not rely on untracked Figma-only edits as the only source of truth.
