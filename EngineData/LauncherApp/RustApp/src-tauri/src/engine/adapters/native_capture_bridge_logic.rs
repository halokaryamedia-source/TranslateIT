use serde::{Deserialize, Serialize};

use crate::engine::audio::input_config::NativeInputConfigProbeReport;
use crate::engine::runtime_state::RuntimeSessionStateReport;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeCaptureBridgeRequest {
    pub require_active_session: bool,
    pub require_safe_to_stop: bool,
    pub requested_sample_rate_hz: u32,
    pub requested_channels: u16,
    pub requested_frame_ms: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct NativeCaptureBridgeReport {
    pub ready_for_stream_creation: bool,
    pub active_session_required: bool,
    pub active_session_present: bool,
    pub safe_to_stop_ready: bool,
    pub input_config_probe: NativeInputConfigProbeReport,
    pub requested_sample_rate_hz: u32,
    pub requested_channels: u16,
    pub requested_frame_ms: u32,
    pub backend: String,
    pub blockers: Vec<String>,
    pub note: String,
}

impl Default for NativeCaptureBridgeRequest {
    fn default() -> Self {
        Self {
            require_active_session: true,
            require_safe_to_stop: true,
            requested_sample_rate_hz: 16_000,
            requested_channels: 1,
            requested_frame_ms: 20,
        }
    }
}

pub fn analyze_native_capture_bridge(
    request: NativeCaptureBridgeRequest,
    session_state: RuntimeSessionStateReport,
) -> NativeCaptureBridgeReport {
    let input_config_probe = NativeInputConfigProbeReport::probe_default_input();
    let active_session_present = session_state.has_active_session;
    let safe_to_stop_ready = session_state
        .snapshot
        .as_ref()
        .map(|snapshot| snapshot.safe_to_stop)
        .unwrap_or(false);

    let mut blockers = Vec::new();
    if request.require_active_session && !active_session_present {
        blockers.push("capture:no_active_runtime_session".to_string());
    }
    if request.require_safe_to_stop && !safe_to_stop_ready {
        blockers.push("capture:session_not_safe_to_stop".to_string());
    }
    if !input_config_probe.ready_for_capture_bridge {
        blockers.extend(input_config_probe.blockers.iter().cloned());
    }
    if request.requested_sample_rate_hz == 0 {
        blockers.push("capture:invalid_sample_rate".to_string());
    }
    if request.requested_channels == 0 {
        blockers.push("capture:invalid_channel_count".to_string());
    }
    if request.requested_frame_ms == 0 {
        blockers.push("capture:invalid_frame_size".to_string());
    }

    blockers.sort();
    blockers.dedup();

    let ready_for_stream_creation = blockers.is_empty();
    let note = if ready_for_stream_creation {
        "Native capture bridge contract is ready for CPAL stream creation, but the real stream is not opened by this report.".to_string()
    } else {
        format!(
            "Native capture bridge is blocked before real CPAL stream creation. blocker_count={}",
            blockers.len()
        )
    };

    NativeCaptureBridgeReport {
        ready_for_stream_creation,
        active_session_required: request.require_active_session,
        active_session_present,
        safe_to_stop_ready,
        input_config_probe,
        requested_sample_rate_hz: request.requested_sample_rate_hz,
        requested_channels: request.requested_channels,
        requested_frame_ms: request.requested_frame_ms,
        backend: "cpal".to_string(),
        blockers,
        note,
    }
}
