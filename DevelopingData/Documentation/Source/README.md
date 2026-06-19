# Source Documentation

## Purpose

This folder contains the current source-of-truth project documentation after consolidating older development-documentation roots.

## Documents

- `ProjectDocumentation.md` - current project overview, active route, ownership, and professional readiness position.
- `SystemArchitecture.md` - runtime architecture, module ownership, local worker boundary, and validation route.
- `ManualTestGuide.md` - required local validation checklist before any professional-ready claim.
- `RootFileRules.md` - rootfile ownership, file placement rules, release boundary, and future Codex/AI placement guide.

## Current route summary

```text
EngineData/Frontend/RustApp -> active physical Tauri app package
EngineData/Frontend/ -> frontend ownership root
EngineData/Backend/ -> backend ownership root
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
