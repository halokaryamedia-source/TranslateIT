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
- `LauncherApp/` - desktop launcher, settings, state, and UI coordination
- `TranscriptEngine/` - microphone capture, calibration, VAD, ASR, and transcript filtering
- `TranslateEngine/` - local translation logic and output provider support

## Model assets
- `TranscriptEngine/ModelData/` - local ASR model files required by runtime
- `TranslateEngine/ModelData/` - local translation model files required by runtime

## Must not be placed here
- Documentation files
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
