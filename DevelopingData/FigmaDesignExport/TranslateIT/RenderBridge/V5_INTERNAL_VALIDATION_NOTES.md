# TranslateIT Version 0.1 - Alpha — Strict V5 Validation Notes

## Current direction

The old approach is rejected:

```txt
DOM raw layer dump -> Figma layer stack
```

It produced unacceptable results:

```txt
score: around 2/10
status: not usable
```

The active direction is now strict V5 only:

```txt
Website -> V5 enhanced structured site model -> strict source-inspired editable UI clone
```

## Default plugin wiring

The active manifest must point to:

```txt
plugin/code.v5.strict.js
```

Renderer expected in plugin status:

```txt
Alpha V5 strict source-inspired structured clone
```

Main output expected:

```txt
01 Source-Inspired Editable Clone / Main Output
```

## Required bridge

Use the V5 launcher only:

```txt
RenderBridge/start-alpha-v5.mjs
```

Preferred gated launcher:

```txt
RenderBridge/start-alpha-v5-gated.ps1
```

Do not use older V4/V7/V11 bridge launchers for current V5 testing.

Expected payload:

```txt
structuredLayout: present
adapter: translateit-alpha-v5-enhanced-structured-site-model
diagnostics.v5Enhanced: true
structuredLayout.visualProfile.template: source-inspired-editorial
```

The plugin UI and renderer now reject payloads without `diagnostics.v5Enhanced`.

## Internal gates before any visual test

Preferred one-command internal gate:

```txt
./start-alpha-v5-gated.ps1 https://www.mivubi.com/
```

Manual gates:

```txt
node audit-alpha-v5-default.mjs
node audit-alpha-v4-media.mjs https://www.mivubi.com/
node audit-alpha-v5-model.mjs https://www.mivubi.com/
node audit-alpha-v5-model-strict.mjs https://www.mivubi.com/
```

Required pass criteria:

```txt
manifest.json -> code.v5.strict.js
ui.html mentions strict V5 structured clone
ui.html requires diagnostics.v5Enhanced
renderer id is strict V5
main frame name is Source-Inspired Editable Clone
payload adapter is V5 enhanced structured
payload has diagnostics.v5Enhanced true
payload has structuredLayout
payload has visualProfile source-inspired-editorial
bridge media audit passes
capturedImages >= 2
structured model has hero heading
structured model has hero body
structured model has nav links
structured model has useful cards
structured model has footer links
```

## No-test rule until internal readiness

Do not ask for visual testing unless these are true:

```txt
manifest.json -> code.v5.strict.js
ui.html requires diagnostics.v5Enhanced
bridge strict model audit passes
capturedImages >= 2
plugin status says Alpha V5 strict source-inspired structured clone
```

## Honest status

```txt
Last user-validated visual score: 2/10
Current implementation direction: strict V5 enhanced structured clone
Ready for user test: only after strict internal gate passes
```
