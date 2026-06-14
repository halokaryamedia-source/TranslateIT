# DevelopingData

## Purpose

`DevelopingData` is the single development workspace for TranslateIT.

It owns all developer-facing documentation, research, reports, samples, validation scripts, and tooling. There is no separate `DeveloperData`, `DocumentationData`, `Reports`, or `ToolKitData` root.

## Professional layout

```text
DevelopingData/
  README.md
  Documentation/
    README.md
    Guides/
    Orientation/
    Reports/
    Research/
    Source/
    Templates/
  Quality/
    Diagnostics/
    Tests/
  Samples/
  Tooling/
    Scripts/
      Execution/
```

## Current rule

Keep all development material here. Keep runtime engine code in `EngineData`. Keep user cache, logs, and saved work in `UserData`.

## Active documentation route

```text
DevelopingData/Documentation
```

## Active tooling route

```text
DevelopingData/Tooling/Scripts/Execution
```

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

## Must not be placed here

- Runtime engine code
- User saved sessions
- Runtime cache files
- Local model binaries
- Loose experiments without a README and owner
- Alternate launcher routes

## Naming rules

- Use English only.
- Use clear module names.
- Keep documentation under `Documentation`.
- Keep executable validation tooling under `Tooling`.
- Keep quality references under `Quality`.
- Keep safe sample references under `Samples`.
