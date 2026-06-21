# TranslateIT Figma Design Export

Status: development/design tooling only.

Public plugin version: `Version 0.1 - Alpha`

## Current Purpose

This folder contains the TranslateIT Figma website import workflow.

The current supported workflow is strict V5 only:

```txt
Website URL
-> RenderBridge strict V5 enhanced structured model
-> Figma plugin strict V5 renderer
-> editable source-inspired UI clone
-> locked screenshot reference
```

This workflow is not a raw DOM layer dump and not a screenshot-only import.

## Single Active Engine Rule

Only one engine should be used for current testing:

```txt
RenderBridge/start-alpha-v5.mjs
```

Only one Figma renderer should be active:

```txt
plugin/code.v5.strict.js
```

The default manifest must point to:

```txt
plugin/manifest.json -> main: code.v5.strict.js
```

Legacy and non-strict entrypoints are intentionally disabled or aliased to the strict V5 engine.

## Required Payload Contract

The plugin must only import payloads that include:

```txt
publicVersion: Version 0.1 - Alpha
structuredLayout: present
adapter: V5 enhanced structured adapter
diagnostics.v5Enhanced: true
structuredLayout.visualProfile.template: source-inspired-editorial
```

If this contract is missing, the UI and renderer must stop instead of producing a broken Figma output.

## Folder Structure

```txt
DevelopingData/FigmaDesignExport/TranslateIT/
├─ README.md
├─ RenderBridge/
│  ├─ start-alpha-v5.mjs
│  ├─ start-alpha-v5-gated.ps1
│  ├─ audit-alpha-v5-single-engine.mjs
│  ├─ audit-alpha-v5-default.mjs
│  ├─ audit-alpha-v5-media.mjs
│  ├─ audit-alpha-v5-model.mjs
│  └─ audit-alpha-v5-model-strict.mjs
└─ plugin/
   ├─ manifest.json
   ├─ manifest.v5.json
   ├─ code.v5.strict.js
   ├─ code.js          # disabled legacy guard
   ├─ code.v5.js       # disabled non-strict guard
   └─ ui.html
```

## Preflight Before Any Visual Test

Run the strict gate before opening Figma for visual review:

```powershell
cd RenderBridge
.\start-alpha-v5-gated.ps1 https://www.mivubi.com/
```

The gate must pass these checks:

```txt
single active engine
strict V5 default wiring
strict V5 enhanced media capture
structured model quality
strict model contract
```

## Important Rules

- Do not run older V4/V7/V11 bridge launchers for current testing.
- Do not import into Figma if the strict V5 gate fails.
- Do not accept raw layer dump output as a valid result.
- Do not use `code.js` or `code.v5.js` as active plugin main files.
- Keep public version text exactly `Version 0.1 - Alpha`.
