# Branch Repair Dev-Rust Boundary Migration Queue

## Purpose
This queue converts the remaining misplaced Python runtime ideas into Dev-Rust-compatible migration tasks.

## Active architecture
- App shell and app backend: `EngineData/LauncherApp/RustApp/src-tauri`
- Backend worker: `EngineData/Backend/LocalWorker/WorkerRuntime`
- Runtime contracts: `EngineData/Backend/RuntimeContracts`
- Runtime assets: `EngineData/Backend/RuntimeAssets`

## Migration queue

### 1. Realtime app-main hook patchers
Source files:
- `DevelopingData/Patches/apply_realtime_app_main_hook.py`
- `DevelopingData/Patches/verify_realtime_app_main_hook.py`
- `DevelopingData/Patches/realtime_hook_status.py`

Decision: do not port as active Python patchers.
Target action: express the required status-row behavior as Rust/Tauri UI command or frontend state integration.

### 2. TranslationEngine realtime routing
Source files:
- `EngineData/TranslateEngine/translation_engine.py`
- `EngineData/TranslateEngine/realtime_turn_planner.py`
- `EngineData/TranslateEngine/realtime_status_presenter.py`

Decision: do not treat as active runtime in Dev-Rust.
Target action: split intent into:
- Rust/Tauri orchestration if it belongs in app logic,
- LocalWorker command if it calls ASR, MT, or TTS runtime,
- evidence only if superseded by existing Rust adapters.

### 3. Language LLM session queue patchers
Source files:
- `DevelopingData/Patches/apply_language_llm_runtime_queue_hook.py`
- `DevelopingData/Patches/verify_language_llm_runtime_queue_hook.py`
- `DevelopingData/Patches/apply_language_llm_session_bridge_hook.py`
- `DevelopingData/Patches/verify_language_llm_session_bridge_hook.py`

Decision: do not port as active Python patchers.
Target action: review whether final transcript quality patches belong in:
- Rust session state,
- LocalWorker post-processing output,
- helper/evidence only.

### 4. Dependent tests
Source files:
- `DevelopingData/Tests/test_app_main_hook_patch_applier.py`
- `DevelopingData/Tests/test_app_main_hook_verifier.py`
- `DevelopingData/Tests/test_integration_status_payload.py`
- `DevelopingData/Tests/test_language_llm_runtime_queue_hook_patch.py`
- `DevelopingData/Tests/test_language_llm_session_bridge_hook_patch.py`
- `DevelopingData/Tests/test_realtime_translate_engine.py`
- `DevelopingData/Tests/test_realtime_turn_summary.py`

Decision: do not port as-is.
Target action: rewrite as Rust/Tauri, LocalWorker, or evidence tests after target boundary is selected.

## Completion rule
The branch repair can continue only if each remaining file is either safely ported, explicitly skipped with reason, or converted into a Dev-Rust-compatible task.

## Current status
All high-risk remaining files are now mapped to a safe Dev-Rust migration path rather than copied into the active runtime.
