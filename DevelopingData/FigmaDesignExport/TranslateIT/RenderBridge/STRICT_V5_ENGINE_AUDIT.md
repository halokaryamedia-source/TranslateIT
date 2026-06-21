# Strict V5 Engine Audit

Public version must remain:

```txt
Version 0.1 - Alpha
```

## User Requirement

The current requirement is to avoid multiple engines and prevent legacy paths from producing broken Figma output.

Target policy:

```txt
one active bridge engine
one active plugin renderer
strict payload contract
legacy paths disabled or redirected
no visual test until final readiness gate passes
```

## Active Engine

Active bridge:

```txt
RenderBridge/start-alpha-v5.mjs
```

Active renderer:

```txt
plugin/code.v5.strict.js
```

Expected engine build:

```txt
strict-v5.1-single-engine
```

Default plugin manifest:

```txt
plugin/manifest.json -> code.v5.strict.js
```

Alternate V5 manifest:

```txt
plugin/manifest.v5.json -> code.v5.strict.js
```

## Payload Contract

A valid import payload must include:

```txt
publicVersion: Version 0.1 - Alpha
adapter contains: v5
adapter contains: enhanced
strictV5Engine: true
engineBuild: strict-v5.1-single-engine
diagnostics.v5Enhanced: true
diagnostics.strictV5Engine: true
diagnostics.engineBuild: strict-v5.1-single-engine
structuredLayout: present
structuredLayout.visualProfile.template: source-inspired-editorial
```

The plugin UI and renderer reject payloads that do not match this contract.

## Legacy Cleanup Status

```txt
plugin/code.js             disabled guard
plugin/code.v5.js          disabled guard
RenderBridge/server.mjs    alias to start-alpha-v5.mjs
start-alpha-fixed.mjs      alias to start-alpha-v5.mjs
npm start                  points to start-alpha-v5.mjs
session launcher           points to start-alpha-v5.mjs
background launcher        points to start-alpha-v5.mjs
auto installer             requires strict V5 enhanced health
```

## Active Plugin Functions

```txt
Import Website             supported
Render editable clone      supported
Locked screenshot ref      supported
Export Data JSON           supported
Reject stale engine        supported
Reject legacy payload      supported
```

## Internal Template Exception

This file may still exist and is allowed:

```txt
RenderBridge/server.alpha.v4.structured.mjs
```

Reason:

```txt
It is used as an internal source template by the V5 generator.
It is not the default active engine.
The active launcher regenerates the V5 enhanced structured bridge from it.
```

## Required Gate

Before visual testing, run:

```powershell
.\start-alpha-v5-gated.ps1 https://www.mivubi.com/
```

This runs:

```txt
audit-alpha-v5-plugin-syntax.mjs
audit-alpha-v5-single-engine.mjs
audit-alpha-v5-default.mjs
audit-alpha-v5-media.mjs
audit-alpha-v5-model.mjs
audit-alpha-v5-model-strict.mjs
audit-alpha-v5-final-readiness.mjs
```

## Final Readiness Criteria

The last report must show:

```txt
gate: alpha-v5-final-readiness
status: pass
readyForFigmaTest: true
expectedBuild: strict-v5.1-single-engine
```

If `readyForFigmaTest` is false, do not test in Figma yet. Fix the listed failures first.

## Realization Assessment

Can be realized now:

```txt
single active default engine
strict V5.1 payload validation
legacy plugin renderer prevention
source-inspired editable website clone
locked screenshot reference
export data JSON
preflight gate before Figma testing
```

Cannot be honestly guaranteed as automatic for every website:

```txt
pixel-perfect Figma reconstruction
perfect extraction of canvas/WebGL/video/iframe content
perfect layout for sites with heavy custom animation or hidden authenticated content
```

Current realistic target:

```txt
clean editable source-inspired clone with captured source screenshot reference
```

Testing should only begin after the final readiness gate passes.
