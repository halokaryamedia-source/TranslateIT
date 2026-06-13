use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioSettings {
    pub input_device_id: Option<String>,
    pub output_device_id: Option<String>,
    pub sensitivity: f32,
    pub allow_cpu_degraded_mode: bool,
    pub auto_play_translation_voice: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeSettings {
    pub schema_version: u32,
    pub language_focus_mode: String,
    pub source_language: String,
    pub target_language: String,
    pub audio: AudioSettings,
    pub voice_actor_profile_id: String,
}

impl Default for RuntimeSettings {
    fn default() -> Self {
        Self {
            schema_version: 1,
            language_focus_mode: "id-en-focus".to_string(),
            source_language: "id".to_string(),
            target_language: "en".to_string(),
            audio: AudioSettings {
                input_device_id: None,
                output_device_id: None,
                sensitivity: 1.0,
                allow_cpu_degraded_mode: false,
                auto_play_translation_voice: false,
            },
            voice_actor_profile_id: "marcel".to_string(),
        }
    }
}

impl RuntimeSettings {
    pub fn load_or_default(path: &Path) -> Self {
        match fs::read_to_string(path) {
            Ok(raw) => serde_json::from_str::<Self>(&raw).unwrap_or_default(),
            Err(_) => Self::default(),
        }
    }

    pub fn save_pretty(&self, path: &Path) -> io::Result<()> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let body = serde_json::to_string_pretty(self)
            .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
        fs::write(path, body)
    }
}
