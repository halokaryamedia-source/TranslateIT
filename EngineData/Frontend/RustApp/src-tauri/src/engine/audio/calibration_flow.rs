use serde::Serialize;
use std::path::PathBuf;

use crate::engine::audio::calibration::CalibrationProfile;
use crate::engine::audio::evidence::AudioEvidenceReport;
use crate::engine::paths::ProjectPaths;

const CALIBRATION_PROFILE_LABEL: &str = "UserData/CacheData/rust_calibration_profile.json";

#[derive(Debug, Clone, Serialize)]
pub struct CalibrationFlowStatus {
    pub output_path: String,
    pub requires_quiet_sample: bool,
    pub requires_speech_sample: bool,
    pub ready_to_save_profile: bool,
    pub note: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct CalibrationSaveResult {
    pub ok: bool,
    pub output_path: String,
    pub profile: CalibrationProfile,
    pub message: String,
}

impl CalibrationFlowStatus {
    pub fn current() -> Self {
        Self {
            output_path: CALIBRATION_PROFILE_LABEL.to_string(),
            requires_quiet_sample: true,
            requires_speech_sample: true,
            ready_to_save_profile: false,
            note: "Calibration flow is defined. Saving a real profile requires quiet and speech evidence from the Rust audio buffer.".to_string(),
        }
    }
}

pub fn save_calibration_from_evidence(
    input_device_id: Option<String>,
    quiet: AudioEvidenceReport,
    speech: AudioEvidenceReport,
) -> CalibrationSaveResult {
    let output_path = calibration_profile_path();
    let profile = CalibrationProfile::from_quiet_and_speech(input_device_id, &quiet, &speech);
    let output_label = CALIBRATION_PROFILE_LABEL.to_string();

    match profile.save_pretty(&output_path) {
        Ok(()) => CalibrationSaveResult {
            ok: profile.usable,
            output_path: output_label,
            profile,
            message: "Rust calibration profile saved.".to_string(),
        },
        Err(_error) => CalibrationSaveResult {
            ok: false,
            output_path: output_label,
            profile,
            message:
                "Failed to save Rust calibration profile. Open Developer diagnostics for details."
                    .to_string(),
        },
    }
}

fn calibration_profile_path() -> PathBuf {
    let project_paths = ProjectPaths::discover();
    PathBuf::from(project_paths.user_cache_dir).join("rust_calibration_profile.json")
}
