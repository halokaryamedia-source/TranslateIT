# Project History

## Current milestone

TranslateIT has migrated toward a single Rust/Tauri desktop app route with a local AI worker for inference.

The latest cleanup consolidated scattered development and documentation roots into one development workspace and one documentation hub.

## Important cleanup decisions

- `DeveloperData` was merged into `DevelopingData/Documentation` and then removed.
- `DevelopingData/DocumentationData` was retired and replaced by `DevelopingData/Documentation/Source`.
- `DevelopingData/Reports` was retired and replaced by `DevelopingData/Documentation/Reports`.
- `DevelopingData/ToolKitData` was retired and replaced by `DevelopingData/Tooling`.
- Old helper launcher routes were removed.
- Old Python app engine paths were removed.
- Documentation now belongs under `DevelopingData/Documentation`.
- Executable validation tooling now belongs under `DevelopingData/Tooling/Scripts/Execution`.
- `EngineData` is reserved for runtime app, approved worker, and local runtime asset slots.

## Current active route

```text
TranslateIT.vbs -> EngineData/LauncherApp/RustApp
```

## Current tooling route

```text
DevelopingData/Tooling/Scripts/Execution
```

## Current documentation route

```text
DevelopingData/Documentation
```

## Current professional readiness note

The repository structure is cleaner and more professional, but the application still requires target-PC validation before any professional/client-ready claim.
