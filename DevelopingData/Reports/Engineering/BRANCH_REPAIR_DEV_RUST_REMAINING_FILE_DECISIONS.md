# Branch Repair Dev-Rust Remaining File Decisions

## Purpose
This document records why some files from the misplaced `Developing` range are not blindly ported into `Dev-Rust` runtime paths.

## Architecture rule
`Dev-Rust` uses `EngineData/LauncherApp/RustApp/src-tauri` for the active Tauri/Rust app. Python helpers may remain as helper/evidence assets only unless a Rust boundary or LocalWorker boundary is explicitly reviewed.

## Blocked from direct port as active runtime
These files refer to the older Python app-main structure and must not be treated as active `Dev-Rust` runtime code:

- `DevelopingData/Patches/apply_realtime_app_main_hook.py`
- `DevelopingData/Patches/verify_realtime_app_main_hook.py`
- `DevelopingData/Patches/realtime_hook_status.py`
- `DevelopingData/Tests/test_app_main_hook_patch_applier.py`
- `DevelopingData/Tests/test_app_main_hook_verifier.py`
- `DevelopingData/Tests/test_integration_status_payload.py`

## Needs separate Rust/Tauri review
These files depend on or modify the older Python `TranslationEngine` flow. They should not be used as-is until mapped to Rust/Tauri or LocalWorker:

- `EngineData/TranslateEngine/translation_engine.py`
- `EngineData/TranslateEngine/realtime_turn_planner.py`
- `EngineData/TranslateEngine/realtime_status_presenter.py`
- `DevelopingData/Tests/test_realtime_translate_engine.py`
- `DevelopingData/Tests/test_realtime_turn_summary.py`

## Language LLM hook patchers
These patchers target a Python runtime flow. They remain pending until the Dev-Rust session/runtime boundary is selected:

- `DevelopingData/Patches/apply_language_llm_runtime_queue_hook.py`
- `DevelopingData/Patches/verify_language_llm_runtime_queue_hook.py`
- `DevelopingData/Patches/apply_language_llm_session_bridge_hook.py`
- `DevelopingData/Patches/verify_language_llm_session_bridge_hook.py`
- `DevelopingData/Tests/test_language_llm_runtime_queue_hook_patch.py`
- `DevelopingData/Tests/test_language_llm_session_bridge_hook_patch.py`

## Safe evidence already moved
Progress reports and helper-level tests have been moved to Dev-Rust as evidence/helper assets, not as primary runtime implementation.

## Next repair action
Any remaining migration must be one of these actions:
1. convert to Rust/Tauri under `RustApp/src-tauri`,
2. wrap behind `Backend/LocalWorker/WorkerRuntime`,
3. keep as helper/evidence only,
4. skip with documented reason.
