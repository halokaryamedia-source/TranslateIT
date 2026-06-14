# VoiceEngine

## Purpose

`VoiceEngine` is the local voice runtime asset slot for TranslateIT.

## Expected local-only asset slot

```text
VoiceEngine/
  README.md
  Piper/
    piper.exe
    *.onnx
    *.json
```

`Piper/` runtime files are intentionally ignored by Git because local voice assets and binaries can be large.

## Active route

Voice/TTS orchestration is handled by:

```text
EngineData/LauncherApp/Workers/realtime_local_worker.py
```

The Rust/Tauri app must call the worker route rather than adding separate Python TTS modules.

## Rules

- Do not add legacy SAPI routes here.
- Do not add Python TTS placeholder source here.
- Keep local voice binaries and generated audio out of Git.
- Add future voice integration through Rust/Tauri settings and the approved local worker bridge.
