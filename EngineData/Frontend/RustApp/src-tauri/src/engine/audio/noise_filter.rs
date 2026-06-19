use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoiseThresholds {
    pub imp_dur_min_ms: u32,
    pub imp_dur_max_ms: u32,
    pub imp_pr_min: f32,
    pub imp_peak_min: f32,
    pub imp_gap_max: f32,
    pub imp_energy_min: f32,
    pub imp_active_max: f32,
    pub imp_edge_min: f32,
    pub imp_zcr_max: f32,
    pub imp_voiced_max: f32,
    pub stat_dur_min_ms: u32,
    pub stat_voiced_max: f32,
    pub stat_gap_max: f32,
    pub stat_peak_max: f32,
    pub stat_pr_max: f32,
    pub stat_active_min: f32,
    pub stat_energy_max: f32,
    pub breath_dur_min_ms: u32,
    pub breath_dur_max_ms: u32,
    pub breath_voiced_max: f32,
    pub breath_gap_max: f32,
    pub breath_peak_max: f32,
    pub breath_pr_min: f32,
    pub breath_pr_max: f32,
    pub breath_active_min: f32,
    pub breath_energy_max: f32,
    pub bg_dur_min_ms: u32,
    pub bg_voiced_max: f32,
    pub bg_gap_max: f32,
    pub bg_peak_max: f32,
    pub bg_rms_max: f32,
    pub bg_pr_max: f32,
    pub bg_nsp_min: f32,
    pub bg_energy_max: f32,
    pub bg_active_min: f32,
    pub mix_dur_min_ms: u32,
    pub mix_voiced_max: f32,
    pub mix_gap_max: f32,
    pub mix_pr_min: f32,
    pub mix_active_max: f32,
    pub mix_edge_min: f32,
    pub mix_energy_min: f32,
    pub mix_zcr_max: f32,
}

impl Default for NoiseThresholds {
    fn default() -> Self {
        Self {
            imp_dur_min_ms: 180,
            imp_dur_max_ms: 2600,
            imp_pr_min: 5.0,
            imp_peak_min: 0.018,
            imp_gap_max: 0.018,
            imp_energy_min: 0.72,
            imp_active_max: 0.36,
            imp_edge_min: 0.03,
            imp_zcr_max: 0.12,
            imp_voiced_max: 0.12,
            stat_dur_min_ms: 260,
            stat_voiced_max: 0.10,
            stat_gap_max: 0.006,
            stat_peak_max: 0.040,
            stat_pr_max: 3.8,
            stat_active_min: 0.68,
            stat_energy_max: 0.78,
            breath_dur_min_ms: 300,
            breath_dur_max_ms: 2200,
            breath_voiced_max: 0.12,
            breath_gap_max: 0.0085,
            breath_peak_max: 0.032,
            breath_pr_min: 1.2,
            breath_pr_max: 4.2,
            breath_active_min: 0.46,
            breath_energy_max: 0.70,
            bg_dur_min_ms: 500,
            bg_voiced_max: 0.14,
            bg_gap_max: 0.010,
            bg_peak_max: 0.060,
            bg_rms_max: 0.025,
            bg_pr_max: 4.8,
            bg_nsp_min: 0.04,
            bg_energy_max: 0.76,
            bg_active_min: 0.50,
            mix_dur_min_ms: 240,
            mix_voiced_max: 0.06,
            mix_gap_max: 0.0030,
            mix_pr_min: 4.4,
            mix_active_max: 0.40,
            mix_edge_min: 0.05,
            mix_energy_min: 0.72,
            mix_zcr_max: 0.24,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoiseAssessmentRequest {
    pub audio_duration_ms: u32,
    pub voiced_frame_ratio: f32,
    pub speech_to_noise_gap: f32,
    pub audio_peak: f32,
    pub audio_rms: f32,
    pub peak_to_rms_ratio: f32,
    pub frame_energy_concentration: f32,
    pub frame_active_ratio: f32,
    pub impulse_edge_ratio: f32,
    pub zero_crossing_rate: f32,
    pub no_speech_probability: f32,
    pub thresholds: Option<NoiseThresholds>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AudioNoiseAssessment {
    pub matched: bool,
    pub category: String,
    pub label: String,
    pub reason: String,
}

pub fn classify_noise(request: NoiseAssessmentRequest) -> AudioNoiseAssessment {
    let request = sanitize_request(request);
    let t = request.thresholds.unwrap_or_default();
    if request.audio_duration_ms >= t.imp_dur_min_ms
        && request.audio_duration_ms <= t.imp_dur_max_ms
        && request.peak_to_rms_ratio >= t.imp_pr_min
        && request.audio_peak >= t.imp_peak_min
        && request.speech_to_noise_gap <= t.imp_gap_max
        && request.frame_energy_concentration >= t.imp_energy_min
        && request.frame_active_ratio <= t.imp_active_max
        && (request.impulse_edge_ratio >= t.imp_edge_min
            || request.zero_crossing_rate <= t.imp_zcr_max
            || request.voiced_frame_ratio <= t.imp_voiced_max)
    {
        return assessment(true, "impulse", "Impulse");
    }
    if request.audio_duration_ms >= t.stat_dur_min_ms
        && request.voiced_frame_ratio <= t.stat_voiced_max
        && request.speech_to_noise_gap <= t.stat_gap_max
        && request.audio_peak <= t.stat_peak_max
        && request.peak_to_rms_ratio <= t.stat_pr_max
        && request.frame_active_ratio >= t.stat_active_min
        && request.frame_energy_concentration <= t.stat_energy_max
    {
        return assessment(true, "stationary", "Stationary");
    }
    if request.audio_duration_ms >= t.breath_dur_min_ms
        && request.audio_duration_ms <= t.breath_dur_max_ms
        && request.voiced_frame_ratio <= t.breath_voiced_max
        && request.speech_to_noise_gap <= t.breath_gap_max
        && request.audio_peak <= t.breath_peak_max
        && request.peak_to_rms_ratio >= t.breath_pr_min
        && request.peak_to_rms_ratio <= t.breath_pr_max
        && request.frame_active_ratio >= t.breath_active_min
        && request.frame_energy_concentration <= t.breath_energy_max
    {
        return assessment(true, "breath_handling", "Breath");
    }
    if request.audio_duration_ms >= t.bg_dur_min_ms
        && request.voiced_frame_ratio <= t.bg_voiced_max
        && request.speech_to_noise_gap <= t.bg_gap_max
        && request.audio_peak <= t.bg_peak_max
        && request.audio_rms <= t.bg_rms_max
        && request.peak_to_rms_ratio <= t.bg_pr_max
        && request.no_speech_probability >= t.bg_nsp_min
        && request.frame_energy_concentration <= t.bg_energy_max
        && request.frame_active_ratio >= t.bg_active_min
    {
        return assessment(true, "background_media", "Background");
    }
    if request.audio_duration_ms >= t.mix_dur_min_ms
        && request.voiced_frame_ratio <= t.mix_voiced_max
        && request.speech_to_noise_gap <= t.mix_gap_max
        && request.peak_to_rms_ratio >= t.mix_pr_min
        && request.frame_active_ratio <= t.mix_active_max
        && (request.impulse_edge_ratio >= t.mix_edge_min
            || request.frame_energy_concentration >= t.mix_energy_min
            || request.zero_crossing_rate <= t.mix_zcr_max)
    {
        return assessment(true, "mixed", "Mixed");
    }
    assessment(false, "", "")
}

fn safe_metric(value: f32) -> f32 {
    if value.is_finite() {
        value
    } else {
        0.0
    }
}

fn safe_ratio(value: f32) -> f32 {
    safe_metric(value).clamp(0.0, 1.0)
}

fn sanitize_request(mut request: NoiseAssessmentRequest) -> NoiseAssessmentRequest {
    request.voiced_frame_ratio = safe_ratio(request.voiced_frame_ratio);
    request.speech_to_noise_gap = safe_metric(request.speech_to_noise_gap);
    request.audio_peak = safe_ratio(request.audio_peak);
    request.audio_rms = safe_ratio(request.audio_rms);
    request.peak_to_rms_ratio = safe_metric(request.peak_to_rms_ratio).max(0.0);
    request.frame_energy_concentration = safe_ratio(request.frame_energy_concentration);
    request.frame_active_ratio = safe_ratio(request.frame_active_ratio);
    request.impulse_edge_ratio = safe_ratio(request.impulse_edge_ratio);
    request.zero_crossing_rate = safe_ratio(request.zero_crossing_rate);
    request.no_speech_probability = safe_ratio(request.no_speech_probability);
    request
}

fn assessment(matched: bool, category: &str, reason: &str) -> AudioNoiseAssessment {
    AudioNoiseAssessment {
        matched,
        category: category.to_string(),
        label: label_for(category),
        reason: reason.to_string(),
    }
}

fn label_for(category: &str) -> String {
    match category {
        "impulse" => "Impulse".to_string(),
        "stationary" => "Stationary".to_string(),
        "breath_handling" => "Breath".to_string(),
        "background_media" => "Background".to_string(),
        "mixed" => "Mixed".to_string(),
        _ => category.replace('_', " "),
    }
}
