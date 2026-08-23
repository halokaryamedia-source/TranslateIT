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

pub fn runtime_vad_profile() -> RuntimeVadProfile {
    RuntimeVadProfile {
        name: "Meeting".to_string(),
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VadGateResult {
    pub accepted: bool,
    pub reason: String,
    pub evidence: AudioEvidenceReport,
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

fn reject(reason: &str, evidence: AudioEvidenceReport) -> VadGateResult {
    VadGateResult {
        accepted: false,
        reason: reason.to_string(),
        evidence,
    }
}
