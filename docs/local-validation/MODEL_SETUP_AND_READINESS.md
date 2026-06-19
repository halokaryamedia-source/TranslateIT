# Model Setup and Readiness

## Branch
`Dev-Pack`

## Commit Baseline
`f68e0788`

## Model Manifest

`EngineData/Backend/LocalWorker/WorkerRuntime/model_manifest.json`

## Required Models

- `faster-whisper-medium` - required ASR fallback model
- `marianmt-id-en` - realtime translation
- `nllb-200-distilled-600M` - quality translation

## Optional / Preferred Models

- `faster-whisper-large-v3-turbo` - preferred ASR model when available
- `piper` - local TTS voice pack; Windows SAPI is the working fallback

## Commands

- `npm.cmd run models:find-existing`
- `npm.cmd run models:reconcile`
- `npm.cmd run models:inventory`
- `npm.cmd run models:setup`
- `npm.cmd run models:verify`
- `npm.cmd run setup:worker`
- `npm.cmd run smoke:worker`
- `npm.cmd run smoke:worker:quality`

## Local Result

- `models:find-existing`: PASS
- `models:reconcile`: PASS
- `models:inventory`: PARTIAL
- `models:setup`: PASS
- `models:verify`: PARTIAL

## What Was Found

- `faster-whisper-medium` was present in `EngineData/TranscriptEngine/ModelData/faster-whisper-medium`
- `marianmt-id-en` was present in `EngineData/TranslateEngine/ModelData/marianmt-id-en`
- `nllb-200-distilled-600M` was present in `EngineData/TranslateEngine/ModelData/nllb-200-distilled-600M`
- `faster-whisper-large-v3-turbo` only had cache metadata and no usable marker files
- `piper` was not present; Windows SAPI is the active local fallback

## Runtime Mapping

The model roots were mapped into the worker runtime path using local directory junctions:

- `EngineData/Backend/RuntimeAssets/ASR/ModelData/faster-whisper-medium`
- `EngineData/Backend/RuntimeAssets/Translation/ModelData/marianmt-id-en`
- `EngineData/Backend/RuntimeAssets/Translation/ModelData/nllb-200-distilled-600M`

## Worker Result

- `setup:worker`: PASS
- `smoke:worker`: PASS
- `smoke:worker:quality`: PASS

## GPU / CPU Policy

- GPU remains the preferred path when available.
- CPU fallback is allowed and labeled as degraded mode.
- This machine currently reports `torch_cuda_available: false`, so the worker runs on CPU for the smoke path.
- The runtime still distinguishes GPU readiness from model presence.

## LLM Requirement

The repo contains English/Indonesian language-quality LLM helpers under `EngineData/TranslateEngine`, but no repository-level runtime manifest currently declares an enforced LLM requirement for the local worker.

## Remaining Gaps

- Preferred ASR model `faster-whisper-large-v3-turbo` is still missing its usable model files.
- Piper voice assets are still missing, so TTS uses Windows SAPI fallback.

## How To Repair Missing Models

1. Re-run `npm.cmd run models:setup`.
2. If the preferred ASR model source remains incomplete, keep using `faster-whisper-medium` as the local fallback.
3. Add a verified Piper release/voice asset source if custom voice TTS is required.

