use serde::{Deserialize, Serialize};

use super::input_config::{InputConfigRangeInfo, NativeInputConfigProbeReport};
use super::{TARGET_CHANNELS, TARGET_SAMPLE_RATE_HZ};

const MIN_CAPTURE_FRAME_MS: u32 = 10;
const MAX_CAPTURE_FRAME_MS: u32 = 250;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeCaptureStreamPlanRequest {
    pub allow_non_target_device_rate: bool,
    pub allow_channel_downmix: bool,
    pub requested_frame_ms: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeCaptureStreamPlanReport {
    pub ready_for_stream_build: bool,
    pub selected_sample_rate_hz: Option<u32>,
    pub selected_channels: Option<u16>,
    pub selected_sample_format: Option<String>,
    pub selected_frame_ms: u32,
    pub requires_resample_to_target: bool,
    pub requires_channel_downmix: bool,
    pub input_config: NativeInputConfigProbeReport,
    pub blockers: Vec<String>,
    pub note: String,
}

impl Default for NativeCaptureStreamPlanRequest {
    fn default() -> Self {
        Self {
            allow_non_target_device_rate: false,
            allow_channel_downmix: true,
            requested_frame_ms: 20,
        }
    }
}

pub fn plan_native_capture_stream(request: NativeCaptureStreamPlanRequest) -> NativeCaptureStreamPlanReport {
    let selected_frame_ms = request.requested_frame_ms.clamp(MIN_CAPTURE_FRAME_MS, MAX_CAPTURE_FRAME_MS);
    let input_config = NativeInputConfigProbeReport::probe_default_input();
    let selected = select_best_config(&input_config, &request);
    let selected_sample_rate_hz = selected.as_ref().map(|config| {
        if config.supports_target_sample_rate {
            TARGET_SAMPLE_RATE_HZ
        } else {
            config.max_sample_rate_hz
        }
    });
    let selected_channels = selected.as_ref().map(|config| {
        if config.channels >= TARGET_CHANNELS {
            TARGET_CHANNELS
        } else {
            config.channels
        }
    });
    let selected_sample_format = selected.as_ref().map(|config| config.sample_format.clone());
    let requires_resample_to_target = selected_sample_rate_hz
        .map(|sample_rate| sample_rate != TARGET_SAMPLE_RATE_HZ)
        .unwrap_or(false);
    let requires_channel_downmix = selected
        .as_ref()
        .map(|config| config.channels > TARGET_CHANNELS)
        .unwrap_or(false);

    let mut blockers = input_config.blockers.clone();
    if selected.is_none() {
        blockers.push("capture_plan:no_compatible_input_config".to_string());
    }
    if requires_resample_to_target && !request.allow_non_target_device_rate {
        blockers.push("capture_plan:resample_required_but_not_allowed".to_string());
    }
    if requires_channel_downmix && !request.allow_channel_downmix {
        blockers.push("capture_plan:downmix_required_but_not_allowed".to_string());
    }
    if request.requested_frame_ms == 0 {
        blockers.push("capture_plan:invalid_frame_ms".to_string());
    }
    if request.requested_frame_ms != selected_frame_ms {
        blockers.push("capture_plan:frame_ms_clamped".to_string());
    }

    blockers.sort();
    blockers.dedup();
    let ready_for_stream_build = blockers.is_empty();
    let note = if ready_for_stream_build {
        "Native capture stream plan is ready for a later CPAL stream builder. This planner does not open the microphone stream.".to_string()
    } else {
        format!(
            "Native capture stream plan is blocked before stream build. blocker_count={}",
            blockers.len()
        )
    };

    NativeCaptureStreamPlanReport {
        ready_for_stream_build,
        selected_sample_rate_hz,
        selected_channels,
        selected_sample_format,
        selected_frame_ms,
        requires_resample_to_target,
        requires_channel_downmix,
        input_config,
        blockers,
        note,
    }
}

fn select_best_config(
    input_config: &NativeInputConfigProbeReport,
    request: &NativeCaptureStreamPlanRequest,
) -> Option<InputConfigRangeInfo> {
    input_config
        .supported_input_ranges
        .iter()
        .filter(|config| config.supports_target_channels)
        .filter(|config| request.allow_non_target_device_rate || config.supports_target_sample_rate)
        .cloned()
        .min_by_key(|config| {
            let rate_distance = if config.supports_target_sample_rate {
                0
            } else {
                config.max_sample_rate_hz.abs_diff(TARGET_SAMPLE_RATE_HZ)
            };
            let channel_distance = config.channels.saturating_sub(TARGET_CHANNELS) as u32;
            rate_distance + channel_distance
        })
}
