# TranslateIT Local Model Engine Setup Report

## Environment

* OS: Windows 10 10.0.26100
* Python: 3.11.9
* Node: 24.14.1
* Rust: 1.96.0
* GPU: NVIDIA GeForce RTX 3070
* CUDA available: Yes at the GPU / CTranslate2 level
* CTranslate2 CUDA available: Yes
* Torch CUDA available: No, CPU-only build installed

## Download Result

| Engine | Model | Repo | Local Path | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| ASR Primary | large-v3-turbo | `dropbox-dash/faster-whisper-large-v3-turbo` | `EngineData/TranscriptEngine/ModelData/faster-whisper-large-v3-turbo` | PASS | Preferred repo `Systran/faster-whisper-large-v3-turbo` was unavailable; resolved to the public CTranslate2 repo used by `faster_whisper`. |
| ASR Backup | medium | `Systran/faster-whisper-medium` | `EngineData/TranscriptEngine/ModelData/faster-whisper-medium` | PASS | Complete markers present. |
| Translation Primary | nllb-200-distilled-600M | `facebook/nllb-200-distilled-600M` | `EngineData/TranslateEngine/ModelData/nllb-200-distilled-600M` | PASS | Complete markers present. |
| Translation Fallback | marianmt-id-en | `Helsinki-NLP/opus-mt-id-en` | `EngineData/TranslateEngine/ModelData/marianmt-id-en` | PASS | Complete markers present. |
| TTS Default | Windows SAPI | local | local | PASS | Local SAPI voices detected: David, Zira. |
| Voice Actor | marcel | local profile | local | MISSING | Blocker `voice_actor_marcel_missing`. No fake profile created. |

## Validation Result

| Check | Result | Notes |
| --- | --- | --- |
| faster-whisper import | PASS | Installed locally. |
| ASR primary load | PASS | CPU and CUDA probes both loaded. |
| ASR backup load | PASS | CPU load passed. |
| NLLB load | PASS | Local CPU load passed. |
| Marian load | PASS | Local CPU load passed. |
| Translation test | PASS | `halo coba berbicara` -> `Hello, try to talk.` / `Hello. Try talking.` |
| SAPI TTS | PASS | SAPI synthesized a WAV file locally. |
| Marcel profile | MISSING | No local Marcel assets found. |
| Runtime manifest generated | PASS | `MODEL_RUNTIME_MANIFEST.json` written. |
| Frontend typecheck | PASS | `npm run typecheck` passed. |
| Rust check | PASS | `npm run check:rust` passed. |
| Frontend build | PASS | `npm run build:frontend` passed. |

## Blockers

* Critical blocker: none for internal testing.
* Major issue: `torch_cuda_unavailable_for_translation` because Torch is CPU-only, so translation worker fallback stays CPU-based.
* Minor issue: none.
* Pending manual asset: `voice_actor_marcel_missing`.

## Final Status

Engine models partially ready

## Next Required Action

Install or supply the real Marcel voice actor assets if custom voice output is required. For current internal testing, the project-local ASR, translation, and SAPI fallback are ready.
