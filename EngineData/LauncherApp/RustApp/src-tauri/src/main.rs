mod commands;
mod engine;

use commands::audio::{get_input_status, list_audio_devices};
use commands::audio_evidence::{
    get_latest_audio_pipeline_evidence, get_latest_audio_studio_validation_evidence,
};
use commands::audio_studio::{
    audio_studio_export_project_metadata, audio_studio_get_provider_status,
    audio_studio_get_quality_gate_status, audio_studio_import_take, audio_studio_list_takes,
    audio_studio_stage_guided_take, audio_studio_update_take_state,
};
use commands::chat::{append_chat_message, create_chat_session, list_chat_sessions};
use commands::diagnostics::{
    get_realtime_status_payload, get_runtime_diagnostics, get_runtime_status_bundle,
    record_frontend_startup_trace,
};
use commands::hardware::get_hardware_usage;
use commands::helper_bridge::{
    cancel_helper_bridge_task, get_helper_bridge_status, send_helper_bridge_request,
    start_helper_bridge, stop_helper_bridge,
};
use commands::runtime::{
    check_helper_bridge_health, get_gpu_policy, get_model_inventory, prepare_capture_start_request,
    prepare_capture_stop_request, prepare_voice_capture, setup_models, start_capture, stop_capture,
    verify_models,
};
use commands::settings::{
    load_runtime_settings, save_default_runtime_settings, save_runtime_settings,
};
use commands::translation::translate_text;
use tauri::{LogicalSize, Manager};

fn main() {
    let app = tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_size(LogicalSize::new(1600.0, 940.0));
                let _ = window.center();
                let _ = window.set_focus();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_runtime_status_bundle,
            get_realtime_status_payload,
            get_runtime_diagnostics,
            record_frontend_startup_trace,
            get_hardware_usage,
            get_helper_bridge_status,
            start_helper_bridge,
            stop_helper_bridge,
            cancel_helper_bridge_task,
            send_helper_bridge_request,
            check_helper_bridge_health,
            prepare_capture_start_request,
            prepare_capture_stop_request,
            prepare_voice_capture,
            get_model_inventory,
            verify_models,
            setup_models,
            get_gpu_policy,
            get_input_status,
            list_audio_devices,
            get_latest_audio_pipeline_evidence,
            get_latest_audio_studio_validation_evidence,
            load_runtime_settings,
            save_default_runtime_settings,
            save_runtime_settings,
            create_chat_session,
            list_chat_sessions,
            append_chat_message,
            start_capture,
            stop_capture,
            translate_text,
            audio_studio_get_provider_status,
            audio_studio_get_quality_gate_status,
            audio_studio_import_take,
            audio_studio_stage_guided_take,
            audio_studio_update_take_state,
            audio_studio_list_takes,
            audio_studio_export_project_metadata,
        ]);

    app.run(tauri::generate_context!())
        .expect("TranslateIT app failed to start");
}
