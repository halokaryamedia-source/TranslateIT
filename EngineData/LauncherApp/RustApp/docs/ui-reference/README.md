# UI Reference Assets

This folder is the permanent reference location for TranslateIT launcher UI screenshots and visual contracts.

Required reference screens:

- `main_page_v28_reference.png`
- `audio_settings_v22_reference.png`
- `translate_settings_v14_reference.png`
- `developer_settings_v37_reference.png`

The current file `reference_images_manifest.json` stores the official screenshot names and SHA-256 checksums from the accepted preview package.

## Rules

- Do not replace a reference image without updating the manifest checksum.
- Do not update `src/referenceLayout.css` without comparing against these references.
- New pages must follow `../UI_REFERENCE_GUIDE.md` from the RustApp root.
- New backend-connected controls must be added to `scripts/validate_ui_reference.mjs`.
- UI changes are not final until `npm run validate:ui-reference` passes and a preview screenshot is compared.

## Runtime CSS Order

The reference visual lock depends on this import order in `src/main.ts`:

1. `styles.css`
2. `settingsLayout.css`
3. `launcherGuard.css`
4. `referenceLayout.css`

`referenceLayout.css` must remain last.
