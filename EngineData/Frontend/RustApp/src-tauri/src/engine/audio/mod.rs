pub mod evidence;
pub mod finalized_utterance;
pub mod input;
pub mod live_audio_buffer;
pub mod live_capture;
pub mod live_segment_writer;
pub mod meeting_output;
pub mod meeting_sound_capture;
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
