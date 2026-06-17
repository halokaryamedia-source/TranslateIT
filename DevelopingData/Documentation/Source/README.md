# Source Documentation

## Purpose

This folder contains the current source-of-truth project documentation after consolidating old `DeveloperData`, `DocumentationData`, `Reports`, and `ToolKitData` materials.

## Documents

- `ProjectDocumentation.md` - current project overview, active route, ownership, and professional readiness position.
- `SystemArchitecture.md` - runtime architecture, module ownership, local worker boundary, and validation route.
- `ManualTestGuide.md` - required local validation checklist before any professional-ready claim.
- `ProjectHistory.md` - condensed migration and cleanup history.
- `RootFileRules.md` - rootfile ownership, file placement rules, release boundary, retired paths, and future Codex/AI placement guide.

## Current route summary

```text
EngineData/LauncherApp/RustApp -> current physical Tauri app package
EngineData/LauncherApp/App -> approved future package name after full path migration
```

## Current tooling summary

```text
DevelopingData/Tooling/Scripts/Execution
```

Tooling is development-only and must not become a runtime dependency.

## Rules

- Keep current source documentation here.
- Use `RootFileRules.md` before adding or moving repository paths.
- Do not restore `DeveloperData`.
- Do not restore `DevelopingData/DocumentationData`.
- Do not restore `DevelopingData/Reports`.
- Do not restore `DevelopingData/ToolKitData`.
- Historical reports belong in `DevelopingData/Documentation/Reports` only when still useful and concise.
