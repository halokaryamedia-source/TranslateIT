# TranslateIT Documentation

## Purpose

This is the single documentation hub for TranslateIT.

All developer documentation, research, guides, templates, reports, and source references must live under this folder. Documentation must not be scattered across separate root-level `DeveloperData`, `Docs`, `DocumentationData`, `Reports`, or ad hoc folders.

## Current layout

```text
Documentation/
  README.md
  Guides/
    Repository/
      README.md
      GitHubSetupGuide.md
  Orientation/
    README.md
  Reports/
    Engineering/
      README.md
      StructureCleanupReport.md
  Research/
    VoiceLab/
      README.md
      VoiceLabResearchBrief.md
      VoiceLabResearchNotes.md
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
3. `DevelopingData/Documentation/Source/ProjectDocumentation.md`.
4. `DevelopingData/Documentation/Source/SystemArchitecture.md`.
5. `DevelopingData/Documentation/Source/ManualTestGuide.md`.
6. `DevelopingData/Documentation/Reports/Engineering/StructureCleanupReport.md`.

## Rules

- Keep documentation here.
- Keep executable validation scripts in `DevelopingData/Tooling`.
- Keep runtime app code in `EngineData`.
- Keep user runtime output in `UserData`.
- Do not create new root-level documentation folders.
- Do not restore old documentation paths.
- Update this hub when structure or ownership changes.
