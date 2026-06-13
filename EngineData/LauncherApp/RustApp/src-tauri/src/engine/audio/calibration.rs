use serde::{Deserialize, Serialize};

use super::evidence::AudioEvidenceReport;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalibrationProfile {
    pub schema_version: u32,
    pub input_device_id: Option<String>,
    pub quiet_noise_floor_rms: f32,
    pub speech_reference_rms: f32,
    pub recommended_min_rms: f32,
    pub recommended_min_peak: f32,
    pub usable: bool,
    pub message: String,
}

impl CalibrationProfile {
    pub fn from_quiet_and_speech(
        input_device_id: Option<String>,
        quiet: &AudioEvidenceReport,
        speech: &AudioEvidenceReport,
    ) -> Self {
        let speech_gap = speech.rms - quiet.rms;
        let usable = speech.rms >= 0.008 && speech_gap >= 0.004 && speech.peak >= 0.03;
        let recommended_min_rms = (quiet.rms + 0.004).max(0.006).min(0.02);
        let recommended_min_peak = (quiet.peak + 0.02).max(0.025).min(0.08);

        Self {
            schema_version: 1,
            input_device_id,
            quiet_noise_floor_rms: quiet.rms,
            speech_reference_rms: speech.rms,
            recommended_min_rms,
            recommended_min_peak,
            usable,
            message: if usable {
                "Calibration usable for Rust VAD gate baseline.".to_string()
            } else {
                "Calibration is not usable yet. Speech evidence is too close to quiet noise floor or peak is too low.".to_string()
            },
        }
    }
}
