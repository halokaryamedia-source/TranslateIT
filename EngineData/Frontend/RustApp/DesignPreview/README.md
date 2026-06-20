# TranslateIT DesignPreview

Status: design-review source only. This is not the final Tauri launcher and is not approved until the user approves the rendered HTML preview.

Working branch for this pass: `V1-Pull`.

Protected branch: `V1` must not be edited, merged into, or described as updated unless the user explicitly asks.

## Reference lock

The UI framework in this folder is rebuilt from `Preview UI.zip` and follows these approved references:

- Main Page: `02_main_page_v28_reference.png`
- Audio Settings: `03_audio_settings_v22_reference.png`
- Translate Settings: `04_translate_settings_v14_reference.png`
- Developer Settings: `05_developer_settings_v37_reference.png`

`Main Page v29` is intentionally not used.

## Folder structure

```txt
DesignPreview/
├─ index.html
├─ README.md
├─ icons.svg
├─ reference/
│  ├─ README.md
│  └─ ui-reference.manifest.json
└─ framework/
   ├─ 00-reset.css
   ├─ 01-tokens.css
   ├─ 02-layout.css
   ├─ 03-components.css
   ├─ 04-patterns.css
   ├─ 05-templates.css
   └─ 06-preview-board.css
```

## Naming system

- `ti-l-*` = layout shell and structural layout.
- `ti-c-*` = reusable component.
- `ti-p-*` = repeated composed pattern.
- `ti-t-*` = full screen template.
- `ti-v-*` = preview board only.
- `is-*` = state class.
- `has-*` = condition/state class.

## Icon rule

All repeated app icons must come from `icons.svg` and use `.ti-c-icon`.

Do not use random emoji, text symbols, or one-off icon markup for repeated UI icons.

## Cleanup rule

The old mixed preview files are removed from the active DesignPreview framework:

- `ui-tokens.css`
- `ui-components.css`
- `ui-templates.css`

The active framework is under `framework/` only.

## Sync rule

Do not sync this UI into the Tauri app until the user explicitly approves the rendered DesignPreview output.
