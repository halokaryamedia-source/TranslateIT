# Translation Runtime Assets

This folder is the local-only asset slot for TranslateIT's canonical Indonesian ↔ English translator.

## Canonical snapshot

```text
Translation/
  README.md
  ModelData/
    xiaomi-research--MiLMMT-46-1B-v1.0/
      .translateit_model_revision
      config.json
      generation_config.json
      model.safetensors
      tokenizer.json
      tokenizer.model
      tokenizer_config.json
      ...
```

Identity and immutable revision are owned by:

```text
EngineData/Backend/LocalWorker/WorkerRuntime/model_manifest.json
```

Current authority:

```text
xiaomi-research/MiLMMT-46-1B-v1.0
revision 4fc480b6c58dec29c159dcdf9fde0f6d5c354995
license: Gemma
```

`prepare_model_assets.py` acquires the pinned Hugging Face snapshot. After a successful atomic replacement it writes `.translateit_model_revision`. `realtime_local_worker.py` does not consider the model ready unless that marker matches the exact manifest revision.

## Rules

- Keep one canonical resident bidirectional model for ID → EN and EN → ID.
- Do not restore M2M100, Marian, or another translator as an automatic fallback/router.
- Keep model binaries out of Git.
- Do not add translation source modules under RuntimeAssets.
- Asset presence/revision is installation evidence only; it does not prove target CUDA, quality, latency, or Meeting delivery.
