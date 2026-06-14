use serde::Serialize;

use crate::engine::adapters::runtime_readiness_bundle_logic::{
    analyze_runtime_readiness_bundle, RuntimeReadinessBundleReport,
};
use crate::engine::audio::capture_gate::{
    plan_native_capture_gate, NativeCaptureGateReport, NativeCaptureGateRequest,
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
    let next_action = if live_capture.stream_active {
        "continue_listening_or_stop".to_string()
    } else if capture_gate.ready_for_capture_start {
        "start_live_capture_stream".to_string()
    } else if readiness.session_state.has_active_session {
        "continue_native_runtime_or_stop".to_string()
    } else if readiness.ready_for_start_command {
        "start_capture".to_string()
    } else if readiness.handoff_state.has_snapshot {
        "rerun_realtime_handoff_for_full_pipeline_or_start_microphone_only".to_string()
    } else {
        "start_microphone_only_capture".to_string()
    };
    let summary = format!(
        "start={}, stop={}, active_session={}, capture_gate={}, live_capture={}, frames_received={}, user_runtime={}, blockers={}",
        readiness.ready_for_start_command,
        readiness.ready_for_stop_command,
        readiness.session_state.has_active_session,
        capture_gate.ready_for_capture_start,
        live_capture.stream_active,
        live_capture.frames_received,
        readiness.ready_for_user_facing_runtime,
        readiness.blockers.len() + capture_gate.blockers.len() + usize::from(!live_capture.blocker.is_empty())
    );

    RuntimeStatusBundleReport {
        engine_status,
        readiness,
        capture_gate,
        live_capture,
        next_action,
        summary,
    }
}
