# LauncherApp

## Purpose
- Hold the desktop launcher, UI state, and settings view logic for TranslateIT.
- Hold the new Rust/Tauri conversion scaffold while the Python launcher remains the behavior reference.

## Allowed files
- `README.md`
- UI entry files
- State and view-model files
- Minimal app configuration files
- Replay controller files
- `RustApp/`

## Current sections
- Python launcher modules remain the current runtime reference.
- `RustApp/` contains the Tauri frontend and Rust command bridge scaffold for `ChatGPT-ConvertEngine`.

## Must not be placed here
- Audio capture implementation that belongs in `TranscriptEngine/`
- ASR engine code that belongs in `TranscriptEngine/`
- Translation engine code that belongs in `TranslateEngine/`
- General project documentation outside folder README files
- User cache or saved-session data

## Naming rules
- Use English only.
- Keep UI module names clear and direct.
- Keep the launcher thin and focused on presentation and app coordination.
- During conversion, keep pending Rust features explicitly labeled instead of reporting false readiness.

## Related documentation path
- `../../DevelopingData/DocumentationData/SourceDocument/MASTER_PROJECT_DOCUMENTATION.md`
- `../../DevelopingData/DocumentationData/SourceDocument/ProjectDocuments/RUST_TAURI_ENGINE_CONVERSION_PLAN.md`
