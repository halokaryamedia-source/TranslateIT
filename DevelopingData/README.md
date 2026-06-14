# DevelopingData

## Purpose

`DevelopingData` is the single development workspace for TranslateIT.

It now owns all developer-facing documentation, research, reports, samples, validation scripts, and tooling. There is no separate `DeveloperData` root.

## Professional layout

```text
DevelopingData/
  README.md
  Documentation/
    Guides/
    Research/
    Templates/
  DocumentationData/        # existing formal source documents, pending deeper migration
  Reports/                  # engineering reports, pending deeper migration
  SampleData/               # safe sample references
  Tests/                    # validation/test references
  ToolKitData/              # active validation/tooling scripts used by RustApp package scripts
```

## Current rule

Keep all development material here. Keep runtime engine code in `EngineData`. Keep user cache/logs/saved work in `UserData`.

## Active tooling route

The RustApp package scripts currently call validation tools from:

```text
DevelopingData/ToolKitData/Scripts/Execution
```

That folder remains active until the full validation path migration is completed. Do not create random top-level tool folders.

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
- Prefer `Documentation`, `Reports`, `SampleData`, `Tests`, and `ToolKitData` ownership instead of ad hoc folders.
- Future cleanup should migrate `DocumentationData` into `Documentation/Source` and reports into `Documentation/Reports` only after all references are updated.
