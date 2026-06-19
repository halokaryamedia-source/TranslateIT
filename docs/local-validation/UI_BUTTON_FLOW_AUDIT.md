# TranslateIT UI Button Flow Audit

## Scope
- Settings gear routing
- Settings tab navigation
- Developer helper bridge actions
- Audio and translate controls
- Sidebar/home action buttons

## Manual Smoke Checklist

### App Launch
- Launch the app.
- Confirm the warmup screen transitions into the main UI.

### Shell / Sidebar
- Click `New Chat`.
- Click `Recent Chat`.
- Click `Unsaved Chat`.
- Click `Saved Chat`.
- Click `Local Data`.

### Footer / Composer
- Click `Quick Mic`.
- Click `Mic Options`.
- Click `Voice Output`.
- Click `Voice Options`.
- Click `Settings`.
- Click `Record Status`.
- Click `Check Microphone`.
- Click `Start Helper`.
- Click `Check Worker Status`.
- Click `Open Developer Diagnostics`.
- Click `Composer +`.
- Click `Microphone`.
- Click `Send`.

### Settings Navigation
- Click `Back`.
- Click `General`.
- Click `Audio`.
- Click `Translate`.
- Click `Developer`.

### General Settings
- Click `Runtime Profile`.
- Click `Language Focus`.
- Click `Save Settings`.
- Click `Reset Settings`.

### Audio Settings
- Click `Check Microphone`.
- Click `Mic Test`.
- Click `Voice Toggle`.
- Click `Voice Mode`.

### Translate Settings
- Click `Source Language`.
- Click `Target Language`.
- Click `Swap Languages`.
- Click `Realtime`.
- Click `Quality`.
- Click `Save Translate`.

### Developer Settings
- Click `Run Diagnostic`.
- Click `See All Logs`.
- Click `Start Helper`.
- Click `Worker Status`.
- Click `Stop Helper`.
- Click `Cancel Task`.
- Click `Preview Capture Start`.
- Click `Preview Capture Stop`.

## Expected Outcomes
- Every clickable control either performs the expected action or is clearly disabled/coming soon.
- Settings gear opens the real Settings page.
- Developer helper controls produce a visible status/update.
- No visible button should be a silent no-op.

## Validation Commands
- `npm.cmd run typecheck`
- `npm.cmd run build:frontend`
- `npm.cmd run validate:settings-navigation`
- `npm.cmd run validate:ui-buttons`

