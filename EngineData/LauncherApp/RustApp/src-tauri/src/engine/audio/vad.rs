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
            min_rms: 0.008,
            min_peak: 0.03,
            min_active_frame_ratio: 0.08,
            max_clipping_ratio: 0.02,
            min_speech_ms: 100,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VadGateResult {
    pub accepted: bool,
    pub reason: String,
    pub evidence: AudioEvidenceReport,
}

pub fn evaluate_vad_gate(evidence: AudioEvidenceReport, config: &VadGateConfig) -> VadGateResult {
    if evidence.clipping_ratio > config.max_clipping_ratio {
        return reject("rejected_clipping", evidence);
    }
    if evidence.rms < config.min_rms {
        return reject("rejected_low_energy", evidence);
    }
    if evidence.peak < config.min_peak {
        return reject("rejected_low_peak", evidence);
    }
    if evidence.active_frame_ratio < config.min_active_frame_ratio {
        return reject("rejected_unconfirmed_speech", evidence);
    }

    VadGateResult {
        accepted: true,
        reason: "accepted_audio_evidence".to_string(),
        evidence,
    }
}

fn reject(reason: &str, evidence: AudioEvidenceReport) -> VadGateResult {
    VadGateResult {
        accepted: false,
        reason: reason.to_string(),
        evidence,
    }
}
