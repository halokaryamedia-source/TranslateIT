---
name: desktop-runtime-development
description: TranslateIT specialist for the desktop product/runtime boundary: active shell, frontend application architecture and framework migration, navigation/workspaces, desktop lifecycle, product readiness/state mapping, desktop settings integration, frontend-to-runtime bridge/facade, product recovery actions, and Normal UI versus Developer Diagnostics. Do not use for generic visual styling or for AI/audio/package internals.
---

# Desktop Runtime Development

Use after `development-brief` proves that the current acceptance boundary is the
TranslateIT desktop product/runtime layer.

## Owns

- active desktop application shell and lifecycle;
- frontend application architecture and behavior-preserving framework migration;
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
- generic visual styling, spacing, icon, typography, or reference-image craft when
  runtime/product behavior is unchanged.

## Activation

Activate when the primary semantic problem is desktop product/runtime behavior,
for example:

- Meeting/Text/Settings shell hierarchy;
- migrating the active frontend shell from vanilla DOM/controller code to the
  approved Svelte architecture while preserving current product behavior;
- capability-level `Ready / Degraded / Setup Needed / Unavailable / Checking`;
- mapping technical runtime state into product-readable actions such as `Retry`,
  `Fix Setup`, and `Open Diagnostics`;
- preserving engineering controls behind Advanced/Developer Diagnostics;
- desktop-to-runtime facade/bridge ownership.

Do not activate merely because a TypeScript, Rust, Tauri, Svelte, or frontend file
changes.

## Approved Frontend Architecture

The approved long-term frontend target is:

```text
Tauri 2
+ Svelte 5
+ Vite
+ TypeScript
```

Visual implementation is additionally allowed to use Tailwind CSS 4, durable CSS
custom-property design tokens, selective Bits UI primitives, and Lucide Svelte as
defined by `desktop-ui-design-development`.

This specialist owns **migration of application structure and state wiring**, not
the visual design system.

Default architectural rules:

- plain Svelte SPA inside Tauri; do not add SvelteKit unless a new requirement
  proves routing/server/meta-framework behavior is necessary;
- keep one frontend entry and one application root;
- preserve `runtimeApi.ts` and `runtimeProductFacade.ts` as the existing runtime
  boundaries unless a concrete contract problem proves they must change;
- Svelte state is presentation/application state, not a duplicate of Rust/runtime
  product truth;
- no Redux-like/global state library by default; use Svelte 5 runes and bounded
  context/component state;
- no frontend router by default for Meeting/Text/Settings workspace switching;
- do not create a second shell/controller/store during migration and leave both
  active;
- do not reimplement AI/audio/Meeting session semantics in Svelte.

## Svelte Migration Discipline

A framework migration must be treated as a behavior-preserving architecture change,
not as a redesign opportunity.

Recommended order:

```text
current product behavior + bridge contracts
-> establish one Svelte application root
-> migrate shell/navigation and page composition
-> migrate bounded presentation state
-> migrate Meeting/Text/Settings surfaces in small slices
-> prove runtime action/state parity
-> remove replaced vanilla template/controller ownership
```

Rules:

1. Preserve current Tauri command names, product facade semantics, Meeting
   lifecycle, Text direction behavior, settings persistence, and First Setup facts
   unless the current task separately approves changing them.
2. Convert behavior by responsibility, not by copying every old DOM helper into a
   Svelte wrapper.
3. Avoid a permanent compatibility layer between the old controller and new Svelte
   components. Temporary migration adapters must have a direct removal boundary.
4. Keep state close to the component/feature that owns presentation. Shared state
   exists only when multiple current surfaces genuinely consume the same
   presentation fact.
5. Prefer `$state`/`$derived` for modern Svelte 5 reactivity; treat `$effect` as an
   integration escape hatch rather than the normal way to compute state.
6. Do not hide old manual DOM mutation behind Svelte components. The migration is
   complete only when the migrated surface is declaratively owned by Svelte.

When editing Svelte files in Codex/Local, use the official Svelte AI helper workflow
recorded in `AGENTS.md`, including the Svelte autofixer before finalization.

## Current Architecture First

Until migration actually starts, the current vanilla TypeScript source remains the
runtime truth. Do not describe the target Svelte architecture as already
implemented.

Reuse the current active shell/controller/facade while recovering behavior. Do not
create `V2`, `New`, or parallel launcher/controller/state owners merely to avoid
understanding existing ones.

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

If the current vanilla frontend must move to Svelte while Meeting/Text behavior and
bridge contracts remain the same, this specialist owns the migration architecture.
If the task is instead visual spacing, typography, token, component-state craft, or
rendered composition, use `desktop-ui-design-development`.

## Procedure

1. Ground the desktop product behavior from the development brief.
2. Identify the active shell/controller/facade owner.
3. Identify the underlying capability contract; do not reimplement it.
4. Separate product truth from presentation state.
5. Reuse the existing desktop owner or migrate it directly; do not create a
   permanent parallel shell.
6. Make the smallest complete desktop change.
7. Check affected bridge/callers, state/action mapping, and duplicate ownership.
8. For Svelte changes, apply the official Svelte helper/autofixer workflow when
   the execution channel supports it.
9. Return to the development-brief acceptance gate.

## Proof

GitHub/static proof can establish active wiring, ownership, navigation, state
mapping, framework/component ownership, and action mapping. Svelte compile/type
claims require targeted `sv check`/build proof. Live Tauri interaction or visual
correctness requires appropriate local/rendered proof when the claim depends on
it.

## Anti-Slop Boundary

Do not create a second shell, state manager, duplicated settings store, scattered
low-level runtime-call layer, frontend-side AI/audio implementation, global
`appReady` truth that hides capability differences, or broad visual redesign unless
the current acceptance boundary actually requires it.

Do not turn the Svelte migration into a reason to add SvelteKit, router/state
frameworks, generic service layers, duplicated design systems, or one component per
trivial DOM element. The goal is a smaller and more maintainable frontend owner,
not a larger framework-shaped codebase.
