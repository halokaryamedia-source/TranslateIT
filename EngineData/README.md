# EngineData

## Purpose

`EngineData` is the application runtime layer. It should be modular, easy to update, and free from old competing engine routes.

## Current professional layout

```text
EngineData/
  README.md
  LauncherApp/
    README.md
    RustApp/
      package.json
      src/
      src-tauri/
    Workers/
      README.md
      realtime_local_worker.py
      requirements-realtime.txt
      setup_realtime_worker.ps1
      run_realtime_worker_smoke.ps1
      realtime_stack_manifest.json
  TranscriptEngine/
    README.md
    ModelData/              # ignored local ASR model assets
  TranslateEngine/
    README.md
    ModelData/              # ignored local translation model assets
  VoiceEngine/
    README.md               # local Piper runtime slot when present
    Piper/                  # ignored local Piper executable and voices
```

## Active runtime route

The user-facing app route is single-route:

```text
TranslateIT.vbs -> EngineData/LauncherApp/RustApp
```

The Rust/Tauri app may call the local worker:

```text
EngineData/LauncherApp/Workers/realtime_local_worker.py
```

That Python worker is intentionally retained for local ASR, translation, and TTS inference orchestration. It is not a legacy launcher or UI engine.

## Rules

- Do not add Python launcher/UI modules back under `EngineData/LauncherApp`.
- Do not add Python source modules under `TranscriptEngine` or `TranslateEngine`; those folders are now model/runtime asset slots plus README documentation.
- Keep user data, logs, cache, generated audio, and model binaries out of Git.
- Add new runtime features inside Rust/Tauri first, then bridge to the worker only when local inference is required.
- Every folder that has a runtime responsibility must include a README explaining ownership and update rules.
