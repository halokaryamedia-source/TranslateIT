# DevelopingData

## Purpose

`DevelopingData` is the development-only workspace for TranslateIT.

It owns developer-facing documentation, concise reports, safe sample references, QA references, and maintenance tooling. It is not part of the release root and must not contain active runtime engine files.

## Release rule

When TranslateIT is prepared for release, `DevelopingData` can be excluded safely. The app must not depend on files from this folder at runtime.

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

All durable development documentation must live there. Do not scatter documentation into root-level or parallel folders.

## Development tooling route

```text
DevelopingData/Tooling/Scripts/Execution
```

This folder is for developer maintenance and validation only. Runtime app code must not import, load, or depend on it.

## Tooling language policy

- Rust/Tauri and repository checks use Node or PowerShell tooling.
- Do not add Python validation scripts under `DevelopingData`.
- The only approved Python runtime route is the local worker under `EngineData/LauncherApp/Workers/realtime_local_worker.py`.

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
- `Tooling/` - development-only Node/PowerShell maintenance scripts.

## Must not be placed here

- Runtime engine code.
- Frontend app source.
- Backend runtime source.
- User saved sessions.
- Runtime cache files.
- Local model binaries.
- Alternate launcher routes.
- Release-required scripts.
- Python validation scripts.

## Naming rules

- Use English only.
- Use clear module names.
- Keep documentation under `Documentation`.
- Keep project tooling under `Tooling`.
- Keep quality references under `Quality`.
- Keep safe sample references under `Samples`.
