use crate::engine;
use crate::engine::adapters::asr_model_logic::{build_asr_profile_plan, AsrProfilePlan, AsrProfileRequest};
use crate::engine::adapters::asr_quality_logic::{evaluate_asr_quality, AsrQualityLogicDecision, AsrQualityLogicRequest};
use crate::engine::adapters::calibration_logic::{run_calibration_logic, CalibrationLogicRequest, CalibrationLogicResult};
use crate::engine::adapters::capture_loop_logic::{build_capture_loop_contract, CaptureLoopContractReport};
use crate::engine::adapters::frame_pipeline_logic::{analyze_frame_pipeline, FramePipelineReport, FramePipelineRequest};
use crate::engine::adapters::native_capture_bridge_logic::{analyze_native_capture_bridge, NativeCaptureBridgeReport, NativeCaptureBridgeRequest};
use crate::engine::adapters::realtime_handoff_logic::{analyze_realtime_handoff, RealtimeHandoffReport, RealtimeHandoffRequest};
use crate::engine::adapters::stream_ownership_logic::{analyze_stream_ownership, StreamOwnershipReport, StreamOwnershipRequest};
use crate::engine::adapters::latency_logic::{build_latency_logic, build_vad_profile, LatencyLogicReport, LatencyLogicRequest, VadProfileReport, VadProfileRequest};
use crate::engine::audio::buffer::{inspect_frame, planned_buffer_status, AudioBufferStatus, AudioFrameInspectionReport};
use crate::engine::audio::calibration_flow::{save_calibration_from_evidence, CalibrationFlowStatus, CalibrationSaveResult};
use crate::engine::audio::capture_plan::{plan_native_capture_stream, NativeCaptureStreamPlanReport, NativeCaptureStreamPlanRequest};
use crate::engine::audio::evidence::AudioEvidenceReport;
use crate::engine::audio::input::InputPreparationStatus;
use crate::engine::audio::input_config::NativeInputConfigProbeReport;
use crate::engine::audio::live_capture::LiveCaptureStatusReport;
use crate::engine::audio::noise_filter::{classify_noise, AudioNoiseAssessment, NoiseAssessmentRequest};
use crate::engine::audio::preprocess::{preprocess_audio, AudioPreprocessRequest, PreprocessingResult};
use crate::engine::audio::stream_build::{plan_native_capture_stream_build, NativeCaptureStreamBuildReport, NativeCaptureStreamBuildRequest};
use crate::engine::audio::vad::{evaluate_segment_decision, VadDecisionReport, VadSegmentDecisionRequest};
use crate::engine::audio::AudioFrame;
use crate::engine::runtime_state::{latest_runtime_session_state, record_realtime_handoff_report};

#[tauri::command]
pub fn probe_native_input_config() -> NativeInputConfigProbeReport { NativeInputConfigProbeReport::probe_default_input() }

#[tauri::command]
pub fn plan_native_capture_stream_state(request: NativeCaptureStreamPlanRequest) -> NativeCaptureStreamPlanReport { plan_native_capture_stream(request) }

#[tauri::command]
pub fn plan_native_capture_stream_build_state(request: NativeCaptureStreamBuildRequest) -> NativeCaptureStreamBuildReport { plan_native_capture_stream_build(request) }

#[tauri::command]
pub fn analyze_native_capture_bridge_state(request: NativeCaptureBridgeRequest) -> NativeCaptureBridgeReport { analyze_native_capture_bridge(request, latest_runtime_session_state()) }

#[tauri::command]
pub fn get_input_status() -> InputPreparationStatus { InputPreparationStatus::inspect_default_input() }

#[tauri::command]
pub fn get_audio_buffer_status() -> AudioBufferStatus { planned_buffer_status() }

#[tauri::command]
pub fn get_live_capture_status() -> LiveCaptureStatusReport { engine::live_capture_runtime_status() }

#[tauri::command]
pub fn analyze_capture_loop_contract() -> CaptureLoopContractReport { build_capture_loop_contract() }

#[tauri::command]
pub fn analyze_stream_ownership_plan(request: StreamOwnershipRequest) -> StreamOwnershipReport { analyze_stream_ownership(request) }

#[tauri::command]
pub fn analyze_realtime_handoff_plan(request: RealtimeHandoffRequest) -> RealtimeHandoffReport {
    let report = analyze_realtime_handoff(request);
    let _ = record_realtime_handoff_report(&report);
    report
}

#[tauri::command]
pub fn analyze_frame_pipeline_state(request: FramePipelineRequest) -> FramePipelineReport { analyze_frame_pipeline(request) }

#[tauri::command]
pub fn analyze_audio_payload(frame: AudioFrame) -> AudioFrameInspectionReport { inspect_frame(frame) }

#[tauri::command]
pub fn preprocess_audio_payload(request: AudioPreprocessRequest) -> PreprocessingResult { preprocess_audio(request) }

#[tauri::command]
pub fn classify_audio_noise(request: NoiseAssessmentRequest) -> AudioNoiseAssessment { classify_noise(request) }

#[tauri::command]
pub fn run_mic_calibration_logic(request: CalibrationLogicRequest) -> CalibrationLogicResult { run_calibration_logic(request) }

#[tauri::command]
pub fn analyze_vad_segment(request: VadSegmentDecisionRequest) -> VadDecisionReport { evaluate_segment_decision(request) }

#[tauri::command]
pub fn plan_asr_profile(request: AsrProfileRequest) -> AsrProfilePlan { build_asr_profile_plan(request) }

#[tauri::command]
pub fn analyze_asr_quality(request: AsrQualityLogicRequest) -> AsrQualityLogicDecision { evaluate_asr_quality(request) }

#[tauri::command]
pub fn analyze_latency_logic(request: LatencyLogicRequest) -> LatencyLogicReport { build_latency_logic(request) }

#[tauri::command]
pub fn resolve_vad_profile(request: VadProfileRequest) -> VadProfileReport { build_vad_profile(request) }

#[tauri::command]
pub fn get_calibration_flow_status() -> CalibrationFlowStatus { CalibrationFlowStatus::current() }

#[tauri::command]
pub fn save_calibration_profile(input_device_id: Option<String>, quiet: AudioEvidenceReport, speech: AudioEvidenceReport) -> CalibrationSaveResult { save_calibration_from_evidence(input_device_id, quiet, speech) }
