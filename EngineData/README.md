# EngineData

## Purpose
- Hold the application runtime layers and launcher code.
- Keep UI orchestration, transcription, and translation responsibilities separated.
- Treat this folder as the executable engine layer of TranslateIT.

## Allowed files
- `README.md`
- `LauncherApp/`
- `TranscriptEngine/`
- `TranslateEngine/`

## Current sections
- `LauncherApp/` - desktop launcher, settings, state, UI coordination, and the new Rust/Tauri conversion scaffold under `LauncherApp/RustApp/`
- `TranscriptEngine/` - microphone capture, calibration, VAD, ASR, and transcript filtering
- `TranslateEngine/` - local translation logic and output provider support

## Rust/Tauri conversion note
- The active conversion branch is `ChatGPT-ConvertEngine`.
- The Rust/Tauri scaffold lives at `EngineData/LauncherApp/RustApp/`.
- The existing Python engine remains the behavior reference until Rust parity is proven.
- Do not remove the Python runtime folders until the final conversion gate passes.

## Model assets
- `TranscriptEngine/ModelData/` - local ASR model files required by runtime
- `TranslateEngine/ModelData/` - local translation model files required by runtime

## Must not be placed here
- Documentation files outside approved folder README files
- User cache
- Saved transcript exports
- Random scripts outside the approved engine folders
- UserData files

## Naming rules
- Use English only.
- Keep engine folder names unchanged.
- Use clear, descriptive module names inside each engine folder.

## Related documentation path
- `DevelopingData/DocumentationData/SourceDocument/MASTER_PROJECT_DOCUMENTATION.md`
- `DevelopingData/DocumentationData/SourceDocument/ProjectDocuments/RUST_TAURI_ENGINE_CONVERSION_PLAN.md`
