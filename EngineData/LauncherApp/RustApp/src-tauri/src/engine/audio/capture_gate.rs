use serde::{Deserialize, Serialize};

use super::stream_build::{plan_native_capture_stream_build, NativeCaptureStreamBuildReport, NativeCaptureStreamBuildRequest};
use crate::engine::runtime_state::RuntimeSessionStateReport;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeCaptureGateRequest {
    pub allow_stream_open: bool,
    pub buffer_capacity_frames: usize,
    pub requested_frame_ms: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeCaptureGateReport {
    pub ready_for_capture_start: bool,
    pub stream_open_requested: bool,
    pub stream_open_performed: bool,
    pub active_session_present: bool,
    pub session_safe_to_stop: bool,
    pub build: NativeCaptureStreamBuildReport,
    pub blockers: Vec<String>,
    pub note: String,
}

impl Default for NativeCaptureGateRequest {
    fn default() -> Self {
        Self {
            allow_stream_open: false,
            buffer_capacity_frames: 32,
            requested_frame_ms: 20,
        }
    }
}

pub fn plan_native_capture_gate(
    request: NativeCaptureGateRequest,
    session_state: RuntimeSessionStateReport,
) -> NativeCaptureGateReport {
    let build = plan_native_capture_stream_build(NativeCaptureStreamBuildRequest {
        allow_stream_open: request.allow_stream_open,
        buffer_capacity_frames: request.buffer_capacity_frames,
        requested_frame_ms: request.requested_frame_ms,
    });
    let active_session_present = session_state.has_active_session;
    let session_safe_to_stop = session_state
        .snapshot
        .as_ref()
        .map(|snapshot| snapshot.safe_to_stop)
        .unwrap_or(false);

    let mut blockers = build.blockers.clone();
    if !active_session_present {
        blockers.push("capture_gate:no_active_session".to_string());
    }
    if !session_safe_to_stop {
        blockers.push("capture_gate:session_not_safe".to_string());
    }
    if request.allow_stream_open {
        blockers.push("capture_gate:stream_open_deferred".to_string());
    }

    blockers.sort();
    blockers.dedup();
    let ready_for_capture_start = blockers.is_empty();
    let note = if ready_for_capture_start {
        "Native capture gate is ready for a later validated CPAL stream start. This gate does not open the microphone stream.".to_string()
    } else {
        format!("Native capture gate is blocked. blocker_count={}", blockers.len())
    };

    NativeCaptureGateReport {
        ready_for_capture_start,
        stream_open_requested: request.allow_stream_open,
        stream_open_performed: false,
        active_session_present,
        session_safe_to_stop,
        build,
        blockers,
        note,
    }
}
