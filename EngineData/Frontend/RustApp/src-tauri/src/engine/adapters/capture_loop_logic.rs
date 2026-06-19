use serde::Serialize;

use crate::engine::audio::buffer::{planned_buffer_status, AudioBufferStatus};
use crate::engine::audio::input::InputPreparationStatus;

#[derive(Debug, Clone, Serialize)]
pub struct CaptureLoopContractReport {
    pub backend_id: String,
    pub input_device_name: Option<String>,
    pub target_sample_rate_hz: u32,
    pub target_channels: u16,
    pub input_prepared: bool,
    pub input_running: bool,
    pub buffer_ready_for_vad: bool,
    pub buffer_ready_for_calibration: bool,
    pub ready_for_stream_loop: bool,
    pub blockers: Vec<String>,
    pub note: String,
    pub input_status: InputPreparationStatus,
    pub buffer_status: AudioBufferStatus,
}

pub fn build_capture_loop_contract() -> CaptureLoopContractReport {
    let input_status = InputPreparationStatus::inspect_default_input();
    let buffer_status = planned_buffer_status();
    let mut blockers = Vec::new();

    if !input_status.prepared {
        blockers.push("input:not_prepared".to_string());
    }
    if input_status.running {
        blockers.push("input:already_running".to_string());
    }
    if !buffer_status.ready_for_vad {
        blockers.push("buffer:not_ready_for_vad".to_string());
    }
    if !buffer_status.ready_for_calibration {
        blockers.push("buffer:not_ready_for_calibration".to_string());
    }

    let ready_for_stream_loop = blockers.is_empty();
    let note = if ready_for_stream_loop {
        "Capture loop contract is ready. Real CPAL stream start still needs runtime stream ownership integration.".to_string()
    } else {
        "Capture loop contract is blocked until input device and audio buffer readiness are satisfied.".to_string()
    };

    CaptureLoopContractReport {
        backend_id: input_status.backend_id.clone(),
        input_device_name: input_status.input_device_name.clone(),
        target_sample_rate_hz: input_status.target_sample_rate_hz,
        target_channels: input_status.target_channels,
        input_prepared: input_status.prepared,
        input_running: input_status.running,
        buffer_ready_for_vad: buffer_status.ready_for_vad,
        buffer_ready_for_calibration: buffer_status.ready_for_calibration,
        ready_for_stream_loop,
        blockers,
        note,
        input_status,
        buffer_status,
    }
}
