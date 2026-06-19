# Model Setup and Readiness

## Branch
`Dev-Pack`

## Commit Baseline
`ea645687`

## Model Manifest

`EngineData/Backend/LocalWorker/WorkerRuntime/model_manifest.json`

## Required Models

- `faster-whisper-large-v3-turbo` - ASR primary
- `marianmt-id-en` - realtime translation
- `nllb-200-distilled-600M` - quality translation
- `piper` - local TTS fallback

## Optional Models

- `faster-whisper-medium` - ASR backup

## Commands

- `npm.cmd run models:inventory`
- `npm.cmd run models:setup`
- `npm.cmd run models:verify`
- `npm.cmd run validate:gpu-policy`

## Local Result

- `models:inventory`: `BLOCKED`
- `models:setup`: `BLOCKED`
- `models:verify`: `BLOCKED`

## Why It Is Blocked

- The manifest currently has `download_url: null` for all required models.
- The runtime can see the expected model paths, but the files are not present.

## GPU / CPU Policy

- GPU is treated as the primary path when available.
- CPU fallback is allowed and must be labeled as degraded mode.
- `CUDA false` is not treated as a hard blocker if the CPU fallback path is valid.

## Next Action

- Add official model download URLs and checksums to the manifest, or place the model files at the expected runtime asset paths.

