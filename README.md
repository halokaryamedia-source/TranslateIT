# TranslateIT

TranslateIT is a local speech-to-text, translation, and voice-output desktop application.

## Root Layout

- `DeveloperData/` - technical documentation and setup references
- `DevelopingData/` - documentation, validation scripts, and developer tooling
- `EngineData/` - Rust/Tauri app, local AI worker, and local model folders
- `Launcher/` - reserved launcher packaging assets
- `UserData/` - runtime cache, logs, and saved user data
- `TranslateIT.vbs` - single root launcher entry point

## Launch

Use only:

```text
TranslateIT.vbs
```

The launcher resolves to:

```text
EngineData/LauncherApp/RustApp
```

Do not add alternate Python launcher, BAT helper, or old runtime route. The only Python allowed under `EngineData` is the local AI worker used by the Rust/Tauri app:

```text
EngineData/LauncherApp/Workers/realtime_local_worker.py
```

## Safety

- Runtime cache, logs, local models, and user-generated data stay out of Git by design.
- Keep `UserData/`, runtime model folders, and environment folders untracked.
- Keep root clean: no loose Python files, BAT scripts, logs, cache folders, or build output.
