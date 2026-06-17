# Language LLM Qwen Integration

## Decision
TranslateIT will use Qwen3-4B-Instruct Q4 as the primary lightweight language model for English and Indonesian language quality tasks.

## Fallback
Qwen3-1.7B-Instruct Q4 is the fallback model.

## Scope
The language LLM is a side-path quality layer. It is not allowed to block the realtime hot path.

## Added files
- `EngineData/TranslateEngine/language_llm_manifest.py`
- `EngineData/TranslateEngine/language_llm_config.py`
- `EngineData/TranslateEngine/language_llm_readiness.py`

## Updated files
- `EngineData/TranslateEngine/realtime_local_status_bundle.py`
- `DevelopingData/Tests/test_realtime_local_status_bundle.py`

## Remaining local work
- Download or place the Qwen3-4B-Instruct Q4 GGUF model under the configured language LLM model folder.
- Optionally place Qwen3-1.7B-Instruct Q4 as fallback.
- Run local status bundle and confirm language LLM readiness.
