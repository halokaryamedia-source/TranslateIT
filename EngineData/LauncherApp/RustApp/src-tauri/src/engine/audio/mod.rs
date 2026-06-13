pub mod evidence;
pub mod vad;

pub const TARGET_SAMPLE_RATE_HZ: u32 = 16_000;
pub const TARGET_CHANNELS: u16 = 1;

#[derive(Debug, Clone)]
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
