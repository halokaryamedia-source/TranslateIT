# TranslateIT — Next Action

## Current Status

The user has explicitly prioritized completing major frontend work before local/integration testing. Local dependency install, Svelte build/render, Tauri, Python/model, Windows audio, installer, and clean-machine proof remain required before release but are intentionally deferred for now.

Frontend Phase 1 and Phase 2 source are now aligned:

- one frontend module entry mounts one `App.svelte` owner;
- Meeting / Text / Settings / First Setup are declarative Svelte owners;
- old active-launcher/simple-launcher/vanilla First Setup/manual icon/legacy root CSS ownership remains removed;
- `runtimeApi.ts` and `runtimeProductFacade.ts` remain the runtime boundary;
- approved stack remains Svelte 5 + Vite + TypeScript + Tailwind CSS 4 + semantic CSS tokens + selective Bits UI + `@lucide/svelte`;
- `tokens.css` is the one semantic token owner for surfaces/text/action/state/shape/layout roles;
- `app.css` owns base focus/reduced-motion behavior and a bounded shared visual vocabulary (`ti-page`, panel, button, field, pill, state card, action row);
- Sidebar composition, Meeting ready/live hierarchy, Text panes, First Setup, Settings, and Diagnostics now use the same density/state/token language;
- shared `StatusRow.svelte` centralizes repeated readiness/device-row presentation without becoming a generic wrapper system;
- Text now includes the required **Copy** action in addition to Translate, editable result, and ID <-> EN swap;
- Meeting incoming/outbound states have explicit visual distinctions while still reflecting the existing runtime facts;
- no SvelteKit, router, Redux-like state library, heavy UI framework, CSS-in-JS, full shadcn dump, or animation framework was added.

No `npm install`, Svelte autofixer, `svelte-check`, Vite build, Tauri launch, Rust compile, clipboard/Tauri execution proof, Python/model execution, Windows audio proof, or rendered UI proof was executed through ChatGPT -> GitHub.

## Closed — Frontend Phase 1: Svelte Application Ownership

```text
index.html
-> src/main.ts
-> App.svelte
   ├─ FirstSetup.svelte
   ├─ Meeting.svelte
   ├─ Text.svelte
   └─ Settings.svelte
```

The old manual-DOM/controller path is removed rather than retained in parallel.

## Closed — Frontend Phase 2: Visual System And Component Professionalization

Current visual ownership:

```text
styles/tokens.css
-> durable semantic tokens

styles/app.css
-> Tailwind import + base desktop rules + bounded shared patterns

components/ui/StatusBadge.svelte
-> visible state badge

components/ui/StatusRow.svelte
-> reusable readiness/device row
```

Current major product surfaces use those owners without creating a theme registry, design-system generator, or large component abstraction layer.

The visual result is still **source intent**, not rendered acceptance, because the user has deferred local/rendered proof.

## Current Mode

**Developing** — frontend major-feature completion.

Execution channel:

```text
ChatGPT -> GitHub
```

## Next Step — Frontend Phase 3: UX State And Feature-Completeness Audit

### Goal

Audit the now-Svelte frontend as a complete product surface and close remaining major frontend gaps before entering the deferred integrated-test stage.

### Scope

1. compare Meeting / Text / First Setup / Settings / Diagnostics against current product requirements and current runtime/facade contracts;
2. check all materially reachable UI states: checking, ready, starting, live, stopping, degraded/setup-needed, unavailable/error, disabled;
3. check navigation continuity while Meeting is active and safe-close messaging/actions;
4. check Text workflow completeness including Translate, stale-result handling, swap, edit, Copy, keyboard action, and empty/error states;
5. check First Setup resume/defer/repair/complete paths and device-selection feedback;
6. check Settings/Diagnostics recovery actions and ensure technical controls do not leak back into normal UI;
7. remove any remaining dead props, duplicate presentation logic, misleading copy, or source-only UI residue proven by the audit.

### Constraints

- do not change Rust/Python/audio/model semantics to make frontend states easier;
- do not add another framework/library unless a concrete current UX requirement proves it necessary;
- do not start local tests during this phase unless the user changes the current testing decision;
- do not describe unrendered source as visually accepted;
- do not create parallel status/plan files.

### Acceptance

1. each current product requirement has one visible frontend owner or an explicit non-UI runtime owner;
2. all materially reachable frontend states have a clear, non-conflicting presentation/action;
3. no duplicate frontend product truth/store/controller is introduced;
4. no major initial-core UI action is missing from Meeting/Text/Settings/First Setup;
5. the accumulated deferred proof queue is explicit and ready to run later as one controlled integrated-test stage.

## Deferred Integrated Proof Queue

When the user decides the major feature set is ready:

```text
frontend dependency install + regenerate package-lock
-> official Svelte autofixer on changed Svelte files
-> svelte-check
-> Vite frontend build
-> Rust/Tauri compile + launch
-> clipboard interaction proof
-> private PythonRuntime + worker/model smoke
-> Windows Meeting audio/device proof
-> installer/installed-runtime proof
-> clean-machine proof
```
