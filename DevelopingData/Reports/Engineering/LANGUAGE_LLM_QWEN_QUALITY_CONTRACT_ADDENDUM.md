# Language LLM Qwen Quality Contract Addendum

## Current percentage
- Repo-side realtime foundation: 99.85%
- Product realtime readiness: 56-61%
- Gemini-level readiness: 31-41%

## Added in this step
- `EngineData/TranslateEngine/language_llm_quality_contract.py`
- `DevelopingData/Tests/test_language_llm_quality_contract.py`
- `EngineData/TranslateEngine/language_llm_prompt_payload.py`
- `DevelopingData/Tests/test_language_llm_prompt_payload.py`
- Updated issue `#2` with Qwen language LLM remaining work.

## Qwen role
Qwen3-4B-Instruct Q4 is the primary English-Indonesian language quality model.
Qwen3-1.7B-Instruct Q4 is the fallback model.
The language LLM is side-path only and must not block the realtime hot path.

## Remaining work
- Place Qwen GGUF files under the configured model root.
- Add local runtime loader for the selected GGUF backend.
- Run local readiness check.
- Connect language quality output to correction, glossary, and final transcript flow.
