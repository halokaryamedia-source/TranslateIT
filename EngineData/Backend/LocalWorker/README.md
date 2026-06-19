# Backend LocalWorker

## Purpose

`LocalWorker` owns the backend Python worker route for local ASR, translation, and TTS orchestration.

Current active worker source:

```text
EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py
```

## Layout

```text
LocalWorker/
  README.md
  WorkerRuntime/
    README.md
    realtime_local_worker.py
    requirements-realtime.txt
    realtime_stack_manifest.json
    setup_realtime_worker.ps1
    run_realtime_worker_smoke.ps1
```

## Owns

- Local ASR worker orchestration.
- Local translation worker orchestration.
- Local TTS worker orchestration.
- Worker setup and smoke validation scripts.
- Worker manifest documentation.

## Rules

- Keep the Python worker isolated to the backend worker route.
- Do not add Python launcher or UI modules.
- Do not move worker code into `DevelopingData`.
- Do not store local model binaries in Git.
