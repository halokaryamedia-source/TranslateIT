# V1 Modular Refactor Report

Branch: `refactor/v1-modular-naming-pass`

## Scope

This pass reduces monolithic pressure in the active TranslateIT V1 app package and adds naming guardrails for future update work.

## Runtime code refactor

### Tauri bootstrap

`src-tauri/src/main.rs` is now a small app entrypoint.

Window startup behavior moved to:

```text
EngineData/Frontend/RustApp/src-tauri/src/app_bootstrap.rs
```

Tauri command registration moved to:

```text
EngineData/Frontend/RustApp/src-tauri/src/commands/registry.rs
```

This makes future command updates safer because new commands can be added to the command registry without growing the main app entrypoint.

### Rust engine boundaries

Added valid Rust module boundaries:

```text
EngineData/Frontend/RustApp/src-tauri/src/engine/services/mod.rs
EngineData/Frontend/RustApp/src-tauri/src/engine/domain/mod.rs
```

`engine/mod.rs` now exposes these boundaries so future refactors can move orchestration into `services` and pure rules into `domain` gradually.

## Naming and file ownership

Added active naming standard:

```text
DevelopingData/Documentation/Reports/Engineering/V1_NAMING_AND_MODULE_STANDARD.md
```

Added naming validator:

```text
EngineData/Frontend/RustApp/scripts/validate_file_naming_policy.mjs
```

Added package script:

```text
npm run validate:naming
```

`validate:quick` now includes naming/route validation before typecheck, Rust check, and frontend build.

## Current modularity status after this pass

Improved:

- `main.rs` is no longer the command registry and window bootstrap owner.
- command registration has a dedicated module.
- Rust service/domain boundaries are real modules, not only documentation folders.
- naming policy is now documented and partially enforced by script.

Still remaining:

- `launcherController.ts` is still the largest frontend bottleneck.
- several command/adapter files still contain orchestration logic that should move into `engine/services` later.
- pure readiness/rule logic should move into `engine/domain` gradually.
- large file renames should be handled in small PRs after local validation.

## Validation note

This pass was prepared through GitHub edits. Local validation should be run from:

```text
EngineData/Frontend/RustApp
```

Recommended first command:

```text
npm run validate:quick
```

## Next recommended PR

Split `launcherController.ts` one responsibility at a time, starting with assistant notice handling or attachment handling because those have lower runtime risk than voice capture.