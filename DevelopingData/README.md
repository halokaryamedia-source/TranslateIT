# DevelopingData

## Purpose

`DevelopingData` is the single development workspace for TranslateIT.

It owns all developer-facing documentation, research, reports, samples, validation scripts, and tooling. There is no separate `DeveloperData`, `DocumentationData`, `Reports`, or `ToolKitData` root.

## Current professional layout

```text
DevelopingData/
  README.md
  Documentation/
    README.md
    Guides/
      Repository/
    Orientation/
    Reports/
      Engineering/
    Research/
      VoiceLab/
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

RustApp package scripts and GitHub Actions should point to this path, not to retired `ToolKitData` paths.

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

- `Documentation/` - all guides, reports, source docs, templates, and research.
- `Quality/` - diagnostics and test references only.
- `Samples/` - safe, small sample references only.
- `Tooling/` - executable validation and maintenance scripts.

## Must not be placed here

- Runtime engine code.
- User saved sessions.
- Runtime cache files.
- Local model binaries.
- Loose experiments without a README and owner.
- Alternate launcher routes.

## Naming rules

- Use English only.
- Use clear module names.
- Keep documentation under `Documentation`.
- Keep executable validation tooling under `Tooling`.
- Keep quality references under `Quality`.
- Keep safe sample references under `Samples`.
