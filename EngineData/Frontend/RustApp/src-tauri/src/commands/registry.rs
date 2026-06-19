use super::audio::{get_input_status, list_audio_devices};
use super::audio_evidence::{
    get_latest_audio_pipeline_evidence, get_latest_audio_studio_validation_evidence,
};
use super::audio_studio::{
    audio_studio_export_project_metadata, audio_studio_get_provider_status,
    audio_studio_get_quality_gate_status, audio_studio_import_take, audio_studio_list_takes,
    audio_studio_stage_guided_take, audio_studio_update_take_state,
};
use super::chat::{append_chat_message, create_chat_session, list_chat_sessions};
use super::diagnostics::{
    get_realtime_status_payload, get_runtime_diagnostics, get_runtime_status_bundle,
    record_frontend_startup_trace,
};
use super::hardware::get_hardware_usage;
use super::helper_bridge::{
    cancel_helper_bridge_task, get_helper_bridge_status, send_helper_bridge_request,
    start_helper_bridge, stop_helper_bridge,
};
use super::runtime::{get_gpu_policy, get_model_inventory, setup_models, verify_models};
use super::runtime_capture::{
    check_helper_bridge_health, prepare_capture_start_request, prepare_capture_stop_request,
    prepare_voice_capture, start_capture, stop_capture,
};
use super::settings::{
    load_runtime_settings, save_default_runtime_settings, save_runtime_settings,
};
use super::translation::translate_text;

pub fn register<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder.invoke_handler(tauri::generate_handler![
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
    ])
}
