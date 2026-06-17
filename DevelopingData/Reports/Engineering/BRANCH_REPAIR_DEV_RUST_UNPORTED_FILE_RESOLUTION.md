# Branch Repair Dev-Rust Unported File Resolution

## Purpose
This manifest resolves remaining files from the misplaced `Developing` range that must not be copied directly into `Dev-Rust` runtime paths.

## Dev-Rust rule
The active app runtime is Rust/Tauri under `EngineData/LauncherApp/RustApp/src-tauri`. Python files can remain helper, LocalWorker support, or evidence only. They must not replace the Rust/Tauri app path.

## Resolved as not direct-portable
These files target the older Python app-main path and are not compatible with the active Rust/Tauri package without rewrite:

- `DevelopingData/Patches/apply_realtime_app_main_hook.py`
- `DevelopingData/Patches/verify_realtime_app_main_hook.py`
- `DevelopingData/Patches/realtime_hook_status.py`
- `DevelopingData/Tests/test_app_main_hook_patch_applier.py`
- `DevelopingData/Tests/test_app_main_hook_verifier.py`
- `DevelopingData/Tests/test_integration_status_payload.py`

Resolution: do not port as active scripts. Convert the intent into a Rust/Tauri status-panel integration task if still needed.

## Resolved as Rust or LocalWorker migration required
These files depend on the older Python `TranslationEngine` runtime flow:

- `EngineData/TranslateEngine/translation_engine.py`
- `EngineData/TranslateEngine/realtime_turn_planner.py`
- `EngineData/TranslateEngine/realtime_status_presenter.py`
- `DevelopingData/Tests/test_realtime_translate_engine.py`
- `DevelopingData/Tests/test_realtime_turn_summary.py`

Resolution: do not port as active runtime. Either translate the behavior into Rust under `RustApp/src-tauri/src/engine` or wrap the runtime behavior behind `Backend/LocalWorker/WorkerRuntime` commands.

## Resolved as pending boundary selection
These files target Python runtime/session hook behavior and need the Dev-Rust session boundary first:

- `DevelopingData/Patches/apply_language_llm_runtime_queue_hook.py`
- `DevelopingData/Patches/verify_language_llm_runtime_queue_hook.py`
- `DevelopingData/Patches/apply_language_llm_session_bridge_hook.py`
- `DevelopingData/Patches/verify_language_llm_session_bridge_hook.py`
- `DevelopingData/Tests/test_language_llm_runtime_queue_hook_patch.py`
- `DevelopingData/Tests/test_language_llm_session_bridge_hook_patch.py`

Resolution: do not port as active patchers. Rebuild as Rust command, LocalWorker command, or evidence-only test after boundary approval.

## Repair interpretation
A file from the misplaced range is considered handled only when it is one of these:
1. safely ported to Dev-Rust,
2. classified as helper/evidence,
3. mapped to LocalWorker boundary,
4. mapped to Rust translation,
5. explicitly blocked from direct port with reason.

## Current conclusion
The remaining unported files are intentionally not copied as active runtime because doing so would reintroduce Python app-main assumptions into a Rust/Tauri branch.
