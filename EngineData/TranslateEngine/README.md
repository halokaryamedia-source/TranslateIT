# TranslateEngine

## Status

`TranslateEngine` is no longer a Python source-engine folder.

The active translation orchestration route is:

```text
EngineData/LauncherApp/Workers/realtime_local_worker.py
```

## Purpose

This folder is reserved for local translation model assets and translation-engine documentation.

## Expected local-only asset slots

```text
TranslateEngine/
  README.md
  ModelData/
    marianmt-id-en/
      config.json
      ...
    nllb-200-distilled-600M/
      config.json
      ...
```

`ModelData/` is intentionally ignored by Git because local model files can be large.

## Rules

- Do not add Python translation source modules here.
- Do not add TTS placeholder or voice provider source modules here.
- Keep translation inference orchestration in `LauncherApp/Workers/` until a native Rust implementation replaces it.
- Keep model binaries out of Git.
