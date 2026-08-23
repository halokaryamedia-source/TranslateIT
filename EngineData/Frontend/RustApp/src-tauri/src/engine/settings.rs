use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::Path;

const CURRENT_SCHEMA_VERSION: u32 = 6;
const MAX_SETTING_TEXT_CHARS: usize = 160;

fn default_source_language() -> String {
    "id".to_string()
}

fn default_target_language() -> String {
    "en".to_string()
}

fn default_meeting_setup_state() -> String {
    "new".to_string()
}

fn default_meeting_setup_checkpoint() -> u8 {
    1
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AudioSettings {
    pub input_device_id: Option<String>,
    pub output_device_id: Option<String>,
}

impl Default for AudioSettings {
    fn default() -> Self {
        Self {
            input_device_id: None,
            output_device_id: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct RuntimeSettings {
    pub schema_version: u32,
    pub source_language: String,
    pub target_language: String,
    pub meeting_setup_state: String,
    pub meeting_setup_checkpoint: u8,
    pub audio: AudioSettings,
}

impl Default for RuntimeSettings {
    fn default() -> Self {
        Self {
            schema_version: CURRENT_SCHEMA_VERSION,
            source_language: default_source_language(),
            target_language: default_target_language(),
            meeting_setup_state: default_meeting_setup_state(),
            meeting_setup_checkpoint: default_meeting_setup_checkpoint(),
            audio: AudioSettings::default(),
        }
    }
}

impl RuntimeSettings {
    pub fn load_or_default(path: &Path) -> Self {
        match fs::read_to_string(path) {
            Ok(raw) => serde_json::from_str::<Self>(&raw)
                .map(|settings| settings.sanitized())
                .unwrap_or_default(),
            Err(_) => Self::default(),
        }
    }

    pub fn save_pretty(&self, path: &Path) -> io::Result<()> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let body = serde_json::to_string_pretty(&self.clone().sanitized())
            .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
        write_atomic(path, &body)
    }

    pub fn sanitized(mut self) -> Self {
        self.schema_version = CURRENT_SCHEMA_VERSION;
        self.source_language = sanitize_language(&self.source_language, "id");
        self.target_language = sanitize_language(&self.target_language, "en");
        self.meeting_setup_state = sanitize_meeting_setup_state(&self.meeting_setup_state);
        self.meeting_setup_checkpoint = self.meeting_setup_checkpoint.clamp(1, 5);
        self.audio.input_device_id =
            sanitize_optional_runtime_text(self.audio.input_device_id.take());
        self.audio.output_device_id =
            sanitize_optional_runtime_text(self.audio.output_device_id.take());
        self
    }
}

fn write_atomic(path: &Path, body: &str) -> io::Result<()> {
    let temp_path = path.with_extension("json.tmp");
    fs::write(&temp_path, body)?;
    // Preserve the previous good file before any destructive step so a crash between
    // removing the destination and completing the retry rename cannot lose settings.
    let backup_path = path.with_extension("json.bak");
    if path.exists() {
        fs::copy(path, &backup_path)?;
    }
    match fs::rename(&temp_path, path) {
        Ok(()) => {
            let _ = fs::remove_file(&backup_path);
            Ok(())
        }
        Err(first_error) => {
            if !path.exists() {
                let _ = fs::remove_file(&temp_path);
                return Err(first_error);
            }
            fs::remove_file(path)?;
            if let Err(retry_error) = fs::rename(&temp_path, path) {
                let _ = fs::copy(&backup_path, path);
                let _ = fs::remove_file(&temp_path);
                return Err(retry_error);
            }
            let _ = fs::remove_file(&backup_path);
            Ok(())
        }
    }
}

fn is_unsafe_setting_text_character(character: char) -> bool {
    character.is_control()
        || ('\u{202a}'..='\u{202e}').contains(&character)
        || ('\u{2066}'..='\u{2069}').contains(&character)
}

fn clean_setting_text(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|character| !is_unsafe_setting_text_character(*character))
        .take(MAX_SETTING_TEXT_CHARS)
        .collect::<String>()
}

fn sanitize_language(value: &str, fallback: &str) -> String {
    let text = clean_setting_text(value).to_lowercase();
    if text.starts_with("ind") || text == "id" {
        "id".to_string()
    } else if text.starts_with("eng") || text == "en" {
        "en".to_string()
    } else {
        fallback.to_string()
    }
}

fn sanitize_meeting_setup_state(value: &str) -> String {
    match clean_setting_text(value).to_lowercase().as_str() {
        "deferred" => "deferred".to_string(),
        "completed" => "completed".to_string(),
        _ => "new".to_string(),
    }
}

fn sanitize_optional_runtime_text(value: Option<String>) -> Option<String> {
    let text = clean_setting_text(&value?);
    if text.is_empty() {
        None
    } else {
        Some(text)
    }
}

#[cfg(test)]
mod tests {
    use super::{RuntimeSettings, CURRENT_SCHEMA_VERSION};
    use std::fs;

    #[test]
    fn missing_settings_file_falls_back_to_current_defaults() {
        let path = std::env::temp_dir().join("translateit_missing_settings_test.json");
        let _ = fs::remove_file(&path);
        let settings = RuntimeSettings::load_or_default(&path);
        assert_eq!(settings.schema_version, CURRENT_SCHEMA_VERSION);
        assert_eq!(settings.source_language, "id");
        assert_eq!(settings.target_language, "en");
        assert_eq!(settings.meeting_setup_state, "new");
        assert_eq!(settings.meeting_setup_checkpoint, 1);
        assert!(settings.audio.input_device_id.is_none());
        assert!(settings.audio.output_device_id.is_none());
    }

    #[test]
    fn legacy_settings_shape_is_read_without_persisting_retired_fields() {
        let path = std::env::temp_dir().join(format!(
            "translateit_legacy_settings_{}.json",
            std::process::id()
        ));
        let _ = fs::remove_file(&path);
        let legacy = r#"{
  "schema_version": 5,
  "language_focus_mode": "id-en-focus",
  "runtime_profile": "retired-value",
  "source_language": "en",
  "target_language": "id",
  "history_enabled": true,
  "meeting_setup_state": "deferred",
  "meeting_setup_checkpoint": 3,
  "audio": {
    "input_device_id": "Legacy Microphone",
    "output_device_id": "Legacy Meeting Sound",
    "sensitivity": 1.8,
    "input_sensitivity": "retired-value",
    "show_advanced_devices": true,
    "allow_low_but_usable_input": true,
    "allow_cpu_degraded_mode": true,
    "auto_play_translation_voice": true,
    "auto_play_out_voice": true,
    "use_custom_voice_actor": true,
    "voice_actor_profiles_root": "EngineData/VoiceActorProfiles"
  },
  "voice_actor_profile_id": "marcel"
}"#;
        fs::write(&path, legacy).expect("legacy settings should be written");

        let settings = RuntimeSettings::load_or_default(&path);
        assert_eq!(settings.schema_version, CURRENT_SCHEMA_VERSION);
        assert_eq!(settings.source_language, "en");
        assert_eq!(settings.target_language, "id");
        assert_eq!(settings.meeting_setup_state, "deferred");
        assert_eq!(settings.meeting_setup_checkpoint, 3);
        assert_eq!(settings.audio.input_device_id.as_deref(), Some("Legacy Microphone"));
        assert_eq!(
            settings.audio.output_device_id.as_deref(),
            Some("Legacy Meeting Sound")
        );

        settings
            .save_pretty(&path)
            .expect("migrated settings should save in the current small shape");
        let saved = fs::read_to_string(&path).expect("saved settings should be readable");
        let _ = fs::remove_file(&path);

        for retired in [
            "language_focus_mode",
            "runtime_profile",
            "history_enabled",
            "sensitivity",
            "input_sensitivity",
            "show_advanced_devices",
            "allow_low_but_usable_input",
            "allow_cpu_degraded_mode",
            "auto_play_translation_voice",
            "auto_play_out_voice",
            "use_custom_voice_actor",
            "voice_actor_profiles_root",
            "voice_actor_profile_id",
        ] {
            assert!(!saved.contains(retired), "retired setting persisted: {retired}");
        }
    }
}
