# TranscriptEngine

## Status

`TranscriptEngine` is no longer a Python source-engine folder.

The active ASR orchestration route is:

```text
EngineData/LauncherApp/Workers/realtime_local_worker.py
```

## Purpose

This folder is reserved for local ASR model assets and transcript-engine documentation.

## Expected local-only asset slot

```text
TranscriptEngine/
  README.md
  ModelData/
    faster-whisper-large-v3-turbo/
      model.bin
      ...
```

`ModelData/` is intentionally ignored by Git because local model files can be large.

## Rules

- Do not add Python ASR pipeline source here.
- Do not add microphone capture, VAD, or transcript session source modules here.
- Keep local ASR inference orchestration in `LauncherApp/Workers/` until a native Rust implementation replaces it.
- Keep model binaries out of Git.
