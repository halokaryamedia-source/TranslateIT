use serde::{Deserialize, Serialize};

use super::capture_plan::{plan_native_capture_stream, NativeCaptureStreamPlanReport, NativeCaptureStreamPlanRequest};
use super::{TARGET_CHANNELS, TARGET_SAMPLE_RATE_HZ};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeCaptureStreamBuildRequest {
    pub allow_stream_open: bool,
    pub buffer_capacity_frames: usize,
    pub requested_frame_ms: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeCaptureCallbackPlan {
    pub callback_sample_rate_hz: Option<u32>,
    pub callback_channels: Option<u16>,
    pub callback_sample_format: Option<String>,
    pub target_sample_rate_hz: u32,
    pub target_channels: u16,
    pub buffer_capacity_frames: usize,
    pub requires_resample_to_target: bool,
    pub requires_channel_downmix: bool,
    pub ready_for_callback_wiring: bool,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeCaptureStreamBuildReport {
    pub ready_for_stream_build: bool,
    pub stream_open_allowed: bool,
    pub stream_open_performed: bool,
    pub capture_plan: NativeCaptureStreamPlanReport,
    pub callback_plan: NativeCaptureCallbackPlan,
    pub blockers: Vec<String>,
    pub note: String,
}

impl Default for NativeCaptureStreamBuildRequest {
    fn default() -> Self {
        Self {
            allow_stream_open: false,
            buffer_capacity_frames: 32,
            requested_frame_ms: 20,
        }
    }
}

pub fn plan_native_capture_stream_build(
    request: NativeCaptureStreamBuildRequest,
) -> NativeCaptureStreamBuildReport {
    let capture_plan = plan_native_capture_stream(NativeCaptureStreamPlanRequest {
        allow_non_target_device_rate: false,
        allow_channel_downmix: true,
        requested_frame_ms: request.requested_frame_ms,
    });

    let callback_plan = NativeCaptureCallbackPlan {
        callback_sample_rate_hz: capture_plan.selected_sample_rate_hz,
        callback_channels: capture_plan.selected_channels,
        callback_sample_format: capture_plan.selected_sample_format.clone(),
        target_sample_rate_hz: TARGET_SAMPLE_RATE_HZ,
        target_channels: TARGET_CHANNELS,
        buffer_capacity_frames: request.buffer_capacity_frames,
        requires_resample_to_target: capture_plan.requires_resample_to_target,
        requires_channel_downmix: capture_plan.requires_channel_downmix,
        ready_for_callback_wiring: capture_plan.ready_for_stream_build && request.buffer_capacity_frames > 0,
        note: "Callback plan maps the selected CPAL stream config into the target frame buffer contract. No microphone stream is opened here.".to_string(),
    };

    let mut blockers = capture_plan.blockers.clone();
    if request.buffer_capacity_frames == 0 {
        blockers.push("stream_build:invalid_buffer_capacity".to_string());
    }
    if request.allow_stream_open {
        blockers.push("stream_build:stream_open_not_implemented_in_contract".to_string());
    }

    blockers.sort();
    blockers.dedup();
    let ready_for_stream_build = blockers.is_empty();
    let note = if ready_for_stream_build {
        "Native capture stream build contract is ready for later CPAL stream construction. This report does not open the stream.".to_string()
    } else {
        format!("Native capture stream build contract is blocked. blocker_count={}", blockers.len())
    };

    NativeCaptureStreamBuildReport {
        ready_for_stream_build,
        stream_open_allowed: request.allow_stream_open,
        stream_open_performed: false,
        capture_plan,
        callback_plan,
        blockers,
        note,
    }
}
