# Rust Runtime Boundary Validation Checklist

## Document control

- Project: TranslateIT
- Branch: `ChatGPT-ConvertEngine`
- Date: `2026-06-14`
- Status: Checklist prepared for final milestone testing

## Purpose

This checklist defines what must be verified at the end of the Rust/Tauri conversion milestone. It does not mark the runtime as ready.

## Required script checks

```powershell
python .\DevelopingData\ToolKitData\Scripts\Execution\check_rust_app.py
python .\DevelopingData\ToolKitData\Scripts\Execution\check_rust_runtime_boundaries.py
python .\DevelopingData\ToolKitData\Scripts\Execution\check_rust_output_boundary.py
python .\DevelopingData\ToolKitData\Scripts\Execution\check_rust_model_boundary.py
```

## Required Tauri command checks

The final milestone test must verify these commands:

```text
get_engine_status
get_runtime_diagnostics
get_input_status
get_audio_buffer_status
analyze_audio_payload
get_calibration_flow_status
save_calibration_profile
validate_native_cuda_backend
run_asr_dry_run
run_text_dry_run
check_output_plan
load_runtime_settings
save_default_runtime_settings
start_capture
stop_capture
translate_text
```

## Required truth checks

- The app must not report full runtime Ready while model loading is still pending.
- CUDA readiness must remain false until native model validation succeeds.
- Start must report Rust input preparation status.
- Audio payload analysis must report buffer/evidence/VAD status.
- Calibration save must write under `UserData/CacheData`.
- ASR, text, and output boundaries must return truthful pending status.
- Final app must not require Python runtime.

## Final gate

The final gate can pass only after:

1. Rust build succeeds.
2. Tauri build succeeds.
3. Runtime commands respond correctly.
4. Native dependency checks pass.
5. Real model load validation passes.
6. Audio input, VAD, ASR, translation, and output flows are verified end-to-end.
