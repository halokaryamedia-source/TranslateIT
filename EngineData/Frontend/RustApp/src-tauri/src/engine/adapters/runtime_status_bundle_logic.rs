use serde::Serialize;

use crate::commands::meeting_session::{get_meeting_session_status, MeetingSessionStatus};
use crate::commands::pipeline_handoff::{
    get_live_meeting_runtime_gate_status, LiveMeetingRuntimeGateStatus,
};
use crate::engine::adapters::internal_validation_gate_logic::{
    analyze_internal_validation_gate, InternalValidationGateReport,
};
use crate::engine::adapters::live_asr_boundary_logic::{
    analyze_live_asr_boundary, LiveAsrBoundaryReport,
};
use crate::engine::adapters::live_runtime_pipeline_gate_logic::{
    analyze_live_runtime_pipeline_gate, LiveRuntimePipelineGateReport,
};
use crate::engine::adapters::live_translation_boundary_logic::{
    analyze_live_translation_boundary, LiveTranslationBoundaryReport,
};
use crate::engine::adapters::live_tts_boundary_logic::{
    analyze_live_tts_boundary, LiveTtsBoundaryReport,
};
use crate::engine::adapters::local_worker_manifest_logic::{
    analyze_local_worker_manifest, LocalWorkerManifestReport,
};
use crate::engine::adapters::native_asr_decoder_logic::{
    analyze_native_asr_decoder_bridge, NativeAsrDecoderBridgeReport,
};
use crate::engine::adapters::runtime_readiness_bundle_logic::{
    analyze_runtime_readiness_bundle, RuntimeReadinessBundleReport,
};
use crate::engine::audio::capture_gate::{
    plan_native_capture_gate, NativeCaptureGateReport, NativeCaptureGateRequest,
};
use crate::engine::audio::live_audio_buffer::{
    live_audio_buffer_status, live_target_segment_snapshot, LiveAudioBufferStatusReport,
    LiveTargetSegmentReport,
};
use crate::engine::audio::live_capture::{live_capture_status, LiveCaptureStatusReport};
use crate::engine::runtime_state::latest_runtime_session_state;
use crate::engine::state::EngineStatus;

#[derive(Debug, Clone, Serialize)]
pub struct RuntimeStatusBundleReport {
    pub engine_status: EngineStatus,
    pub readiness: RuntimeReadinessBundleReport,
    pub capture_gate: NativeCaptureGateReport,
    pub live_capture: LiveCaptureStatusReport,
    pub live_audio_buffer: LiveAudioBufferStatusReport,
    pub live_target_segment: LiveTargetSegmentReport,
    pub live_asr_boundary: LiveAsrBoundaryReport,
    pub native_asr_decoder: NativeAsrDecoderBridgeReport,
    pub live_translation_boundary: LiveTranslationBoundaryReport,
    pub live_tts_boundary: LiveTtsBoundaryReport,
    pub live_pipeline_gate: LiveRuntimePipelineGateReport,
    pub live_meeting_runtime_gate: LiveMeetingRuntimeGateStatus,
    pub local_worker_manifest: LocalWorkerManifestReport,
    pub internal_validation_gate: InternalValidationGateReport,
    // Canonical product Meeting lifecycle/preflight. Normal product readiness should
    // consume this field rather than the migration/live/professional gates above.
    pub meeting_session: MeetingSessionStatus,
    pub next_action: String,
    pub summary: String,
}

pub fn build_runtime_status_bundle() -> RuntimeStatusBundleReport {
    let engine_status = crate::engine::current_status();
    let readiness = analyze_runtime_readiness_bundle();
    let capture_gate = plan_native_capture_gate(
        NativeCaptureGateRequest::default(),
        latest_runtime_session_state(),
    );
    let live_capture = live_capture_status();
    let live_audio_buffer = live_audio_buffer_status();
    let live_target_segment = live_target_segment_snapshot();
    let live_asr_boundary = analyze_live_asr_boundary();
    let native_asr_decoder = analyze_native_asr_decoder_bridge();
    let live_translation_boundary = analyze_live_translation_boundary();
    let live_tts_boundary = analyze_live_tts_boundary();
    let live_pipeline_gate = analyze_live_runtime_pipeline_gate();
    let live_meeting_runtime_gate = get_live_meeting_runtime_gate_status();
    let local_worker_manifest = analyze_local_worker_manifest();
    let internal_validation_gate = analyze_internal_validation_gate();
    let meeting_session = get_meeting_session_status();

    // This next_action/summary remains a Developer Diagnostics aggregate. It is not
    // the normal product readiness authority; runtimeProductFacade maps normal UI
    // readiness from meeting_session + current worker/input/inventory evidence.
    let next_action = if internal_validation_gate.ready_for_release_candidate {
        "release_candidate_gate_complete".to_string()
    } else if internal_validation_gate.ready_for_owner_validation {
        "run_release_candidate_packaging_review".to_string()
    } else if !local_worker_manifest.ok {
        "install_or_validate_local_worker_assets".to_string()
    } else if meeting_session.preflight.ready_for_start {
        "meeting_start_preflight_ready".to_string()
    } else if live_meeting_runtime_gate.ready {
        "inspect_legacy_meeting_gate_in_diagnostics".to_string()
    } else if live_pipeline_gate.ready_for_user_runtime {
        live_meeting_runtime_gate.next_action.clone()
    } else if live_tts_boundary.ok {
        "play_translated_audio_output".to_string()
    } else if live_translation_boundary.ok {
        "call_tts_or_playback_output".to_string()
    } else if native_asr_decoder.ok {
        "call_native_translation_decoder".to_string()
    } else if live_asr_boundary.ready_for_decoder_call {
        "call_native_asr_decoder".to_string()
    } else if live_asr_boundary.input_ready {
        "resolve_asr_model_backend_or_decoder".to_string()
    } else if live_target_segment.ready {
        "prepare_live_asr_boundary".to_string()
    } else if live_audio_buffer.ready_for_target_asr_frame {
        "extract_target_asr_frame".to_string()
    } else if live_audio_buffer.ready_for_vad {
        "continue_collecting_until_segment_ready".to_string()
    } else if live_capture.stream_active {
        "continue_listening_or_stop".to_string()
    } else if capture_gate.ready_for_capture_start {
        "start_live_capture_stream".to_string()
    } else if readiness.session_state.has_active_session {
        "continue_native_runtime_or_stop".to_string()
    } else if readiness.ready_for_start_command {
        "start_capture".to_string()
    } else if readiness.handoff_state.has_snapshot {
        "rerun_realtime_handoff_for_diagnostics".to_string()
    } else {
        "inspect_runtime_diagnostics".to_string()
    };
    let summary = format!(
        "diagnostics_bundle: meeting_preflight_ready={}, meeting_blockers={}, worker_install={}, legacy_pipeline_progress={}%, legacy_meeting_gate_ready={}, internal_validation={}%, live_capture={}, frames_received={}, buffer_ms={}",
        meeting_session.preflight.ready_for_start,
        meeting_session.preflight.blockers.len(),
        local_worker_manifest.ok,
        live_pipeline_gate.progress_percent,
        live_meeting_runtime_gate.ready,
        internal_validation_gate.progress_percent,
        live_capture.stream_active,
        live_capture.frames_received,
        live_audio_buffer.buffered_duration_ms,
    );

    RuntimeStatusBundleReport {
        engine_status,
        readiness,
        capture_gate,
        live_capture,
        live_audio_buffer,
        live_target_segment,
        live_asr_boundary,
        native_asr_decoder,
        live_translation_boundary,
        live_tts_boundary,
        live_pipeline_gate,
        live_meeting_runtime_gate,
        local_worker_manifest,
        internal_validation_gate,
        meeting_session,
        next_action,
        summary,
    }
}
