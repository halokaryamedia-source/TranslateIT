# TranslateIT Documentation

## Purpose

This is the single documentation hub for TranslateIT.

Only current source-of-truth documentation, concise engineering reports, and maintained templates should live here. Do not restore old documentation paths or keep duplicate historical notes.

## Current layout

```text
Documentation/
  README.md
  Reports/
    Engineering/
      README.md
      StructureCleanupReport.md
  Source/
    README.md
    ProjectDocumentation.md
    SystemArchitecture.md
    ManualTestGuide.md
    ProjectHistory.md
  Templates/
    Repository/
      gitignore_template.txt
```

## What to read first

For a new AI/session or developer handoff, read in this order:

1. Root `README.md`.
2. `DevelopingData/README.md`.
3. `DevelopingData/Documentation/README.md`.
4. `DevelopingData/Documentation/Source/ProjectDocumentation.md`.
5. `DevelopingData/Documentation/Source/SystemArchitecture.md`.
6. `DevelopingData/Documentation/Source/ManualTestGuide.md`.
7. `DevelopingData/Documentation/Reports/Engineering/StructureCleanupReport.md`.
8. `EngineData/README.md`.

## Rules

- Keep documentation here.
- Keep only documents that are current and useful.
- Keep executable tooling in `DevelopingData/Tooling`.
- Keep runtime app code in `EngineData`.
- Keep user runtime output in `UserData`.
- Do not create new root-level documentation folders.
- Do not restore old documentation paths.
- Update this hub when structure or ownership changes.
