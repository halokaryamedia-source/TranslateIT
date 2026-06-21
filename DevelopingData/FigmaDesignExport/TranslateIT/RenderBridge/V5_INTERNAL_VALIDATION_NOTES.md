# TranslateIT Version 0.1 - Alpha — V5 Internal Validation Notes

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

The current direction is:

```txt
Website -> structured site model -> source-inspired editable UI clone
```

## Default plugin wiring

The active manifest now points to:

```txt
plugin/code.v5.js
```

Renderer expected in plugin status:

```txt
Alpha V5 source-inspired structured clone
```

Main output expected:

```txt
01 Source-Inspired Editable Clone / Main Output
```

## Required bridge

Use the fixed structured bridge bootstrap:

```txt
RenderBridge/start-alpha-v4-fixed.mjs
```

Expected payload:

```txt
structuredLayout: present
adapter: translateit-alpha-v4-fixed-structured-site-model
```

The plugin UI now rejects older payloads without `structuredLayout`.

## No-test rule until internal readiness

Do not ask for repeated visual testing unless these are true:

```txt
manifest.json -> code.v5.js
ui.html mentions V5 structured clone
bridge media audit passes
capturedImages >= 2
plugin status says Alpha V5 source-inspired structured clone
```

## Honest status

```txt
Last user-validated visual score: 2/10
Current implementation direction: fixed toward structured clone
Ready for another user test: not until internal checks pass
```
