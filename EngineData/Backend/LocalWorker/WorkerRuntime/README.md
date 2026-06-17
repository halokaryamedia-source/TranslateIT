# Backend Local Worker Runtime

This folder contains the backend-owned local worker used by the current Tauri desktop runtime.

## Runtime contract

The worker communicates through newline-delimited JSON on stdin/stdout. Each command returns one JSON object and does not claim production readiness by itself.

Supported commands:

- `status`
- `asr_preload`
- `transcribe`
- `translation_preload`
- `translate`
- `tts_preflight`
- `synthesize`

## Local stack

| Stage | Realtime profile | Quality profile |
| --- | --- | --- |
| ASR | Faster Whisper Large V3 Turbo | Faster Whisper Large V3 Turbo |
| Translation | MarianMT ID-EN | NLLB 200 distilled 600M |
| TTS | Piper | Piper |

## Required assets

```text
EngineData/Backend/RuntimeAssets/ASR/ModelData/faster-whisper-large-v3-turbo/model.bin
EngineData/Backend/RuntimeAssets/Translation/ModelData/marianmt-id-en/
EngineData/Backend/RuntimeAssets/Translation/ModelData/nllb-200-distilled-600M/
EngineData/Backend/RuntimeAssets/Voice/Piper/piper.exe
EngineData/Backend/RuntimeAssets/Voice/Piper/**/*.onnx
```

## Commands

From the active Tauri package folder:

```powershell
npm run setup:worker
npm run validate:worker
npm run validate:models
npm run smoke:worker -- -AudioPath "UserData\CacheData\audio_segments\latest_live_target_segment.wav"
npm run status:readiness
```

## Migrated helper map

During branch repair, several Python helpers were migrated from the misplaced branch range. They are not the active Rust/Tauri app logic. Use `migrated_python_helper_map.json` to decide whether each helper remains a compatibility helper, becomes a LocalWorker boundary candidate, is translated into Rust, or remains evidence only.

## Truth rules

- CUDA availability is reported separately from CUDA inference success.
- CPU fallback is reported through runtime device fields and notes.
- Worker smoke evidence is stored under `UserData/LogData/RustAppValidation/`.
- Owner validation remains blocked until persistent worker smoke evidence, manual runtime evidence, and build/package evidence pass.
- Input and output files are constrained to project `UserData` runtime folders.
- Migrated Python helpers must not replace Rust/Tauri app logic without a reviewed worker boundary or Rust translation.
