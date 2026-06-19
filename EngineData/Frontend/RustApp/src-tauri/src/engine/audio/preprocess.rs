use serde::{Deserialize, Serialize};

use super::{AudioFrame, TARGET_SAMPLE_RATE_HZ};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioPreprocessRequest {
    pub frame: AudioFrame,
    pub floor_rms: f32,
    pub target_rate: Option<u32>,
    pub gate_multiplier: Option<f32>,
    pub mode: String,
    pub collect_stats: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AudioFrameStats {
    pub sample_rate: u32,
    pub frame_count: usize,
    pub duration_ms: u32,
    pub rms: f32,
    pub peak: f32,
    pub clipping: bool,
    pub input_state: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct PreprocessingResult {
    pub samples: Vec<f32>,
    pub stats: AudioFrameStats,
    pub noise_gate_threshold: f32,
}

pub fn preprocess_audio(request: AudioPreprocessRequest) -> PreprocessingResult {
    let target_rate = request.target_rate.unwrap_or(TARGET_SAMPLE_RATE_HZ);
    let source_rate = request.frame.sample_rate_hz;
    let mono = to_mono(&request.frame.samples, request.frame.channels);
    let resampled = resample(&mono, source_rate, target_rate);
    match request.mode.as_str() {
        "vad" => {
            let stats = analyze(&resampled, target_rate, request.floor_rms);
            PreprocessingResult {
                samples: resampled,
                stats,
                noise_gate_threshold: 0.0,
            }
        }
        "asr" => {
            let normalized = soft_normalize(&resampled, 0.80);
            let stats = if request.collect_stats.unwrap_or(true) {
                analyze(&normalized, target_rate, 0.0)
            } else {
                prepared_stats(normalized.len(), target_rate)
            };
            PreprocessingResult {
                samples: normalized,
                stats,
                noise_gate_threshold: 0.0,
            }
        }
        _ => {
            let normalized = soft_normalize(&resampled, 0.95);
            let multiplier = request.gate_multiplier.unwrap_or(1.8);
            let threshold = noise_gate_threshold(request.floor_rms, multiplier);
            let gated = noise_gate(&normalized, threshold);
            let stats = analyze(&gated, target_rate, request.floor_rms);
            PreprocessingResult {
                samples: gated,
                stats,
                noise_gate_threshold: threshold,
            }
        }
    }
}

fn to_mono(samples: &[f32], channels: u16) -> Vec<f32> {
    if channels <= 1 {
        return samples.iter().map(|value| value.clamp(-1.0, 1.0)).collect();
    }
    let channel_count = channels as usize;
    samples
        .chunks(channel_count)
        .map(|chunk| {
            let sum = chunk.iter().copied().sum::<f32>();
            (sum / chunk.len().max(1) as f32).clamp(-1.0, 1.0)
        })
        .collect()
}

fn resample(samples: &[f32], source_rate: u32, target_rate: u32) -> Vec<f32> {
    if source_rate == 0 || source_rate == target_rate || samples.is_empty() {
        return samples.to_vec();
    }
    let target_size = ((samples.len() as f32) * (target_rate as f32 / source_rate as f32))
        .round()
        .max(1.0) as usize;
    if target_size == 1 {
        return vec![samples[0]];
    }
    let source_last = (samples.len() - 1) as f32;
    let target_last = (target_size - 1) as f32;
    (0..target_size)
        .map(|index| {
            let position = (index as f32 / target_last) * source_last;
            let left = position.floor() as usize;
            let right = position.ceil() as usize;
            if left == right {
                samples[left]
            } else {
                let ratio = position - left as f32;
                samples[left] * (1.0 - ratio) + samples[right.min(samples.len() - 1)] * ratio
            }
        })
        .collect()
}

fn rms(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    (samples.iter().map(|value| value * value).sum::<f32>() / samples.len() as f32).sqrt()
}

fn peak(samples: &[f32]) -> f32 {
    samples
        .iter()
        .map(|value| value.abs())
        .fold(0.0_f32, f32::max)
}

fn soft_normalize(samples: &[f32], target_peak: f32) -> Vec<f32> {
    let peak = peak(samples);
    if samples.is_empty() || peak <= 0.0 {
        return samples.to_vec();
    }
    let scale = 1.0_f32.min(target_peak / peak);
    samples
        .iter()
        .map(|value| (value * scale).clamp(-1.0, 1.0))
        .collect()
}

fn noise_gate_threshold(floor_rms: f32, gate_multiplier: f32) -> f32 {
    0.005_f32.max(floor_rms * gate_multiplier)
}

fn noise_gate(samples: &[f32], threshold: f32) -> Vec<f32> {
    samples
        .iter()
        .map(|value| if value.abs() < threshold { 0.0 } else { *value })
        .collect()
}

fn classify_state(samples: &[f32], floor_rms: f32) -> String {
    let rms_value = rms(samples);
    let peak_value = peak(samples);
    if peak_value >= 0.99 {
        "Too Loud / Clipping".to_string()
    } else if rms_value <= 0.005_f32.max(floor_rms * 0.5) {
        "Too Quiet".to_string()
    } else if rms_value <= 0.03_f32.max(floor_rms * 1.2) {
        "Background Noise High".to_string()
    } else {
        "Good".to_string()
    }
}

fn analyze(samples: &[f32], sample_rate: u32, floor_rms: f32) -> AudioFrameStats {
    let duration_ms =
        (((samples.len() as f32) / sample_rate.max(1) as f32) * 1000.0).round() as u32;
    let peak_value = peak(samples);
    AudioFrameStats {
        sample_rate,
        frame_count: samples.len(),
        duration_ms,
        rms: rms(samples),
        peak: peak_value,
        clipping: peak_value >= 0.99,
        input_state: classify_state(samples, floor_rms),
    }
}

fn prepared_stats(frame_count: usize, sample_rate: u32) -> AudioFrameStats {
    AudioFrameStats {
        sample_rate,
        frame_count,
        duration_ms: (((frame_count as f32) / sample_rate.max(1) as f32) * 1000.0).round() as u32,
        rms: 0.0,
        peak: 0.0,
        clipping: false,
        input_state: "Prepared".to_string(),
    }
}
