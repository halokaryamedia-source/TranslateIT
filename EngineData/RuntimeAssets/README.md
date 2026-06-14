# RuntimeAssets

## Purpose

`RuntimeAssets` is the single local asset area for TranslateIT runtime dependencies that should not be mixed with app source code.

## Layout

```text
RuntimeAssets/
  README.md
  ASR/
    README.md
    ModelData/          # local Faster Whisper assets, ignored by Git
  Translation/
    README.md
    ModelData/          # local MarianMT and NLLB assets, ignored by Git
  Voice/
    README.md
    Piper/              # local Piper executable and voice files, ignored by Git
```

## Rules

- Do not add Python, Rust, TypeScript, or launcher source code here.
- Keep all model binaries, ONNX files, generated audio, and Piper runtime files out of Git.
- Runtime orchestration remains in `EngineData/LauncherApp/Workers/realtime_local_worker.py`.
- Desktop app routing remains `TranslateIT.vbs -> EngineData/LauncherApp/RustApp`.
