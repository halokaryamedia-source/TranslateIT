use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioEvidenceReport {
    pub rms: f32,
    pub peak: f32,
    pub mean_abs: f32,
    pub zero_crossing_rate: f32,
    pub active_frame_ratio: f32,
    pub clipping_ratio: f32,
}

impl AudioEvidenceReport {
    pub fn from_samples(samples: &[f32]) -> Self {
        if samples.is_empty() {
            return Self::empty();
        }

        let mut sum_square = 0.0_f32;
        let mut sum_abs = 0.0_f32;
        let mut peak = 0.0_f32;
        let mut crossings = 0_usize;
        let mut active = 0_usize;
        let mut clipping = 0_usize;
        let active_threshold = 0.01_f32;

        for (index, sample) in samples.iter().enumerate() {
            let value = sample.clamp(-1.0, 1.0);
            let abs = value.abs();
            sum_square += value * value;
            sum_abs += abs;
            peak = peak.max(abs);

            if abs >= active_threshold {
                active += 1;
            }
            if abs >= 0.98 {
                clipping += 1;
            }
            if index > 0 {
                let previous = samples[index - 1].clamp(-1.0, 1.0);
                if (previous >= 0.0 && value < 0.0) || (previous < 0.0 && value >= 0.0) {
                    crossings += 1;
                }
            }
        }

        let len = samples.len() as f32;
        Self {
            rms: (sum_square / len).sqrt(),
            peak,
            mean_abs: sum_abs / len,
            zero_crossing_rate: crossings as f32 / len.max(1.0),
            active_frame_ratio: active as f32 / len.max(1.0),
            clipping_ratio: clipping as f32 / len.max(1.0),
        }
    }

    pub fn empty() -> Self {
        Self {
            rms: 0.0,
            peak: 0.0,
            mean_abs: 0.0,
            zero_crossing_rate: 0.0,
            active_frame_ratio: 0.0,
            clipping_ratio: 0.0,
        }
    }
}
