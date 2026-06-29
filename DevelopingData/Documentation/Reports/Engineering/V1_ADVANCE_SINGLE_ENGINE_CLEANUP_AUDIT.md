# TranslateIT V1-Advance Single-Engine Cleanup Audit

Branch: `V1-Advance`
Status: Phase 2 cleanup audit started

## Purpose

This report tracks the single-engine cleanup work for TranslateIT V1-Advance.

The goal is to make sure TranslateIT V1 continues as one active runtime engine and does not reactivate unused design/export tooling, legacy runtime branches, or alternative product engines.

## Phase 2 decisions

1. `EngineData/Frontend/RustApp` remains the active app package.
2. `SourceLocal` remains the backup snapshot source.
3. `V1-Advance` is the active development branch.
4. `Developing` remains the repository default branch for now.
5. DesignIT is not used.
6. FigmaDesignExport is not used.
7. Figma export scripts must not be active package scripts.
8. Figma export helper files must not remain in active RustApp scripts.

## Cleanup performed

Removed inactive package scripts from:

```text
EngineData/Frontend/RustApp/package.json
```

Removed active script entries:

```text
export:figma-design
validate:figma-export
```

Removed inactive files from active RustApp scripts:

```text
EngineData/Frontend/RustApp/scripts/export_figma_design_system.mjs
EngineData/Frontend/RustApp/scripts/validate_figma_export.mjs
```

Added policy validator:

```text
EngineData/Frontend/RustApp/scripts/validate_v1_advance_policy.mjs
```

Added package script:

```text
validate:v1-advance-policy
```

Added CI guard in:

```text
.github/workflows/translateit-v1-advance-ci.yml
```

## CI guard behavior

The bootstrap CI now checks:

1. V1-Advance source-of-truth files exist.
2. Active RustApp package exists.
3. `DevelopingData/FigmaDesignExport` does not exist as an active path.
4. `DevelopingData/DesignIT` does not exist as an active path.
5. Required package scripts are declared.
6. Package scripts do not contain inactive Figma/DesignIT markers.
7. `validate_v1_advance_policy.mjs` passes.
8. V1-Advance product requirement markers remain present.
9. Non-local CI policy markers remain present.

## Still allowed

Historical references may remain in Git history and old commits.

Documentation may mention removed systems only when clearly explaining that they are inactive or removed.

## Not allowed

The following must not be active runtime dependencies:

```text
DesignIT
FigmaDesignExport
export_figma_design_system.mjs
validate_figma_export.mjs
```

The following must not be active package scripts:

```text
export:figma-design
validate:figma-export
```

## Next audit target

The next Phase 2 audit should check:

1. Docs that still imply old branch names are current.
2. Runtime contracts that still say `Dev-Rust` when `V1-Advance` is now active.
3. Any `legacy` wording that is not clearly marked as inactive reference.
4. Any active code path that claims readiness without CI-safe or target-PC evidence.
