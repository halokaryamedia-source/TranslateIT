# TranslateIT Tauri Desktop Application

This directory is the current desktop application package on branch `New`.

## Frontend Ownership

```text
index.html
-> src/main.ts
-> one Svelte mount
-> src/App.svelte
   ├─ pages/FirstSetup.svelte
   ├─ pages/Meeting.svelte
   ├─ pages/Text.svelte
   └─ pages/Settings.svelte
```

Runtime boundaries remain separate:

```text
src/app/bridge/runtimeProductFacade.ts
-> product-readable state/actions

src/app/bridge/runtimeApi.ts
-> Tauri command boundary

src-tauri/src/commands/
-> Rust desktop/runtime commands
```

The previous manual DOM controller/template-string frontend is removed from the active source graph rather than retained as a parallel compatibility shell.

## Frontend Stack

Approved source stack:

```text
Tauri 2
Svelte 5
Vite
TypeScript
Tailwind CSS 4
CSS custom-property design tokens
selective Bits UI
Lucide Svelte
```

No SvelteKit, frontend router, Redux-like state library, heavy UI framework, CSS-in-JS, or general animation framework is required for the current product.

`styles/tokens.css` owns the small semantic token set. `styles/app.css` owns Tailwind loading, base desktop rules, focus behavior, reduced-motion behavior, and a few justified shared component classes.

## Product Surface

Normal UI remains Meeting / Text / Settings, with First Setup shown when required. Audio Studio, History/Saved, Documents, tone/mode controls, and developer pipeline controls are not initial core.

Meeting lifecycle, settings persistence, audio truth, model/provider truth, and translation execution remain owned by the existing Rust/Python runtime. Svelte state is presentation/application state only.

## Dependency / Proof Boundary

The source migration was authored through ChatGPT -> GitHub. The previous `package-lock.json` must not be treated as valid for the new Svelte dependency graph and should be regenerated when dependencies are materialized locally.

The user has chosen to defer local testing while major frontend work is still being assembled. Before release, the project still requires Svelte dependency installation/autofix/typecheck/build/render proof plus the existing Rust/Tauri/Python/audio/installer proof described by the canonical project docs.

Resume work through root `AGENTS.md`, `CONTEXT.md`, and `docs/knowledge/next-action.md`.
