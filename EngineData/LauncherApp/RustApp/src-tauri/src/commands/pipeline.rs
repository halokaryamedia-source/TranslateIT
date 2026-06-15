use crate::engine::adapters::asr_dry_run::{run_asr_dry_check, AsrDryRunRequest, AsrDryRunResult};
use crate::engine::adapters::context_logic::{update_translation_context, TranslationContextReport, TranslationContextRequest};
use crate::engine::adapters::language_logic::{run_language_logic, LanguageLogicReport, LanguageLogicRequest};
use crate::engine::adapters::model_check::{check_model_request, ModelCheckRequest, ModelCheckResult};
use crate::engine::adapters::native_execution_bridge_logic::{build_native_execution_bridge, NativeExecutionBridgeReport, NativeExecutionBridgeRequest};
use crate::engine::adapters::orchestration_logic::{run_runtime_orchestration, RuntimeOrchestrationReport, RuntimeOrchestrationRequest};
use crate::engine::adapters::output_dry_run::{run_output_dry_check, OutputDryRunRequest, OutputDryRunResult};
use crate::engine::adapters::pipeline_logic::{check_stale_job, decide_pipeline, PipelineDecisionReport, PipelineDecisionRequest, StaleJobGuardReport, StaleJobGuardRequest};
use crate::engine::adapters::playback_logic::{plan_playback, PlaybackLogicRequest, PlaybackLogicResult};
use crate::engine::adapters::segment_flow_logic::{analyze_segment_flow, SegmentFlowReport, SegmentFlowRequest};
use crate::engine::adapters::session_logic::{build_session_metric_report, build_worker_health, SessionMetricReport, SessionMetricRequest, WorkerHealthReport, WorkerHealthRequest};
use crate::engine::adapters::text_dry_run::{run_text_dry_check, TextDryRunRequest, TextDryRunResult};
use crate::engine::adapters::transcript_session_logic::{analyze_transcript_session_readiness, TranscriptSessionReadinessReport};
use crate::engine::adapters::translation_logic::{run_translation_logic, TranslationLogicRequest, TranslationLogicResult};
use crate::engine::native_execution::{plan_native_execution, NativeExecutionPlan, NativeExecutionRequest};
use crate::engine::transcript_session::{plan_transcript_session_paths, TranscriptSessionPlanReport, TranscriptSessionPlanRequest, TranscriptSessionRecord};

#[tauri::command]
pub fn analyze_language_logic(request: LanguageLogicRequest) -> LanguageLogicReport { run_language_logic(request) }

#[tauri::command]
pub fn update_context_window(request: TranslationContextRequest) -> TranslationContextReport { update_translation_context(request) }

#[tauri::command]
pub fn analyze_session_metrics(request: SessionMetricRequest) -> SessionMetricReport { build_session_metric_report(request) }

#[tauri::command]
pub fn analyze_worker_health(request: WorkerHealthRequest) -> WorkerHealthReport { build_worker_health(request) }

#[tauri::command]
pub fn decide_pipeline_step(request: PipelineDecisionRequest) -> PipelineDecisionReport { decide_pipeline(request) }

#[tauri::command]
pub fn check_stale_job_guard(request: StaleJobGuardRequest) -> StaleJobGuardReport { check_stale_job(request) }

#[tauri::command]
pub fn plan_translation_logic(request: TranslationLogicRequest) -> TranslationLogicResult { run_translation_logic(request) }

#[tauri::command]
pub fn plan_playback_logic(request: PlaybackLogicRequest) -> PlaybackLogicResult { plan_playback(request) }

#[tauri::command]
pub fn run_runtime_plan(request: RuntimeOrchestrationRequest) -> RuntimeOrchestrationReport { run_runtime_orchestration(request) }

#[tauri::command]
pub fn plan_native_execution_step(request: NativeExecutionRequest) -> NativeExecutionPlan { plan_native_execution(request) }

#[tauri::command]
pub fn analyze_native_execution_bridge(request: NativeExecutionBridgeRequest) -> NativeExecutionBridgeReport { build_native_execution_bridge(request) }

#[tauri::command]
pub fn analyze_segment_flow_state(request: SegmentFlowRequest) -> SegmentFlowReport { analyze_segment_flow(request) }

#[tauri::command]
pub fn analyze_transcript_session_state(session: TranscriptSessionRecord) -> TranscriptSessionReadinessReport { analyze_transcript_session_readiness(session) }

#[tauri::command]
pub fn analyze_transcript_session_save_plan(request: TranscriptSessionPlanRequest) -> TranscriptSessionPlanReport { plan_transcript_session_paths(request) }

#[tauri::command]
pub fn run_asr_dry_run(request: AsrDryRunRequest) -> AsrDryRunResult { run_asr_dry_check(request) }

#[tauri::command]
pub fn run_text_dry_run(request: TextDryRunRequest) -> TextDryRunResult { run_text_dry_check(request) }

#[tauri::command]
pub fn check_output_plan(request: OutputDryRunRequest) -> OutputDryRunResult { run_output_dry_check(request) }

#[tauri::command]
pub fn check_model_plan(request: ModelCheckRequest) -> ModelCheckResult { check_model_request(request) }
