# ASR Runtime Assets

## Purpose

This folder is the local asset slot for speech-to-text models used by TranslateIT.

## Expected local-only files

```text
ASR/
  README.md
  ModelData/
    faster-whisper-large-v3-turbo/
      model.bin
      ...
```

## Active orchestration route

```text
EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py
```

## Rules

- Do not add ASR source modules here.
- Do not add microphone capture, VAD, or transcript session code here.
- Keep model binaries out of Git.
