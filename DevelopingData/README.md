# DevelopingData

## Purpose

`DevelopingData` is the single development workspace for TranslateIT.

It owns current developer-facing documentation, concise reports, safe sample references, quality references, and project tooling.

## Current layout

```text
DevelopingData/
  README.md
  Documentation/
    README.md
    Reports/
      Engineering/
    Source/
      README.md
      ProjectDocumentation.md
      SystemArchitecture.md
      ManualTestGuide.md
      ProjectHistory.md
    Templates/
      Repository/
  Quality/
    Diagnostics/
    Tests/
  Samples/
  Tooling/
    Scripts/
      Execution/
        translateit_tooling.mjs
        run_rustapp_final_validation.ps1
```

## Active documentation route

```text
DevelopingData/Documentation
```

All durable documentation must live there. Do not scatter documentation into root-level or parallel folders.

## Active tooling route

```text
DevelopingData/Tooling/Scripts/Execution
```

RustApp package scripts and GitHub Actions should point to this path.

## Tooling language policy

- Rust/Tauri and repository checks use Node or PowerShell tooling.
- Do not add Python validation scripts under `DevelopingData`.
- The only active Python runtime file is the local worker under `EngineData/LauncherApp/Workers/realtime_local_worker.py`.

## Retired paths

Do not recreate:

```text
DeveloperData/
DevelopingData/DocumentationData/
DevelopingData/Reports/
DevelopingData/ToolKitData/
DevelopingData/Diagnostics/
DevelopingData/Docs/
DevelopingData/LauncherHelpers/
DevelopingData/SampleData/
DevelopingData/Tests/
```

## Folder rules

- `Documentation/` - current source docs, concise reports, and templates.
- `Quality/` - diagnostics and test references only.
- `Samples/` - safe, small sample references only.
- `Tooling/` - Node/PowerShell validation and maintenance scripts.

## Must not be placed here

- Runtime engine code.
- User saved sessions.
- Runtime cache files.
- Local model binaries.
- Loose experiments without a clear owner.
- Alternate launcher routes.
- Python validation scripts.

## Naming rules

- Use English only.
- Use clear module names.
- Keep documentation under `Documentation`.
- Keep project tooling under `Tooling`.
- Keep quality references under `Quality`.
- Keep safe sample references under `Samples`.
