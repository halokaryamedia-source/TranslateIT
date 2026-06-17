# Dev-Rust Python Helper Classification

## Purpose
This document classifies Python files migrated during branch repair so they remain aligned with the Dev-Rust architecture.

## Architecture rule
The active app remains Rust/Tauri under `EngineData/LauncherApp/RustApp/src-tauri`.
Python files are helper, worker-support, test, or evidence assets only unless they are explicitly wrapped by a Rust/Tauri command boundary.

## Keep as helper compatibility assets
These files can remain under `EngineData/TranslateEngine` or `EngineData/TranscriptEngine` as compatibility helpers while the Rust path is evaluated:

- `EngineData/TranslateEngine/language_llm_manifest.py`
- `EngineData/TranslateEngine/language_llm_config.py`
- `EngineData/TranslateEngine/language_llm_runtime_contract.py`
- `EngineData/TranslateEngine/language_llm_readiness.py`
- `EngineData/TranslateEngine/language_llm_quality_contract.py`
- `EngineData/TranslateEngine/language_llm_prompt_payload.py`
- `EngineData/TranslateEngine/language_llm_quality_result.py`
- `EngineData/TranslateEngine/language_llm_final_transcript_adapter.py`
- `EngineData/TranslateEngine/language_llm_transcript_persistence_patch.py`
- `EngineData/TranslateEngine/language_llm_session_patch_adapter.py`
- `EngineData/TranslateEngine/language_llm_session_patch_queue.py`
- `EngineData/TranscriptEngine/language_llm_session_persistence_bridge.py`

## Candidate for LocalWorker boundary
These helpers match backend/runtime behavior and should be reviewed for integration behind `EngineData/Backend/LocalWorker/WorkerRuntime` instead of direct RustApp imports:

- `EngineData/TranslateEngine/ctranslate2_mt_backend.py`
- `EngineData/TranslateEngine/piper_tts_backend.py`
- `EngineData/TranslateEngine/piper_runtime_contract.py`
- `EngineData/TranscriptEngine/realtime_stt_stream.py`
- `EngineData/TranslateEngine/realtime_asset_readiness.py`
- `EngineData/TranslateEngine/realtime_validation_runner.py`
- `EngineData/TranslateEngine/realtime_local_status_bundle.py`

## Candidate for Rust translation
These are app-facing orchestration/status concepts and should be reviewed against existing Rust files before being used:

- `EngineData/TranslateEngine/realtime_latency_budget.py`
- `EngineData/TranslateEngine/realtime_latency_sample_gate.py`
- `EngineData/TranslateEngine/realtime_event_contract.py`
- `EngineData/TranslateEngine/realtime_partial_event_bridge.py`
- `EngineData/TranslateEngine/realtime_diagnostics.py`
- `EngineData/TranslateEngine/realtime_turn_summary.py`
- `EngineData/LauncherApp/realtime_status_panel_contract.py`
- `EngineData/LauncherApp/realtime_diagnostics_bridge.py`
- `EngineData/LauncherApp/realtime_status_panel_adapter.py`
- `EngineData/LauncherApp/realtime_app_status_hook.py`
- `EngineData/TranslateEngine/realtime_final_readiness_gate.py`
- `EngineData/TranslateEngine/realtime_release_gate.py`

## Evidence only until reviewed
These files should not drive runtime behavior until the Rust/Tauri structure is reviewed:

- `EngineData/TranslateEngine/realtime_quality_layer.py`
- `EngineData/TranslateEngine/realtime_readiness_audit.py`
- any patcher/verifier files from `DevelopingData/Patches`
- any copied report addendum under `DevelopingData/Reports/Engineering`

## Blocked from direct use
- Do not import these Python helpers directly into the Rust/Tauri package as active app logic.
- Do not treat migrated Python files as proof that the Rust runtime is wired.
- Do not continue feature development until each helper has final placement: helper, LocalWorker, Rust translation, or evidence.
