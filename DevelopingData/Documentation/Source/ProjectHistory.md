# Project History

## Current milestone

The project has migrated toward a single Rust/Tauri desktop app route with a local AI worker for inference.

## Important cleanup decisions

- `DeveloperData` was merged into `DevelopingData/Documentation`.
- `DevelopingData/ToolKitData` was retired and replaced by `DevelopingData/Tooling`.
- Old helper launcher routes were removed.
- Old Python app engine paths were removed.
- Documentation now belongs under `DevelopingData/Documentation`.
- `EngineData` is reserved for runtime app, worker, and local runtime asset slots.

## Current active route

```text
TranslateIT.vbs -> EngineData/LauncherApp/RustApp
```

## Current tooling route

```text
DevelopingData/Tooling/Scripts/Execution
```
