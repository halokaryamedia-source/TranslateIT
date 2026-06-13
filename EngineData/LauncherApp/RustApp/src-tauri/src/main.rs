mod engine;

use engine::adapters::asr_dry_run::{run_asr_dry_check, AsrDryRunRequest, AsrDryRunResult};
use engine::adapters::language_logic::{run_language_logic, LanguageLogicReport, LanguageLogicRequest};
use engine::adapters::latency_logic::{build_latency_logic, build_vad_profile, LatencyLogicReport, LatencyLogicRequest, VadProfileReport, VadProfileRequest};
use engine::adapters::model_check::{check_model_request, ModelCheckRequest, ModelCheckResult};
use engine::adapters::output_dry_run::{run_output_dry_check, OutputDryRunRequest, OutputDryRunResult};
use engine::adapters::session_logic::{build_session_metric_report, build_worker_health, SessionMetricReport, SessionMetricRequest, WorkerHealthReport, WorkerHealthRequest};
use engine::adapters::text_dry_run::{run_text_dry_check, TextDryRunRequest, TextDryRunResult};
use engine::audio::buffer::{inspect_frame, planned_buffer_status, AudioBufferStatus, AudioFrameInspectionReport};
use engine::audio::calibration_flow::{save_calibration_from_evidence, CalibrationFlowStatus, CalibrationSaveResult};
use engine::audio::evidence::AudioEvidenceReport;
use engine::audio::input::InputPreparationStatus;
use engine::audio::AudioFrame;
use engine::diagnostics::RuntimeDiagnostics;
use engine::inference::backend_validation::NativeCudaBackendValidationReport;
use engine::settings::RuntimeSettings;
use engine::state::{CommandResult, EngineStatus};

#[tauri::command]
fn get_engine_status() -> EngineStatus {
    engine::current_status()
}

#[tauri::command]
fn get_runtime_diagnostics() -> RuntimeDiagnostics {
    engine::runtime_diagnostics()
}

#[tauri::command]
fn get_input_status() -> InputPreparationStatus {
    InputPreparationStatus::inspect_default_input()
}

#[tauri::command]
fn get_audio_buffer_status() -> AudioBufferStatus {
    planned_buffer_status()
}

#[tauri::command]
fn analyze_audio_payload(frame: AudioFrame) -> AudioFrameInspectionReport {
    inspect_frame(frame)
}

#[tauri::command]
fn analyze_language_logic(request: LanguageLogicRequest) -> LanguageLogicReport {
    run_language_logic(request)
}

#[tauri::command]
fn analyze_latency_logic(request: LatencyLogicRequest) -> LatencyLogicReport {
    build_latency_logic(request)
}

#[tauri::command]
fn analyze_session_metrics(request: SessionMetricRequest) -> SessionMetricReport {
    build_session_metric_report(request)
}

#[tauri::command]
fn analyze_worker_health(request: WorkerHealthRequest) -> WorkerHealthReport {
    build_worker_health(request)
}

#[tauri::command]
fn resolve_vad_profile(request: VadProfileRequest) -> VadProfileReport {
    build_vad_profile(request)
}

#[tauri::command]
fn get_calibration_flow_status() -> CalibrationFlowStatus {
    CalibrationFlowStatus::current()
}

#[tauri::command]
fn save_calibration_profile(
    input_device_id: Option<String>,
    quiet: AudioEvidenceReport,
    speech: AudioEvidenceReport,
) -> CalibrationSaveResult {
    save_calibration_from_evidence(input_device_id, quiet, speech)
}

#[tauri::command]
fn validate_native_cuda_backend() -> NativeCudaBackendValidationReport {
    NativeCudaBackendValidationReport::validate_ctranslate2_cuda_candidate()
}

#[tauri::command]
fn run_asr_dry_run(request: AsrDryRunRequest) -> AsrDryRunResult {
    run_asr_dry_check(request)
}

#[tauri::command]
fn run_text_dry_run(request: TextDryRunRequest) -> TextDryRunResult {
    run_text_dry_check(request)
}

#[tauri::command]
fn check_output_plan(request: OutputDryRunRequest) -> OutputDryRunResult {
    run_output_dry_check(request)
}

#[tauri::command]
fn check_model_plan(request: ModelCheckRequest) -> ModelCheckResult {
    check_model_request(request)
}

#[tauri::command]
fn load_runtime_settings() -> RuntimeSettings {
    engine::load_settings()
}

#[tauri::command]
fn save_default_runtime_settings() -> CommandResult {
    engine::save_default_settings()
}

#[tauri::command]
fn start_capture() -> CommandResult {
    engine::start_capture()
}

#[tauri::command]
fn stop_capture() -> CommandResult {
    engine::stop_capture()
}

#[tauri::command]
fn translate_text(source: String) -> CommandResult {
    engine::translate_text(source)
}

fn main() {
    let app = tauri::Builder::default().invoke_handler(tauri::generate_handler![
        get_engine_status,
        get_runtime_diagnostics,
        get_input_status,
        get_audio_buffer_status,
        analyze_audio_payload,
        analyze_language_logic,
        analyze_latency_logic,
        analyze_session_metrics,
        analyze_worker_health,
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
        start_capture,
        stop_capture,
        translate_text,
    ]);

    app.run(tauri::generate_context!())
        .expect("TranslateIT RustApp failed to run");
}
