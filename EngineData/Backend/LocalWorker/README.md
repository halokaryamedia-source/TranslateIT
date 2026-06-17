# Backend LocalWorker

## Purpose

`LocalWorker` documents the approved local worker ownership route.

Current active worker source is still inside:

```text
EngineData/LauncherApp/Workers/realtime_local_worker.py
```

## Owns

- Local ASR worker orchestration.
- Local translation worker orchestration.
- Local TTS worker orchestration.
- Worker setup and smoke validation scripts.
- Worker manifest documentation.

## Rules

- Keep the Python worker isolated to the approved worker route.
- Do not add Python launcher or UI modules.
- Do not move worker code into `DevelopingData`.
- Do not store local model binaries in Git.
