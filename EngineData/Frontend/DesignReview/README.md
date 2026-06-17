# Frontend DesignReview

## Purpose

`DesignReview` owns preview-only UI references and approval notes.

These files are not packaged launcher runtime files. After a design is approved, only the approved structure and styling should be copied into the active Tauri frontend source.

## Current layout

```text
DesignReview/
  README.md
  DesignPreview/
    index.html
    ui-tokens.css
    ui-components.css
    ui-templates.css
    icons.svg
  UIReference/
    README.md
    CssImportantAudit.md
    reference_images_manifest.json
  UIPageTemplate.md
  UIReferenceGuide.md
```

## Rules

- Do not treat preview files as packaged launcher code.
- Do not store UI reference documents in the RustApp root.
- Do not use this folder for backend code.
- Keep approved UI changes synchronized manually into the Tauri source after review.
