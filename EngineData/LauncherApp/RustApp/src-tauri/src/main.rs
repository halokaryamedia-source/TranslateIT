mod commands;
mod engine;

use commands::audio::*;
use commands::audio_evidence::*;
use commands::chat::*;
use commands::diagnostics::*;
use commands::hardware::*;
use commands::pipeline::*;
use commands::runtime::*;
use commands::settings::*;
use commands::translation::*;

fn main() {
    let app = tauri::Builder::default().invoke_handler(tauri::generate_handler![
        get_engine_status,
        get_runtime_diagnostics,
        get_hardware_usage,
        get_runtime_handoff_state,
        get_runtime_session_state,
        analyze_start_gate,
        analyze_stop_gate,
        analyze_runtime_readiness,
        get_runtime_status_bundle,
        get_realtime_status_payload,
        analyze_realtime_translate_stream_state,
        analyze_live_pipeline_gate,
        get_live_pipeline_compact_status,
        analyze_internal_validation,
        analyze_migration_closure,
        list_audio_devices,
        probe_native_input_config,
        plan_native_capture_stream_state,
        plan_native_capture_stream_build_state,
        analyze_native_capture_bridge_state,
        get_input_status,
        get_audio_buffer_status,
        get_live_capture_status,
        get_latest_audio_pipeline_evidence,
        analyze_capture_loop_contract,
        analyze_stream_ownership_plan,
        analyze_realtime_handoff_plan,
        analyze_frame_pipeline_state,
        analyze_audio_payload,
        preprocess_audio_payload,
        classify_audio_noise,
        run_mic_calibration_logic,
        analyze_vad_segment,
        plan_asr_profile,
        analyze_asr_quality,
        analyze_language_logic,
        analyze_latency_logic,
        update_context_window,
        analyze_session_metrics,
        analyze_worker_health,
        decide_pipeline_step,
        check_stale_job_guard,
        plan_translation_logic,
        plan_playback_logic,
        run_runtime_plan,
        plan_native_execution_step,
        analyze_native_execution_bridge,
        analyze_segment_flow_state,
        analyze_transcript_session_state,
        analyze_transcript_session_save_plan,
        resolve_vad_profile,
        get_calibration_flow_status,
        save_calibration_profile,
        validate_native_cuda_backend,
        run_asr_dry_run,
        run_text_dry_run,
        check_output_plan,
        check_model_plan,
        load_runtime_settings,
        save_default_runtime_settings,
        save_runtime_settings,
        create_chat_session,
        list_chat_sessions,
        append_chat_message,
        start_capture,
        stop_capture,
        translate_text,
    ]);

    app.run(tauri::generate_context!())
        .expect("TranslateIT app failed to start");
}
