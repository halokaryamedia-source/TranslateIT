# Engineering Reports

## Purpose

This folder is for development-only engineering cleanup and architecture reports that are not app-package-specific.

App package reports, templates, checklists, preview notes, and runtime evidence notes stay inside the active app package:

```text
EngineData/LauncherApp/RustApp
```

## Current report groups

- `StructureCleanupReport.md` - root, DevelopingData, Documentation, Tooling, and EngineData cleanup summary.

## Rules

- Do not restore `DevelopingData/Reports`.
- Do not store active runtime source here.
- Do not store app package reports here.
- Keep app-specific reports inside `EngineData/LauncherApp/RustApp` until the physical package rename to `App` is completed.
- Keep report names clear and current.
- New permanent decisions should be reflected in `DevelopingData/Documentation/Source`.
