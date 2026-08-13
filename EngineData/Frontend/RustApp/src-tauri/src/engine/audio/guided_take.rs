use serde::Serialize;

pub const GUIDED_TAKE_SAMPLE_RATE_HZ: u32 = 32_000;
pub const GUIDED_TAKE_CHANNELS: u16 = 1;
pub const GUIDED_TAKE_BITS_PER_SAMPLE: u16 = 16;

#[derive(Debug, Clone, Serialize)]
pub struct GuidedTakeReview {
    pub line_id: u32,
    pub duration_ms: u64,
    pub quality_blocker: String,
}
