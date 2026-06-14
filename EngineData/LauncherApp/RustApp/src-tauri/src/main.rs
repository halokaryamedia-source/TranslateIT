mod engine;

use engine::adapters::asr_dry_run::{run_asr_dry_check, AsrDryRunRequest, AsrDryRunResult};
use engine::adapters::asr_model_logic::{build_asr_profile_plan, AsrProfilePlan, AsrProfileRequest};
use engine::adapters::asr_quality_logic::{evaluate_asr_quality, AsrQualityLogicDecision, AsrQualityLogicRequest};
use engine::adapters::calibration_logic::{run_calibration_logic, CalibrationLogicRequest, CalibrationLogicResult};
use engine::adapters::context_logic::{update_translation_context, TranslationContextReport, TranslationContextRequest};
use engine::adapters::language_logic::{run_language_logic, LanguageLogicReport, LanguageLogicRequest};
use engine::adapters::latency_logic::{build_latency_logic, build_vad_profile, LatencyLogicReport, LatencyLogicRequest, VadProfileReport, VadProfileRequest};
use engine::adapters::model_check::{check_model_request, ModelCheckRequest, ModelCheckResult};
use engine::adapters::output_dry_run::{run_output_dry_check, OutputDryRunRequest, OutputDryRunResult};
use engine::adapters::pipeline_logic::{check_stale_job, decide_pipeline, PipelineDecisionReport, PipelineDecisionRequest, StaleJobGuardReport, StaleJobGuardRequest};
use engine::adapters::playback_logic::{plan_playback, PlaybackLogicRequest, PlaybackLogicResult};
use engine::adapters::session_logic::{build_session_metric_report, build_worker_health, SessionMetricReport, SessionMetricRequest, WorkerHealthReport, WorkerHealthRequest};
use engine::adapters::text_dry_run::{run_text_dry_check, TextDryRunRequest, TextDryRunResult};
use engine::adapters::translation_logic::{run_translation_logic, TranslationLogicRequest, TranslationLogicResult};
use engine::audio::buffer::{inspect_frame, planned_buffer_status, AudioBufferStatus, AudioFrameInspectionReport};
use engine::audio::calibration_flow::{save_calibration_from_evidence, CalibrationFlowStatus, CalibrationSaveResult};
use engine::audio::evidence::AudioEvidenceReport;
use engine::audio::input::InputPreparationStatus;
use engine::audio::noise_filter::{classify_noise, AudioNoiseAssessment, NoiseAssessmentRequest};
use engine::audio::preprocess::{preprocess_audio, AudioPreprocessRequest, PreprocessingResult};
use engine::audio::vad::{evaluate_segment_decision, VadDecisionReport, VadSegmentDecisionRequest};
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
fn preprocess_audio_payload(request: AudioPreprocessRequest) -> PreprocessingResult {
    preprocess_audio(request)
}

#[tauri::command]
fn classify_audio_noise(request: NoiseAssessmentRequest) -> AudioNoiseAssessment {
    classify_noise(request)
}

#[tauri::command]
fn run_mic_calibration_logic(request: CalibrationLogicRequest) -> CalibrationLogicResult {
    run_calibration_logic(request)
}

#[tauri::command]
fn analyze_vad_segment(request: VadSegmentDecisionRequest) -> VadDecisionReport {
    evaluate_segment_decision(request)
}

#[tauri::command]
fn plan_asr_profile(request: AsrProfileRequest) -> AsrProfilePlan {
    build_asr_profile_plan(request)
}

#[tauri::command]
fn analyze_asr_quality(request: AsrQualityLogicRequest) -> AsrQualityLogicDecision {
    evaluate_asr_quality(request)
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
fn update_context_window(request: TranslationContextRequest) -> TranslationContextReport {
    update_translation_context(request)
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
fn decide_pipeline_step(request: PipelineDecisionRequest) -> PipelineDecisionReport {
    decide_pipeline(request)
}

#[tauri::command]
fn check_stale_job_guard(request: StaleJobGuardRequest) -> StaleJobGuardReport {
    check_stale_job(request)
}

#[tauri::command]
fn plan_translation_logic(request: TranslationLogicRequest) -> TranslationLogicResult {
    run_translation_logic(request)
}

#[tauri::command]
fn plan_playback_logic(request: PlaybackLogicRequest) -> PlaybackLogicResult {
    plan_playback(request)
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
