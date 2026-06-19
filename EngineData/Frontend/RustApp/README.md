# TranslateIT Frontend Package

`RustApp` is the active Tauri package.

## Quick Map

```txt
RustApp/
├─ src/             # active frontend source
├─ src-tauri/       # active Rust/Tauri backend bridge
├─ Preview/         # preview-only UI and prototype work
├─ docs/            # package-level documentation
├─ scripts/         # package-level tooling and validation scripts
├─ page-template.md # UI page template reference
├─ ui-reference.md  # UI reference rules
├─ index.html       # app entry point
└─ package.json     # package scripts and dependencies
```

## Package route

```text
EngineData/Frontend/RustApp
```

## Source

- `src/app/active-launcher/` for active frontend runtime modules
- `src-tauri/src/` for Rust commands and engine bridge
- `index.html` for the app entry point

## App docs

- `Preview/`
- `page-template.md`
- `ui-reference.md`
- `docs/ui-reference/`

## Separation rule

- Put live UI behavior, state, and runtime views in `src/app/active-launcher/`.
- Put preview or prototype-only material in `Preview/`.
- Do not mix preview assets into the active runtime flow unless they are explicitly promoted to production.

## Rule

- Keep this package active and focused on runtime code only.
- Keep function ownership notes in `EngineData/Frontend/*` instead of growing this README.

