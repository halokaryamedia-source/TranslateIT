# TranslateIT Project Documentation

## Current direction

TranslateIT is a local desktop app for speech-to-text, translation, and voice output.

## Active runtime route

```text
TranslateIT.vbs -> EngineData/LauncherApp/RustApp
```

## Engine ownership

```text
EngineData/
  LauncherApp/
    RustApp/       # active desktop app shell
    Workers/       # local AI worker for ASR, translation, and TTS
  TranscriptEngine/ # local ASR model asset slot
  TranslateEngine/  # local translation model asset slot
  VoiceEngine/      # local Piper voice asset slot
```

## Development ownership

```text
DevelopingData/
  Documentation/   # all documentation, guides, research, reports, templates
  Quality/         # diagnostics and test references
  Samples/         # safe sample references
  Tooling/         # executable validation and maintenance scripts
```

## Professional rules

- Do not restore `DeveloperData`.
- Do not restore `DevelopingData/ToolKitData`.
- Do not scatter documentation outside `DevelopingData/Documentation`.
- Do not add legacy Python app engines under `EngineData`.
- The only approved Python file under `EngineData` is the local AI worker until a native Rust inference layer replaces it.
