# TranslateIT — Next Action

## Current Status

The user has explicitly prioritized completing major frontend work before local/integration testing. Local PythonRuntime, Svelte build/render, Tauri, model, audio, installer, and clean-machine proof remain required before release but are intentionally deferred for now.

Frontend Phase 1 source migration is now aligned:

- one frontend module entry remains: `index.html -> src/main.ts`;
- `src/main.ts` mounts one Svelte application root: `App.svelte`;
- Meeting / Text / Settings / First Setup are declarative Svelte owners;
- Meeting live activity and committed transcript presentation are Svelte-owned;
- native safe-close still uses the canonical Meeting Stop path and fails closed when state cannot be verified;
- `runtimeApi.ts`, `runtimeProductFacade.ts`, shared settings types/state, Rust commands, and Python runtime contracts are preserved;
- old `active-launcher`, `simple-launcher`, vanilla First Setup, manual icon source, and legacy root CSS owners are removed rather than left as a dual shell;
- approved stack declarations are Svelte 5 + Vite + TypeScript + Tailwind CSS 4 + semantic CSS tokens + selective Bits UI + Lucide Svelte;
- Bits UI is used selectively for the safe-close dialog; native audio-device selects remain native;
- no SvelteKit, router, Redux-like state library, heavy UI framework, CSS-in-JS, full shadcn dump, or animation framework was added;
- package-lock from the old dependency graph is removed rather than presented as valid for the new Svelte graph; regenerate it during the later local dependency-materialization/proof stage.

No `npm install`, Svelte autofixer, `svelte-check`, Vite build, Tauri launch, Rust compile, Python/model execution, Windows audio proof, or rendered UI proof was executed through ChatGPT -> GitHub.

## Closed — Frontend Phase 1: Svelte Application Ownership

Current intended source shape:

```text
src/
├─ main.ts
├─ App.svelte
├─ pages/
│  ├─ FirstSetup.svelte
│  ├─ Meeting.svelte
│  ├─ Text.svelte
│  └─ Settings.svelte
├─ components/
│  ├─ layout/Sidebar.svelte
│  ├─ meeting/MeetingActivity.svelte
│  └─ ui/StatusBadge.svelte
├─ styles/
│  ├─ app.css
│  └─ tokens.css
└─ app/
   ├─ bridge/
   │  ├─ runtimeApi.ts
   │  └─ runtimeProductFacade.ts
   └─ shared/
      ├─ state.ts
      ├─ tauriBridge.ts
      └─ types.ts
```

This is an application-architecture migration, not runtime proof or final visual acceptance.

## Current Mode

**Developing** — frontend major-feature completion.

Execution channel:

```text
ChatGPT -> GitHub
```

Use:

```text
development-brief
+ desktop-ui-design-development
```

Official Svelte documentation/AI guidance may be used as conditional technical help. Local autofixer/build proof remains deferred until the user requests the later proof stage.

## Next Step — Frontend Phase 2: Visual System And Component Professionalization

### Goal

Turn the Phase 1 Svelte structure into a coherent, maintainable desktop UI system without changing Meeting/Text/runtime behavior.

### Scope

1. audit the Svelte surfaces against the approved product hierarchy and current visual intent;
2. establish a small durable token vocabulary for surfaces, text, state colors, spacing/radius/elevation only where repetition proves value;
3. professionalize Sidebar, top status area, Meeting Ready/Live, Text translator, First Setup, Settings, and Diagnostics composition;
4. standardize meaningful component states: default, focus, active, checking, ready, setup-needed/degraded, disabled;
5. improve resizable desktop composition and keyboard/focus visibility;
6. keep Bits UI selective; introduce another primitive only when its accessibility/interaction complexity earns the dependency use;
7. keep motion limited to useful state/orientation feedback and reduced-motion safe.

### Constraints

- do not change Rust/Python/audio/model/Meeting lifecycle behavior;
- do not add SvelteKit, router, global state manager, heavy component framework, CSS-in-JS, or general animation framework;
- do not recreate generic wrapper/component layers with no semantic responsibility;
- do not create a second design-token/theme system beside `styles/tokens.css`;
- do not restore old vanilla controller/CSS ownership;
- do not treat source markup as rendered visual proof.

### Acceptance

1. every major frontend surface follows one coherent hierarchy/density/token language;
2. component boundaries reflect reusable behavior or meaningful visual/state responsibility rather than file-count goals;
3. Meeting lifecycle/readiness distinctions remain visually explicit without inventing runtime truth;
4. the Svelte source remains one active frontend path with the existing facade/bridge contract;
5. local dependency install/autofix/typecheck/build/render proof remains explicitly deferred and accumulated for the later integrated-test stage requested by the user.

## Deferred Proof Queue

When the user decides major features are ready for testing, run the accumulated proof in a controlled sequence rather than piecemeal now:

```text
frontend dependency install + regenerate package-lock
-> Svelte autofixer
-> svelte-check
-> Vite frontend build
-> Rust/Tauri compile + launch
-> private PythonRuntime + worker/model smoke
-> Windows Meeting audio/device proof
-> installer/installed-runtime proof
-> clean-machine proof
```
