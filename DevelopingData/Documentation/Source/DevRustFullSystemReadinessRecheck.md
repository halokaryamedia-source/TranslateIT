# Dev-Rust Full System Readiness Recheck

Branch: `Dev-Rust`

## Result

Repository-side recheck result: ready for local/internal test pass.

This does not mean full runtime readiness. Local execution evidence is still required.

## Checked areas

### Test command availability

The Rust/Tauri app has scripts for:

- `npm run typecheck`
- `npm run check:rust`
- `npm run build:frontend`
- `npm run validate:internal`
- `npm run validate:full`

### Frontend entry chain

```text
index.html
  -> src/main.ts
  -> LauncherController
```

Audio Studio is also loaded by the HTML entry:

```text
index.html
  -> src/audioStudioEntry.ts
  -> audioStudioThemeEntry.ts
  -> audioStudioBinding.ts
  -> audioStudioAdvancedBinding.ts
```

### Launcher refactor recheck

The refactor pass extracted the following files from the launcher controller:

```text
launcherTextRules.ts
launcherLanguageRules.ts
launcherAttachmentRules.ts
launcherDeveloperLog.ts
launcherEventBindings.ts
```

Manual static review found these modules are referenced from `launcherController.ts`.

### Tauri command chain

```text
src-tauri/src/main.rs
  -> commands/mod.rs
  -> commands/audio.rs
  -> commands/audio_studio.rs
```

Audio Studio command stubs are exposed through the Tauri invoke handler.

### Runtime model manifest

Manifest state:

```text
ready_for_internal_test: true
ready_for_full_runtime: false
```

Known blockers:

```text
torch_cuda_unavailable_for_translation
voice_actor_marcel_missing
```

## Local test order

Run from:

```text
EngineData/LauncherApp/RustApp
```

Recommended order:

```text
npm run typecheck
npm run check:rust
npm run build:frontend
npm run validate:internal
npm run dev
```

Only run this after dependencies are installed on the target PC.

## Expected result

If the commands pass, the current branch can proceed to manual app testing:

- app launch
- settings open
- chat text translation
- microphone start/stop
- Audio Studio tab visibility
- Audio Studio import staging
- Audio Studio guided staging
- Audio Studio state update buttons
- developer diagnostics

## Do not claim yet

Do not claim full runtime readiness until target-PC evidence confirms:

- local build passes
- Rust check passes
- frontend build passes
- app launches
- capture flow works
- translation runtime works
- output playback works
- packaging works
