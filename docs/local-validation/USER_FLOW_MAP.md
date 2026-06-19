# User Flow Map

## Branch
`Dev-Pack`

## Main Flow

1. App boot
2. User opens Settings
3. User reviews General / Audio / Translate / Developer tabs
4. User checks model inventory and GPU policy
5. User clicks microphone
6. App checks microphone device
7. App checks helper readiness
8. App starts helper if needed
9. App polls worker status
10. App starts voice capture when provider readiness is available
11. App shows ASR, translation, and TTS results or blockers

## Trace Events

- `app.boot`
- `startup.complete`
- `home.visible`
- `settings.click`
- `settings.opened`
- `settings.tab.general`
- `settings.tab.audio`
- `settings.tab.translate`
- `settings.tab.developer`
- `settings.back`
- `text.input.focus`
- `text.submit`
- `text.translation.result`
- `mic.click`
- `mic.device_check.start`
- `mic.device_check.result`
- `helper.status.check`
- `helper.start.request`
- `helper.start.result`
- `worker.status.result`
- `model.inventory.result`
- `voice.capture.prepare`
- `voice.capture.blocked`
- `voice.capture.started`
- `voice.capture.stopped`
- `asr.result`
- `translation.voice.result`
- `tts.result`
- `error.user_visible`

## Validation Commands

- `npm.cmd run validate:settings-navigation`
- `npm.cmd run validate:user-flow`
- `npm.cmd run validate:voice-capture`
- `npm.cmd run validate:auto`

## Notes

- Settings routing now opens the real Settings page.
- Flow tracing is stored in memory and mirrored to localStorage for diagnostics.
- The voice capture path still depends on local worker/model readiness for real capture.

