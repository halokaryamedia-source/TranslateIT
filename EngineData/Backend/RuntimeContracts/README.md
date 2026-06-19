# Backend RuntimeContracts

## Purpose

`RuntimeContracts` owns backend JSON contracts and runtime readiness manifests.

These files describe the backend contract surface. They should not be stored in the RustApp root.

## Files

```text
ATTACHMENT_RUNTIME_CONTRACT.json
AUDIO_PIPELINE_RUNTIME_CONTRACT.json
TRANSLATION_RUNTIME_CONTRACT.json
MODEL_RUNTIME_MANIFEST.json
```

## Rules

- Keep contract filenames stable because backend logic may reference them directly.
- Keep generated model binaries out of this folder.
- Keep validation reports under `DevelopingData/Documentation/Reports/Engineering`.
