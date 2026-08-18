# Translation Runtime Assets

## Purpose

This folder is the local asset slot for the canonical translation model used by TranslateIT.

## Expected local-only files

```text
Translation/
  README.md
  ModelData/
    m2m100-418m/
      config.json
      generation_config.json
      pytorch_model.bin
      sentencepiece.bpe.model
      vocab.json
      ...
```

The canonical model identity and immutable revision are owned by:

```text
EngineData/Backend/LocalWorker/WorkerRuntime/model_manifest.json
```

Developer acquisition uses `prepare_model_assets.py` and the manifest allowlist so the PyTorch runtime does not download the duplicate unused Rust-framework weight.

## Active orchestration route

```text
EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py
```

## Rules

- Keep one canonical bidirectional Indonesian ↔ English translation model; do not restore Marian as a fallback/router.
- Do not add translation source modules here.
- Do not add TTS placeholder or voice provider source modules here.
- Keep model binaries out of Git.
- Asset presence is not translation-quality, CUDA, CPU, latency, or Meeting-runtime proof.
