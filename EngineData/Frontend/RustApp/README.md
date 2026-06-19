# TranslateIT Desktop App Package

`RustApp` is the active Tauri desktop app package for TranslateIT V1.

Even though the path is under `EngineData/Frontend/`, this package is not frontend-only. It contains both the active UI runtime and the app-embedded Rust/Tauri backend bridge.

## Quick Map

```txt
RustApp/
├─ src/             # active UI runtime source
├─ src-tauri/       # active Rust/Tauri backend bridge and app shell
├─ Preview/         # preview-only UI and prototype work
├─ docs/            # package-level documentation
├─ scripts/         # package-level tooling and validation scripts
├─ page-template.md # UI page template reference
├─ ui-reference.md  # UI reference rules
├─ index.html       # app entry point
└─ package.json     # package scripts and dependencies
```

## Package route

```text
EngineData/Frontend/RustApp
```

Do not rename this route unless a full package-path migration is approved and all references are updated in the same change.

## Source

- `src/app/active-launcher/` for active UI runtime modules.
- `src/app/active-launcher/controller/` for the next controller split boundary.
- `src-tauri/src/commands/` for thin Tauri command wrappers.
- `src-tauri/src/engine/` for Rust runtime/domain logic.
- `src-tauri/src/engine/services/` for future Rust orchestration/use-case modules.
- `src-tauri/src/engine/domain/` for future pure Rust domain rules and DTOs.
- `index.html` for the app entry point.

## App docs

- `Preview/`
- `page-template.md`
- `ui-reference.md`
- `docs/ui-reference/`
- `scripts/README.md`

## Validation profiles

Prefer the simplified script profiles first:

```text
npm run validate:quick
npm run validate:release-preflight
npm run validate:local-heavy
```

Older one-off validators remain available for compatibility until local validation proves they can be consolidated safely.

## Separation rule

- Put live UI behavior, state, and runtime views in `src/app/active-launcher/`.
- Put preview or prototype-only material in `Preview/`.
- Do not mix preview assets into the active runtime flow unless they are explicitly promoted to production.
- Keep Tauri command wrappers thin; move orchestration into engine service modules over time.
- Keep pure rules in domain modules over time.

## Current modularity status

TranslateIT V1 is no longer a single-file monolith, but it is not fully clean-modular yet.

Known follow-up work:

1. Split `launcherController.ts` into smaller controllers.
2. Move broad Rust orchestration out of command/adapters into service modules.
3. Move pure Rust rules into domain modules.
4. Consolidate script aliases after local validation.

## Rule

- Keep this package active and focused on runtime code and app-specific docs.
- Keep repository-wide development tooling under `DevelopingData/Tooling`.
- Do not make runtime behavior depend on `DevelopingData`.
- Do not claim packaged readiness from structure cleanup alone.