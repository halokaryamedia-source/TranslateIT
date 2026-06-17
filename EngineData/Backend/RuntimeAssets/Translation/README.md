# Translation Runtime Assets

## Purpose

This folder is the local asset slot for translation models used by TranslateIT.

## Expected local-only files

```text
Translation/
  README.md
  ModelData/
    marianmt-id-en/
      config.json
      ...
    nllb-200-distilled-600M/
      config.json
      ...
```

## Active orchestration route

```text
EngineData/LauncherApp/Workers/realtime_local_worker.py
```

## Rules

- Do not add translation source modules here.
- Do not add TTS placeholder or voice provider source modules here.
- Keep model binaries out of Git.
