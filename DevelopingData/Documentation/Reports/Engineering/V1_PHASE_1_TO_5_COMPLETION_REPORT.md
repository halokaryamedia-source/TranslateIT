# V1 Phase 1 to 5 Cleanup Completion Report

Status: safe cleanup pass completed in branch `cleanup/v1-phase-1-to-5-safe`.

Base branch: `V1`

## Safety summary

This pass is intentionally conservative.

- Active runtime files were not moved.
- Old script aliases were kept for compatibility.
- The `RustApp` route was not renamed.
- No packaged readiness is claimed.
- No target-PC/local validation is claimed.
- Local pull remains blocked until explicit user confirmation.

## Phase 1 — Inventory gate

Completed.

The previous ownership map is now the cleanup gate for active/runtime/scaffold/development classification:

```text
DevelopingData/Documentation/Reports/Engineering/V1_ACTIVE_FILE_OWNERSHIP_MAP.md
```

Additional correction performed:

- `RootFileRules.md` now reconciles the `DevelopingData/Samples/` contradiction by keeping it allowed and removing it from retired paths.
- `RootFileRules.md` now clarifies that `EngineData/Frontend/RustApp` is the active desktop app package, with `src/` as UI runtime and `src-tauri/` as the app-embedded Rust/Tauri backend bridge.
- `RootFileRules.md` now references the actual preview route `Preview/` instead of the older `DesignPreview/` wording.

## Phase 2 — Script simplification

Completed as a backwards-compatible first pass.

Added profile commands:

```text
npm run validate:quick
npm run validate:release-preflight
npm run validate:local-heavy
npm run validate:script-profiles
```

Added script policy documentation:

```text
EngineData/Frontend/RustApp/scripts/README.md
```

Added profile validator:

```text
EngineData/Frontend/RustApp/scripts/validate_script_profiles.mjs
```

No old scripts were removed. This avoids breaking GitHub/local workflows while giving the user a simpler command surface.

## Phase 3 — Modular boundary cleanup

Completed as a safe boundary pass.

Added frontend controller boundary:

```text
EngineData/Frontend/RustApp/src/app/active-launcher/controller/README.md
```

Added Rust engine boundary folders:

```text
EngineData/Frontend/RustApp/src-tauri/src/engine/services/README.md
EngineData/Frontend/RustApp/src-tauri/src/engine/domain/README.md
```

Notes:

- `launcherController.ts` is still the main bottleneck and should be split in later small PRs.
- The app is not a single-file monolith anymore, but it is not fully clean-modular yet.
- A planned `engine/io/README.md` write was not forced after tooling blocked the write; this was left out to keep the pass safe.

## Phase 4 — Legacy/archive gate

Completed.

Added:

```text
DevelopingData/Documentation/Reports/Engineering/V1_LEGACY_ARCHIVE_GATE.md
```

This gate defines when historical/scaffold/duplicate-validator material may be archived later. It intentionally prevents unreviewed structural changes.

## Phase 5 — Final pull readiness gate

Completed as a review gate, not as a local pull.

Before local pull, the user should review the PR diff and confirm the branch is approved.

Recommended local validation after pull, from `EngineData/Frontend/RustApp`:

```text
npm run validate:quick
```

For a stronger local check:

```text
npm run validate:release-preflight
```

For full heavy local checks only when models/GPU/worker setup are ready:

```text
npm run validate:local-heavy
```

## Remaining work after this pass

1. Split `launcherController.ts` into smaller controllers.
2. Move Rust orchestration out of broad command/adapter files into `engine/services` gradually.
3. Move pure Rust rules into `engine/domain` gradually.
4. Consolidate duplicate one-off validators after local validation confirms no workflow depends on them.
5. Archive historical docs only after the ownership map and legacy gate are approved.

## Final note

This pass improves maintainability and cleanup safety, but it does not claim packaged app readiness or local runtime success.