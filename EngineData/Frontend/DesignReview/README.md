# Frontend DesignReview

## Purpose

`DesignReview` is for preview-only UI references and approval notes.

Design review files are not release runtime files. After a design is approved, only the approved structure and styling should be moved into the active Tauri frontend source.

## Owns

- UI preview notes.
- Design approval references.
- Visual direction documentation.
- Non-runtime HTML/CSS/SVG review references.

## Rules

- Do not treat preview files as packaged launcher code.
- Do not use this folder for backend code.
- Keep approved UI changes synchronized manually into the Tauri source after review.
