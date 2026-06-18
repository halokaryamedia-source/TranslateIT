use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::Path;

use super::evidence::AudioEvidenceReport;

const MAX_CALIBRATION_PROFILE_BYTES: u64 = 100_000;
const MAX_CALIBRATION_DEVICE_ID_CHARS: usize = 160;

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

#[derive(Debug, Clone, Serialize)]
pub struct CalibrationProfileStatus {
    pub path: String,
    pub present: bool,
    pub profile: Option<CalibrationProfile>,
    pub note: String,
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
            input_device_id: sanitize_optional_device_id(input_device_id),
            quiet_noise_floor_rms: safe_metric(quiet.rms),
            speech_reference_rms: safe_metric(speech.rms),
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

    pub fn load(path: &Path) -> Option<Self> {
        let metadata = fs::metadata(path).ok()?;
        if metadata.len() > MAX_CALIBRATION_PROFILE_BYTES {
            return None;
        }
        let raw = fs::read_to_string(path).ok()?;
        serde_json::from_str::<Self>(&raw)
            .ok()
            .map(|profile| profile.sanitized())
    }

    pub fn save_pretty(&self, path: &Path) -> io::Result<()> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let body = serde_json::to_string_pretty(&self.clone().sanitized())
            .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
        let temp_path = path.with_extension("json.tmp");
        fs::write(&temp_path, body)?;
        match fs::rename(&temp_path, path) {
            Ok(()) => Ok(()),
            Err(error) => {
                if path.exists() {
                    fs::remove_file(path)?;
                    fs::rename(&temp_path, path)
                } else {
                    let _ = fs::remove_file(&temp_path);
                    Err(error)
                }
            }
        }
    }

    fn sanitized(mut self) -> Self {
        self.schema_version = self.schema_version.max(1);
        self.input_device_id = sanitize_optional_device_id(self.input_device_id.take());
        self.quiet_noise_floor_rms = safe_metric(self.quiet_noise_floor_rms);
        self.speech_reference_rms = safe_metric(self.speech_reference_rms);
        self.recommended_min_rms = safe_metric(self.recommended_min_rms).clamp(0.0, 1.0);
        self.recommended_min_peak = safe_metric(self.recommended_min_peak).clamp(0.0, 1.0);
        self
    }
}

impl CalibrationProfileStatus {
    pub fn from_path(path: &Path) -> Self {
        let profile = CalibrationProfile::load(path);
        let present = profile.is_some();
        Self {
            path: "UserData/CacheData/rust_calibration_profile.json".to_string(),
            present,
            profile,
            note: if present {
                "Rust calibration profile was found.".to_string()
            } else {
                "Rust calibration profile is not available yet. Real calibration must create this file later.".to_string()
            },
        }
    }
}

fn is_unsafe_calibration_text_character(character: char) -> bool {
    character == '\0'
        || ('\u{0001}'..='\u{0008}').contains(&character)
        || ('\u{000b}'..='\u{001f}').contains(&character)
        || character == '\u{007f}'
        || ('\u{202a}'..='\u{202e}').contains(&character)
        || ('\u{2066}'..='\u{2069}').contains(&character)
}

fn sanitize_optional_device_id(value: Option<String>) -> Option<String> {
    let clean = value?
        .trim()
        .chars()
        .filter(|character| !is_unsafe_calibration_text_character(*character))
        .take(MAX_CALIBRATION_DEVICE_ID_CHARS)
        .collect::<String>()
        .trim()
        .to_string();
    if clean.is_empty() {
        None
    } else {
        Some(clean)
    }
}

fn safe_metric(value: f32) -> f32 {
    if value.is_finite() {
        value.max(0.0)
    } else {
        0.0
    }
}
