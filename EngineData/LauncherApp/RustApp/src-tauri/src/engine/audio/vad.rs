use serde::{Deserialize, Serialize};

use super::evidence::AudioEvidenceReport;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VadGateConfig {
    pub min_rms: f32,
    pub min_peak: f32,
    pub min_active_frame_ratio: f32,
    pub max_clipping_ratio: f32,
    pub min_speech_ms: u32,
}

impl Default for VadGateConfig {
    fn default() -> Self {
        Self {
            min_rms: 0.0065,
            min_peak: 0.024,
            min_active_frame_ratio: 0.055,
            max_clipping_ratio: 0.02,
            min_speech_ms: 100,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeVadProfile {
    pub name: String,
    pub pre_roll_audio_ms: u32,
    pub minimum_speech_duration_ms: u32,
    pub minimum_silence_duration_ms: u32,
    pub target_chunk_min_ms: u32,
    pub target_chunk_max_ms: u32,
    pub maximum_segment_duration_ms: u32,
    pub partial_asr_enabled: bool,
    pub gate: VadGateConfig,
}

pub fn resolve_runtime_vad_profile(name: &str) -> RuntimeVadProfile {
    let normalized = name.trim().to_lowercase();
    if normalized.contains("quality") {
        RuntimeVadProfile {
            name: "Quality".to_string(),
            pre_roll_audio_ms: 240,
            minimum_speech_duration_ms: 220,
            minimum_silence_duration_ms: 220,
            target_chunk_min_ms: 700,
            target_chunk_max_ms: 1_200,
            maximum_segment_duration_ms: 3_000,
            partial_asr_enabled: true,
            gate: VadGateConfig {
                min_rms: 0.0055,
                min_peak: 0.020,
                min_active_frame_ratio: 0.050,
                max_clipping_ratio: 0.02,
                min_speech_ms: 180,
            },
        }
    } else {
        RuntimeVadProfile {
            name: "Realtime".to_string(),
            pre_roll_audio_ms: 140,
            minimum_speech_duration_ms: 140,
            minimum_silence_duration_ms: 100,
            target_chunk_min_ms: 320,
            target_chunk_max_ms: 700,
            maximum_segment_duration_ms: 1_500,
            partial_asr_enabled: true,
            gate: VadGateConfig {
                min_rms: 0.006,
                min_peak: 0.021,
                min_active_frame_ratio: 0.050,
                max_clipping_ratio: 0.025,
                min_speech_ms: 120,
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VadPresetConfig {
    pub name: String,
    pub pre_roll_audio_ms: u32,
    pub minimum_speech_duration_ms: u32,
    pub minimum_silence_duration_ms: u32,
    pub maximum_segment_duration_s: u32,
    pub noise_gate: String,
    pub post_asr_rejection: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VadSegmentDecisionRequest {
    pub preset_name: Option<String>,
    pub duration_ms: u32,
    pub silence_ms: u32,
    pub speech_duration_ms: Option<u32>,
    pub speech_confirmed: bool,
    pub rms: Option<f32>,
    pub peak: Option<f32>,
    pub noise_floor_rms: f32,
    pub clipping_risk: f32,
    pub noise_risk: f32,
    pub speech_to_noise_gap: f32,
    pub voiced_frame_ratio: f32,
    pub zero_crossing_rate: f32,
    pub peak_to_rms_ratio: f32,
    pub frame_energy_concentration: f32,
    pub frame_active_ratio: f32,
    pub impulse_edge_ratio: f32,
    pub echo_match: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VadGateResult {
    pub accepted: bool,
    pub reason: String,
    pub evidence: AudioEvidenceReport,
}

#[derive(Debug, Clone, Serialize)]
pub struct VadDecisionReport {
    pub accepted: bool,
    pub reason: String,
    pub preset: String,
    pub should_hide: bool,
    pub speech_focus_score: f32,
}

pub fn evaluate_vad_gate(evidence: AudioEvidenceReport, config: &VadGateConfig) -> VadGateResult {
    if safe_ratio(evidence.clipping_ratio) > safe_ratio(config.max_clipping_ratio) {
        return reject("rejected_clipping", evidence);
    }
    if safe_ratio(evidence.rms) < safe_ratio(config.min_rms) {
        return reject("rejected_low_energy", evidence);
    }
    if safe_ratio(evidence.peak) < safe_ratio(config.min_peak) {
        return reject("rejected_low_peak", evidence);
    }
    if safe_ratio(evidence.active_frame_ratio) < safe_ratio(config.min_active_frame_ratio) {
        return reject("rejected_unconfirmed_speech", evidence);
    }

    VadGateResult {
        accepted: true,
        reason: "accepted_audio_evidence".to_string(),
        evidence,
    }
}

pub fn evaluate_segment_decision(request: VadSegmentDecisionRequest) -> VadDecisionReport {
    let request = sanitize_decision_request(request);
    let preset = resolve_preset(request.preset_name.as_deref());
    if request.echo_match {
        return decision(false, "Echo match detected", &preset.name, true, 0.0);
    }
    if !request.speech_confirmed {
        return decision(false, "VAD did not confirm speech", &preset.name, true, 0.0);
    }
    let rms = request.rms.unwrap_or(0.0);
    let peak = request.peak.unwrap_or(0.0);
    let focus_score = speech_focus_score(
        request.speech_to_noise_gap,
        request.voiced_frame_ratio,
        rms,
        peak,
        request.noise_floor_rms,
    );
    let strong_voiced_speech = preset.name == "Headset"
        && request.speech_duration_ms.unwrap_or(0) >= 200
        && request.voiced_frame_ratio >= 0.16
        && request.speech_to_noise_gap >= -0.0003;
    if rms <= 0.0025_f32.max(request.noise_floor_rms * 1.08) && !strong_voiced_speech {
        return decision(false, "Below calibrated energy threshold", &preset.name, true, focus_score);
    }
    if request.clipping_risk >= 0.8 {
        return decision(false, "Severe clipping", &preset.name, true, focus_score);
    }
    if request.noise_risk >= 0.8 {
        return decision(false, "Dominant stationary noise", &preset.name, true, focus_score);
    }
    if strong_voiced_speech {
        return final_duration_checks(&request, &preset, focus_score);
    }
    if matches!(preset.name.as_str(), "Headset" | "Normal Room" | "Noisy Room")
        && request.duration_ms >= 220
        && (request.speech_to_noise_gap > 0.0 || request.voiced_frame_ratio > 0.0)
    {
        let legacy_noise_like_segment = request.duration_ms >= 180
            && request.voiced_frame_ratio <= 0.045
            && request.speech_to_noise_gap <= 0.0030_f32.max(request.noise_floor_rms * 0.24)
            && (request.peak_to_rms_ratio >= 8.0
                || request.frame_energy_concentration >= 0.75
                || request.frame_active_ratio <= 0.18
                || request.impulse_edge_ratio >= 0.08
                || (request.peak_to_rms_ratio >= 6.2 && request.frame_active_ratio <= 0.22 && request.zero_crossing_rate <= 0.20)
                || (request.peak_to_rms_ratio >= 6.8 && request.zero_crossing_rate <= 0.24 && request.frame_active_ratio <= 0.28));
        if legacy_noise_like_segment {
            return decision(false, "Noise-like segment", &preset.name, true, focus_score);
        }
        let extended_low_focus = request.duration_ms >= 700
            && focus_score <= 0.48
            && request.speech_to_noise_gap <= 0.0008_f32.max(request.noise_floor_rms * 0.15)
            && request.voiced_frame_ratio <= 0.018
            && peak <= 0.011_f32.max(request.noise_floor_rms * 2.0);
        if focus_score <= 0.42 || extended_low_focus {
            return decision(false, "Low speech focus", &preset.name, true, focus_score);
        }
    }
    final_duration_checks(&request, &preset, focus_score)
}

fn final_duration_checks(request: &VadSegmentDecisionRequest, preset: &VadPresetConfig, focus_score: f32) -> VadDecisionReport {
    let effective_speech_ms = request.speech_duration_ms.unwrap_or(request.duration_ms);
    if effective_speech_ms < preset.minimum_speech_duration_ms {
        return decision(false, "Segment too short", &preset.name, true, focus_score);
    }
    if request.silence_ms < preset.minimum_silence_duration_ms {
        return decision(false, "Insufficient end silence", &preset.name, true, focus_score);
    }
    if request.duration_ms > preset.maximum_segment_duration_s * 1000 {
        return decision(false, "Segment too long", &preset.name, true, focus_score);
    }
    decision(true, "Accepted", &preset.name, false, focus_score)
}

fn speech_focus_score(gap: f32, voiced_ratio: f32, rms: f32, peak: f32, noise_floor: f32) -> f32 {
    let gap = safe_metric(gap);
    let voiced_ratio = safe_ratio(voiced_ratio);
    let rms = safe_ratio(rms);
    let peak = safe_ratio(peak);
    let noise_floor = safe_ratio(noise_floor);
    if gap <= 0.0 && voiced_ratio <= 0.0 {
        return 0.0;
    }
    let gap_score = ((gap - 0.0_f32.max(noise_floor * 0.10)) / 0.0015_f32.max(noise_floor * 0.35)).clamp(0.0, 1.0);
    let voiced_score = (voiced_ratio / 0.06).clamp(0.0, 1.0);
    let energy_score = ((rms - noise_floor) / 0.0014_f32.max(noise_floor * 0.28)).clamp(0.0, 1.0);
    let peak_score = ((peak - 0.004_f32.max(noise_floor * 1.05)) / 0.010_f32.max(noise_floor * 1.9)).clamp(0.0, 1.0);
    round3((gap_score * 0.35) + (voiced_score * 0.30) + (energy_score * 0.20) + (peak_score * 0.15))
}

fn resolve_preset(name: Option<&str>) -> VadPresetConfig {
    match name.unwrap_or("Headset") {
        "Noisy Room" => VadPresetConfig { name: "Noisy Room".to_string(), pre_roll_audio_ms: 300, minimum_speech_duration_ms: 180, minimum_silence_duration_ms: 240, maximum_segment_duration_s: 8, noise_gate: "adaptive strong".to_string(), post_asr_rejection: true },
        "Push to Talk" => VadPresetConfig { name: "Push to Talk".to_string(), pre_roll_audio_ms: 120, minimum_speech_duration_ms: 200, minimum_silence_duration_ms: 200, maximum_segment_duration_s: 8, noise_gate: "manual trigger".to_string(), post_asr_rejection: true },
        _ => VadPresetConfig { name: "Headset".to_string(), pre_roll_audio_ms: 180, minimum_speech_duration_ms: 100, minimum_silence_duration_ms: 80, maximum_segment_duration_s: 8, noise_gate: "adaptive light".to_string(), post_asr_rejection: true },
    }
}

fn safe_metric(value: f32) -> f32 {
    if value.is_finite() { value } else { 0.0 }
}

fn safe_ratio(value: f32) -> f32 {
    safe_metric(value).clamp(0.0, 1.0)
}

fn sanitize_optional_ratio(value: Option<f32>) -> Option<f32> {
    value.map(safe_ratio)
}

fn sanitize_decision_request(mut request: VadSegmentDecisionRequest) -> VadSegmentDecisionRequest {
    request.rms = sanitize_optional_ratio(request.rms);
    request.peak = sanitize_optional_ratio(request.peak);
    request.noise_floor_rms = safe_ratio(request.noise_floor_rms);
    request.clipping_risk = safe_ratio(request.clipping_risk);
    request.noise_risk = safe_ratio(request.noise_risk);
    request.speech_to_noise_gap = safe_metric(request.speech_to_noise_gap);
    request.voiced_frame_ratio = safe_ratio(request.voiced_frame_ratio);
    request.zero_crossing_rate = safe_ratio(request.zero_crossing_rate);
    request.peak_to_rms_ratio = safe_metric(request.peak_to_rms_ratio).max(0.0);
    request.frame_energy_concentration = safe_ratio(request.frame_energy_concentration);
    request.frame_active_ratio = safe_ratio(request.frame_active_ratio);
    request.impulse_edge_ratio = safe_ratio(request.impulse_edge_ratio);
    request
}

fn decision(accepted: bool, reason: &str, preset: &str, should_hide: bool, speech_focus_score: f32) -> VadDecisionReport {
    VadDecisionReport { accepted, reason: reason.to_string(), preset: preset.to_string(), should_hide, speech_focus_score: safe_ratio(speech_focus_score) }
}

fn reject(reason: &str, evidence: AudioEvidenceReport) -> VadGateResult {
    VadGateResult {
        accepted: false,
        reason: reason.to_string(),
        evidence,
    }
}

fn round3(value: f32) -> f32 {
    (safe_ratio(value) * 1000.0).round() / 1000.0
}
