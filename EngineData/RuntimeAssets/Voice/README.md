# Voice Runtime Assets

## Purpose

This folder is the local asset slot for Piper voice output used by TranslateIT.

## Expected local-only files

```text
Voice/
  README.md
  Piper/
    piper.exe
    *.onnx
    *.json
```

## Active orchestration route

```text
EngineData/LauncherApp/Workers/realtime_local_worker.py
```

## Rules

- Do not add legacy SAPI routes here.
- Do not add Python TTS placeholder source here.
- Keep Piper binaries, voice files, and generated audio out of Git.
