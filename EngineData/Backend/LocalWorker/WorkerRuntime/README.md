# Backend Local Worker Runtime

This folder contains the backend-owned local worker used by the current Tauri desktop runtime.

## Runtime Contract

The worker communicates through newline-delimited JSON on stdin/stdout. Each command returns one JSON object and does not claim production readiness by itself.

Supported commands:

- `status`
- `asr_preload`
- `transcribe`
- `translation_preload`
- `translate`
- `tts_preflight`
- `synthesize`

## Current Local Stack

| Stage | Realtime profile | Quality profile |
| --- | --- | --- |
| ASR | Faster Whisper Large V3 Turbo | Faster Whisper Large V3 Turbo |
| Translation | MarianMT ID-EN | NLLB 200 distilled 600M |
| TTS | Piper | Piper |

Named providers/models are current implementation evidence, not permanent product identity. Provider/model changes remain owned by the local-AI runtime boundary.

## Required Runtime Assets

```text
EngineData/Backend/RuntimeAssets/ASR/ModelData/faster-whisper-large-v3-turbo/model.bin
EngineData/Backend/RuntimeAssets/Translation/ModelData/marianmt-id-en/
EngineData/Backend/RuntimeAssets/Translation/ModelData/nllb-200-distilled-600M/
EngineData/Backend/RuntimeAssets/Voice/Piper/piper.exe
EngineData/Backend/RuntimeAssets/Voice/Piper/**/*.onnx
```

These are runtime/package inputs. Their presence in source paths does not prove model load, CUDA use, quality, or release readiness.

## Developer Tooling Boundary

The current Tauri package does **not** expose the old `setup:worker`, `validate:worker`, `validate:models`, `smoke:worker`, or `status:readiness` npm profiles. Do not restore those names merely because older documentation or branch history mentions them.

Current RustApp validation entrypoints are owned by:

```text
EngineData/Frontend/RustApp/package.json
EngineData/Frontend/RustApp/scripts/auto_test_registry.mjs
```

Manual scripts that remain inside this WorkerRuntime folder are local implementation/development helpers only. They are not normal-user setup, product readiness proof, or package entrypoints unless a later bounded local-AI/release task explicitly adopts them.

## Runtime Evidence

The application runtime may write privacy-bounded operational evidence under:

```text
UserData/LogData/RustAppValidation/
```

That is application-generated runtime diagnostic data. It is distinct from developer/source-validation reports, which belong under ignored `.tmp/validation/` paths.

## Migrated Helper Map

`migrated_python_helper_map.json` is inherited migration evidence. It does not make every listed helper a current owner. Current source/callers and canonical ownership decide whether a helper is active.

## Truth Rules

- CUDA availability is separate from successful CUDA inference.
- CPU fallback remains a product capability requirement, but usability/performance needs local proof.
- Worker/model presence does not equal inference readiness.
- Input/output runtime files remain constrained to appropriate `UserData` runtime folders.
- Development model/setup helpers must not become normal-user requirements.
- The worker must not replace the Rust/Tauri product shell or create a second product architecture.
