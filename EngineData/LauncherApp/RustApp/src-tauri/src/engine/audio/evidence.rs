use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioEvidenceReport {
    pub reason: String,
    pub rms: f32,
    pub peak: f32,
    pub mean_abs: f32,
    pub peak_to_rms_ratio: f32,
    pub speech_to_noise_gap: f32,
    pub voiced_frame_ratio: f32,
    pub zero_crossing_rate: f32,
    pub frame_energy_concentration: f32,
    pub frame_active_ratio: f32,
    pub active_frame_ratio: f32,
    pub impulse_edge_ratio: f32,
    pub clipping_ratio: f32,
}

impl AudioEvidenceReport {
    pub fn from_samples(samples: &[f32]) -> Self {
        Self::from_samples_with_noise_floor(samples, 0.0, "Normal")
    }

    pub fn from_samples_with_noise_floor(samples: &[f32], noise_floor_rms: f32, sensitivity: &str) -> Self {
        if samples.is_empty() {
            return Self::empty_with_reason("rejected_silence");
        }
        let normalized = samples.iter().map(|sample| sample.clamp(-1.0, 1.0)).collect::<Vec<_>>();
        let len = normalized.len() as f32;
        let sum_square = normalized.iter().map(|value| value * value).sum::<f32>();
        let sum_abs = normalized.iter().map(|value| value.abs()).sum::<f32>();
        let rms = (sum_square / len).sqrt();
        let peak = normalized.iter().map(|value| value.abs()).fold(0.0_f32, f32::max);
        let peak_to_rms_ratio = peak / rms.max(0.0001);
        let speech_to_noise_gap = rms - noise_floor_rms;
        let threshold = 0.0025_f32.max(noise_floor_rms * 1.45);
        let voiced_frame_ratio = normalized.iter().filter(|value| value.abs() >= threshold).count() as f32 / len.max(1.0);
        let zero_crossing_rate = zero_crossing_rate(&normalized);
        let impulse_edge_ratio = impulse_edge_ratio(&normalized, noise_floor_rms, rms);
        let (frame_energy_concentration, frame_active_ratio) = frame_metrics(&normalized, noise_floor_rms, rms);
        let clipping_ratio = normalized.iter().filter(|value| value.abs() >= 0.98).count() as f32 / len.max(1.0);
        let active_frame_ratio = normalized.iter().filter(|value| value.abs() >= 0.01).count() as f32 / len.max(1.0);
        let sensitivity = normalize_sensitivity(sensitivity);
        let (min_peak, min_rms, min_voiced) = sensitivity_thresholds(sensitivity);
        let strong_voiced_speech = sensitivity == "High"
            && voiced_frame_ratio >= 0.16
            && speech_to_noise_gap >= -0.0003
            && peak >= (min_peak * 0.80).max(0.0042);
        let reason = if peak < 0.002 && rms < 0.001 {
            "rejected_silence"
        } else if rms < min_rms && peak < min_peak && !strong_voiced_speech {
            "rejected_low_energy"
        } else if speech_to_noise_gap < 0.0012 && peak < min_peak {
            "rejected_low_snr"
        } else if voiced_frame_ratio < min_voiced && peak < (min_peak * 1.15).max(0.01) && !strong_voiced_speech {
            "rejected_unconfirmed_speech"
        } else if normalized.len() >= 640 && noise_like_impulse(peak_to_rms_ratio, voiced_frame_ratio, frame_energy_concentration, frame_active_ratio, impulse_edge_ratio, zero_crossing_rate) && !strong_voiced_speech {
            "rejected_noise_like_impulse"
        } else {
            ""
        };
        Self {
            reason: reason.to_string(),
            rms,
            peak,
            mean_abs: sum_abs / len,
            peak_to_rms_ratio,
            speech_to_noise_gap,
            voiced_frame_ratio,
            zero_crossing_rate,
            frame_energy_concentration,
            frame_active_ratio,
            active_frame_ratio,
            impulse_edge_ratio,
            clipping_ratio,
        }
    }

    pub fn empty() -> Self {
        Self::empty_with_reason("")
    }

    fn empty_with_reason(reason: &str) -> Self {
        Self {
            reason: reason.to_string(),
            rms: 0.0,
            peak: 0.0,
            mean_abs: 0.0,
            peak_to_rms_ratio: 0.0,
            speech_to_noise_gap: 0.0,
            voiced_frame_ratio: 0.0,
            zero_crossing_rate: 0.0,
            frame_energy_concentration: 0.0,
            frame_active_ratio: 0.0,
            active_frame_ratio: 0.0,
            impulse_edge_ratio: 0.0,
            clipping_ratio: 0.0,
        }
    }
}

fn normalize_sensitivity(value: &str) -> &str {
    match value {
        "Low" | "High" => value,
        "Headset" => "High",
        _ => "Normal",
    }
}

fn sensitivity_thresholds(value: &str) -> (f32, f32, f32) {
    match value {
        "Low" => (0.0085, 0.0019, 0.040),
        "High" => (0.0040, 0.0008, 0.009),
        _ => (0.0055, 0.0010, 0.016),
    }
}

fn zero_crossing_rate(samples: &[f32]) -> f32 {
    if samples.len() <= 1 { return 0.0; }
    let crossings = samples.windows(2).filter(|pair| (pair[0] >= 0.0 && pair[1] < 0.0) || (pair[0] < 0.0 && pair[1] >= 0.0)).count();
    crossings as f32 / (samples.len() - 1).max(1) as f32
}

fn impulse_edge_ratio(samples: &[f32], noise_floor_rms: f32, rms: f32) -> f32 {
    if samples.len() <= 1 { return 0.0; }
    let threshold = 0.006_f32.max(noise_floor_rms * 1.8).max(rms * 1.7);
    let edges = samples.windows(2).filter(|pair| (pair[1] - pair[0]).abs() >= threshold).count();
    edges as f32 / (samples.len() - 1).max(1) as f32
}

fn frame_metrics(samples: &[f32], noise_floor_rms: f32, rms: f32) -> (f32, f32) {
    let frame_size = 320;
    let frame_count = samples.len() / frame_size;
    if frame_count == 0 { return (0.0, 0.0); }
    let mut energies = samples[..frame_count * frame_size]
        .chunks(frame_size)
        .map(|frame| frame.iter().map(|value| value * value).sum::<f32>() / frame_size as f32)
        .collect::<Vec<_>>();
    let total_energy = energies.iter().sum::<f32>();
    let frame_energy_concentration = if total_energy > 0.0 {
        energies.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let top_count = energies.len().min(3);
        energies[energies.len() - top_count..].iter().sum::<f32>() / total_energy
    } else { 0.0 };
    let active_threshold = ((noise_floor_rms * 1.25).powi(2)).max((rms * 0.45).powi(2)).max(1e-7);
    let frame_active_ratio = energies.iter().filter(|energy| **energy >= active_threshold).count() as f32 / energies.len().max(1) as f32;
    (frame_energy_concentration, frame_active_ratio)
}

fn noise_like_impulse(peak_to_rms_ratio: f32, voiced_ratio: f32, concentration: f32, active_ratio: f32, impulse_edge_ratio: f32, zcr: f32) -> bool {
    (peak_to_rms_ratio >= 7.0 && voiced_ratio <= 0.10 && concentration >= 0.70 && active_ratio <= 0.35)
        || (concentration >= 0.85 && active_ratio <= 0.28 && peak_to_rms_ratio >= 5.5 && voiced_ratio <= 0.10)
        || (impulse_edge_ratio >= 0.05 && voiced_ratio <= 0.10 && peak_to_rms_ratio >= 5.5)
        || (zcr <= 0.12 && voiced_ratio <= 0.10 && peak_to_rms_ratio >= 5.0 && active_ratio <= 0.35)
}
