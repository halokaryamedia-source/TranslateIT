---
name: desktop-runtime-development
description: TranslateIT specialist for the desktop product/runtime boundary: active shell, navigation/workspaces, desktop lifecycle, product readiness/state mapping, desktop settings integration, frontend-to-runtime bridge/facade, product recovery actions, and Normal UI versus Developer Diagnostics. Do not use for generic visual styling or for AI/audio/package internals.
---

# Desktop Runtime Development

Use after `development-brief` proves that the current acceptance boundary is the
TranslateIT desktop product/runtime layer.

## Owns

- active desktop application shell and lifecycle;
- navigation/workspace hierarchy and primary product surface;
- product-level capability/readiness state mapping;
- desktop settings integration with canonical settings owners;
- frontend/Tauri/runtime bridge and product facade usage;
- product-level recovery actions;
- Normal UI versus Developer Diagnostics boundary;
- orchestration of existing runtime capabilities from the desktop surface.

## Does Not Own

- ASR, translation, TTS inference, model/provider loading, CUDA/CPU execution;
- microphone capture, VAD mechanics, Windows device or virtual-audio routing;
- installer/package construction and clean-machine delivery;
- generic visual styling, spacing, icon, or typography work when runtime/product
  behavior is unchanged.

## Activation

Activate when the primary semantic problem is desktop product/runtime behavior,
for example:

- Meeting/Text/Documents/History/Saved/Settings shell hierarchy;
- capability-level `Ready / Degraded / Setup Needed / Unavailable / Checking`;
- mapping technical runtime state into product-readable actions such as `Retry`,
  `Fix Setup`, and `Open Diagnostics`;
- preserving engineering controls behind Advanced/Developer Diagnostics;
- desktop-to-runtime facade/bridge ownership.

Do not activate merely because a TypeScript, Rust, Tauri, or frontend file changes.

## Current Architecture First

Reuse the current active shell/controller/facade. Do not create `V2`, `New`, or
parallel launcher/controller/state owners merely to avoid understanding existing
ones.

The desktop layer should:

```text
request capability
receive meaningful state/result
present/orchestrate product behavior
```

It should not reimplement AI or audio internals.

Prefer established product facade/bridge boundaries over scattered direct
low-level runtime calls when the current architecture already provides the
boundary.

## Domain Rules

- Normal UI presents product/capability state, not helper/worker/Python/model
  internals.
- Developer Diagnostics may expose helper lifecycle, model/provider/device/CUDA,
  pipeline stages, latency details, redacted logs, and targeted engineering
  controls.
- Readiness is capability-based; one unavailable capability must not automatically
  make the whole app unavailable.
- `command exists`, `helper started`, `device discovered`, or `config exists` do
  not by themselves prove product readiness.
- Do not duplicate canonical runtime/product settings in frontend-only stores.
  Temporary presentation state is allowed; duplicate product truth is not.
- Reuse existing active owners before adding another controller, state manager, or
  service.

## Boundary Examples

If the AI runtime reports `model_unavailable` correctly but desktop shows `Ready`,
this specialist owns the fix. If the AI runtime itself reports the wrong state,
`local-ai-runtime-development` owns it.

If audio reports `route_missing` correctly but desktop displays the wrong product
state/action, this specialist owns the fix. If route detection itself is wrong,
`windows-audio-runtime-development` owns it.

## Procedure

1. Ground the desktop product behavior from the development brief.
2. Identify the active shell/controller/facade owner.
3. Identify the underlying capability contract; do not reimplement it.
4. Separate product state from internal technical state.
5. Reuse the existing desktop owner.
6. Make the smallest complete desktop change.
7. Check affected bridge/callers, state/action mapping, and duplicate ownership.
8. Return to the development-brief acceptance gate.

## Proof

GitHub/static proof can establish active wiring, ownership, navigation, state
mapping, and action mapping. Live Tauri interaction or visual correctness requires
appropriate local/rendered proof when the claim depends on it.

## Anti-Slop Boundary

Do not create a new shell, state manager, duplicated settings store, scattered
low-level runtime-call layer, frontend-side AI/audio implementation, global
`appReady` truth that hides capability differences, or broad visual redesign
unless the current acceptance boundary actually requires it.
