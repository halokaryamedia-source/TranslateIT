# TranslateIT Local Realtime Worker

This folder contains the local-only worker used by the RustApp shell during the current transition phase.

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
EngineData/TranscriptEngine/ModelData/faster-whisper-large-v3-turbo/model.bin
EngineData/TranslateEngine/ModelData/marianmt-id-en/
EngineData/TranslateEngine/ModelData/nllb-200-distilled-600M/
EngineData/VoiceEngine/Piper/piper.exe
EngineData/VoiceEngine/Piper/**/*.onnx
```

## Commands

From `EngineData/LauncherApp/RustApp`:

```powershell
npm run setup:worker
npm run validate:worker
npm run validate:models
npm run smoke:worker -- -AudioPath "UserData\CacheData\audio_segments\latest_live_target_segment.wav"
npm run status:readiness
```

## Truth rules

- CUDA availability is reported separately from CUDA inference success.
- CPU fallback is reported through runtime device fields and notes.
- Worker smoke evidence is stored under `UserData/LogData/RustAppValidation/`.
- Owner validation remains blocked until persistent worker smoke evidence, manual runtime evidence, and build/package evidence pass.
- Input and output files are constrained to project `UserData` runtime folders.
