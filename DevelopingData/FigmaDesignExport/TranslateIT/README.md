# TranslateIT Figma Design Export

Status: development/design tooling only.

Branch: `V1-Pull`

This folder is intentionally placed under `DevelopingData` because it is not part of the runtime desktop application.

Do not place Figma export tooling inside `EngineData` unless it becomes a required app runtime dependency.

## Purpose

This package provides a controlled bridge between the repo-based `DesignPreview` UI framework and Figma.

The goal is to make UI review and icon/component adjustment easier without losing source-of-truth control.

## Source of Truth Rule

Current source of truth:

1. `EngineData/Frontend/RustApp/DesignPreview/framework/*`
2. `EngineData/Frontend/RustApp/DesignPreview/icons.svg`
3. `DevelopingData/FigmaDesignExport/TranslateIT/*.json`

Figma is used for visual editing and review. After editing in Figma, changes must be translated back into the repo manifests or UI framework before they are considered ready for app sync.

## Folder Structure

```txt
DevelopingData/FigmaDesignExport/TranslateIT/
├─ README.md
├─ figma-export.manifest.json
├─ figma-tokens.json
├─ figma-icon-map.json
├─ figma-component-map.json
├─ figma-page-map.json
└─ plugin/
   ├─ manifest.json
   ├─ code.js
   └─ ui.html
```

## Workflow

1. Update DesignPreview component/token/icon source in the repo.
2. Update the Figma export manifests in this folder.
3. Run the Figma plugin manually from Figma Desktop.
4. Review or edit the generated Figma component library.
5. Record any approved Figma adjustment back into the repo manifests.
6. Render DesignPreview again.
7. Sync to Tauri only after explicit approval.

## What This Exporter Should Generate

- Page: `00 Cover / Export Notes`
- Page: `01 Foundations`
- Page: `02 Icon Registry`
- Page: `03 Components`
- Page: `04 Templates`
- Page: `05 Screens`

## Important Rules

- Do not use Figma edits as untracked source changes.
- Do not patch Tauri UI directly from Figma.
- Do not duplicate icon shapes in screen files.
- Icon shape changes must be reflected in `icons.svg`.
- Icon placement changes must be reflected in `figma-icon-map.json` and DesignPreview mapping scripts.
