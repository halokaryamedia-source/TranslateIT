# TranslateIT

TranslateIT is a local speech-to-text, translation, and voice-output application.

## Root Layout

- `DevelopingData/` - documentation, diagnostics, tests, and developer tooling
- `EngineData/` - launcher, transcript, and translation engine code
- `UserData/` - runtime cache, logs, and saved user data
- `TranslateIT.vbs` - root launcher entry point

## Launch

- Use `TranslateIT.vbs` for the normal launcher path.
- Use the helper scripts under `DevelopingData/LauncherHelpers/` for debug and runtime setup flows.

## Safety

- Runtime cache, logs, local models, and user-generated data stay out of Git by design.
- Keep `UserData/`, runtime model folders, and environment folders untracked.
