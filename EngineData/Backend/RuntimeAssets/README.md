# RuntimeAssets

## Purpose

`RuntimeAssets` is the local asset area for TranslateIT runtime dependencies owned by the backend layer.

## Layout

```text
RuntimeAssets/
  README.md
  ASR/
    ModelData/          # local Faster Whisper assets, ignored by Git
  Translation/
    ModelData/          # local MarianMT and NLLB assets, ignored by Git
  Voice/
    Piper/              # local Piper executable and voice files, ignored by Git
```

## Rules

- Do not add Python, Rust, TypeScript, or launcher source code here.
- Keep all model binaries, ONNX files, generated audio, and Piper runtime files out of Git.
- Runtime orchestration remains in `EngineData/Backend/LauncherApp/Workers/realtime_local_worker.py` after full build-route migration.
- Current active app route remains documented separately until build-path migration is complete.
