use serde::Serialize;
use std::path::PathBuf;

use crate::engine::paths::ProjectPaths;

#[derive(Debug, Clone, Serialize)]
pub struct CalibrationFlowStatus {
    pub output_path: String,
    pub requires_quiet_sample: bool,
    pub requires_speech_sample: bool,
    pub ready_to_save_profile: bool,
    pub note: String,
}

impl CalibrationFlowStatus {
    pub fn current() -> Self {
        let project_paths = ProjectPaths::discover();
        let output_path = PathBuf::from(project_paths.user_cache_dir)
            .join("rust_calibration_profile.json")
            .to_string_lossy()
            .replace('\\', "/");

        Self {
            output_path,
            requires_quiet_sample: true,
            requires_speech_sample: true,
            ready_to_save_profile: false,
            note: "Calibration flow is defined. Saving a real profile requires quiet and speech evidence from the Rust audio buffer.".to_string(),
        }
    }
}
