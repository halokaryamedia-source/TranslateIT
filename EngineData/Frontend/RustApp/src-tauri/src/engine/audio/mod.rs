pub mod buffer;
pub mod calibration;
pub mod calibration_flow;
pub mod capture_gate;
pub mod capture_plan;
pub mod device;
pub mod evidence;
pub mod input;
pub mod input_config;
pub mod live_audio_buffer;
pub mod live_capture;
pub mod live_segment_writer;
pub mod noise_filter;
pub mod preprocess;
pub mod stream_build;
pub mod vad;

use serde::{Deserialize, Serialize};

pub const TARGET_SAMPLE_RATE_HZ: u32 = 16_000;
pub const TARGET_CHANNELS: u16 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioFrame {
    pub sample_rate_hz: u32,
    pub channels: u16,
    pub samples: Vec<f32>,
}

impl AudioFrame {
    pub fn is_target_format(&self) -> bool {
        self.sample_rate_hz == TARGET_SAMPLE_RATE_HZ && self.channels == TARGET_CHANNELS
    }
}
