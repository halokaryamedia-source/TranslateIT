# TranslateIT — Next Action

## Current Status

The user has explicitly prioritized completing major frontend work before local/integration testing. Local dependency install, Svelte build/render, Tauri, Python/model, Windows audio, installer, and clean-machine proof remain required before release but are intentionally deferred for now.

Frontend Phase 1 through Phase 3 source are now aligned:

- one frontend module entry mounts one `App.svelte` owner;
- Meeting / Text / Settings / First Setup are declarative Svelte owners;
- old vanilla launcher/controller/First Setup/icon/CSS ownership remains removed;
- `runtimeApi.ts` and `runtimeProductFacade.ts` remain the runtime boundary;
- approved stack remains Svelte 5 + Vite + TypeScript + Tailwind CSS 4 + semantic CSS tokens + selective Bits UI + `@lucide/svelte`;
- `tokens.css` and `app.css` own the bounded visual system;
- Text includes Translate, ID <-> EN swap, editable result, Copy, Ctrl/Cmd+Enter, stale-source feedback, and late-result protection so an older async result cannot overwrite a newer target edit;
- Meeting Ready/Starting/Live/Stopping remain runtime-derived and bridge failure now has a distinct Unavailable product state;
- active Meeting continuity across Text/Settings remains explicit;
- safe close distinguishes active Meeting, already-stopping, owner conflict, and unverifiable runtime state; Retry Check is offered when state cannot be verified instead of a misleading Stop action;
- First Setup retains resume/defer/device-check/repair/verify behavior;
- Settings retains Meeting devices, Mic Test, recovery, Advanced health, bounded Diagnostics, and Verify Models;
- no second frontend truth/store/controller or extra framework was introduced.

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

```text
styles/tokens.css
-> durable semantic tokens

styles/app.css
-> Tailwind import + base desktop rules + bounded shared patterns

StatusBadge.svelte / StatusRow.svelte
-> repeated visible state responsibility only
```

The visual result remains source intent, not rendered acceptance, because local/rendered proof is deferred.

## Closed — Frontend Phase 3: UX State And Feature-Completeness Audit

The audit was checked against current initial-core product requirements, especially First Setup, Meeting Ready/Live, Text, navigation continuity, safe close, normal state vocabulary, and unavailable-state behavior.

Material corrections made by the audit:

1. **Text late-result authority** — target edits made while translation is running are now tracked; the async result is rejected from overwriting that newer user edit.
2. **Unavailable vs Setup Needed** — `runtimeProductFacade.ts` now distinguishes a real frontend/runtime bridge-unavailable condition from ordinary setup blockers.
3. **Meeting poll honesty** — an explicit unavailable Meeting response replaces stale rendered Meeting status instead of silently preserving a previous Live presentation.
4. **Safe-close actions** — close-dialog copy/action now reflects the actual state: Stop & Close only when an app-owned Meeting can be stopped, Retry Check for unverifiable state, and no fake primary action for another owner or an already-stopping session.
5. **Normal UI wording** — sidebar status is product-facing (`TranslateIT status`) rather than presenting internal runtime terminology as the primary user label.

No backend/runtime semantics were changed to obtain those frontend states.

## Current Mode

**Developing** — frontend source hardening before the deferred integrated-test stage.

Execution channel:

```text
ChatGPT -> GitHub
```

## Next Step — Frontend Phase 4: Static Accessibility And Maintainability Hardening

### Goal

Perform the final source-only frontend hardening pass before declaring the major frontend source feature set ready for the later integrated-test stage.

### Scope

1. audit landmarks, labels, focus-visible behavior, button/field disabled states, dialog semantics, and `aria-live` usage across the current Svelte surfaces;
2. check keyboard paths for navigation, Text translate/copy/swap, setup actions, Settings controls, and safe-close dialog without inventing custom shortcut frameworks;
3. remove dead props, dead state, duplicate presentation helpers, unnecessary raw technical copy, and component boundaries that no longer earn their place;
4. check that normal UI does not expose Python/model/CUDA/internal blocker vocabulary except inside bounded Diagnostics;
5. check source-level desktop resize constraints against the existing Tauri minimum window contract without designing mobile/web layouts;
6. keep the frontend dependency set fixed unless the audit proves a concrete missing interaction capability.

### Constraints

- do not start local tests unless the user changes the current testing decision;
- do not alter Rust/Python/audio/model behavior for UI convenience;
- do not add SvelteKit, router, global state management, UI kits, animation frameworks, or another theme system;
- do not describe source-level accessibility intent as rendered/assistive-technology proof;
- do not create parallel audit/report documents.

### Acceptance

1. every interactive control has a clear semantic role/label and meaningful disabled/busy state where applicable;
2. normal UI language remains product-facing and Diagnostics remains the technical boundary;
3. no dead frontend props/state/helpers or duplicate product-state mapping remain after the source audit;
4. desktop composition is source-aligned with the current minimum-window contract and important actions are not intentionally fixed below reachable content;
5. the accumulated deferred proof queue is ready to run later as one controlled integrated-test stage.

## Deferred Integrated Proof Queue

When the user decides the major feature set is ready:

```text
frontend dependency install + regenerate package-lock
-> official Svelte autofixer on changed Svelte files
-> svelte-check
-> Vite frontend build
-> Rust/Tauri compile + launch
-> keyboard/focus/rendered accessibility smoke
-> clipboard interaction proof
-> private PythonRuntime + worker/model smoke
-> Windows Meeting audio/device proof
-> installer/installed-runtime proof
-> clean-machine proof
```
