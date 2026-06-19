use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::Path;

const MAX_SETTING_TEXT_CHARS: usize = 160;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioSettings {
    pub input_device_id: Option<String>,
    pub output_device_id: Option<String>,
    pub sensitivity: f32,
    pub input_sensitivity: String,
    pub show_advanced_devices: bool,
    pub allow_low_but_usable_input: bool,
    pub allow_cpu_degraded_mode: bool,
    pub auto_play_translation_voice: bool,
    pub auto_play_out_voice: bool,
    pub use_custom_voice_actor: bool,
    pub voice_actor_profiles_root: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeSettings {
    pub schema_version: u32,
    pub language_focus_mode: String,
    pub runtime_profile: String,
    pub source_language: String,
    pub target_language: String,
    pub audio: AudioSettings,
    pub voice_actor_profile_id: String,
}

impl Default for RuntimeSettings {
    fn default() -> Self {
        Self {
            schema_version: 3,
            language_focus_mode: "id-en-focus".to_string(),
            runtime_profile: "Realtime".to_string(),
            source_language: "id".to_string(),
            target_language: "en".to_string(),
            audio: AudioSettings {
                input_device_id: None,
                output_device_id: None,
                sensitivity: 1.0,
                input_sensitivity: "Realtime".to_string(),
                show_advanced_devices: false,
                allow_low_but_usable_input: true,
                allow_cpu_degraded_mode: false,
                auto_play_translation_voice: true,
                auto_play_out_voice: true,
                use_custom_voice_actor: true,
                voice_actor_profiles_root: "EngineData/VoiceActorProfiles".to_string(),
            },
            voice_actor_profile_id: "marcel".to_string(),
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
        self.schema_version = self.schema_version.max(3);
        self.runtime_profile =
            sanitize_runtime_profile(&self.runtime_profile, &self.audio.input_sensitivity);
        self.source_language = sanitize_language(&self.source_language, "id");
        self.target_language = sanitize_language(&self.target_language, "en");
        self.audio.input_device_id =
            sanitize_optional_runtime_text(self.audio.input_device_id.take());
        self.audio.output_device_id =
            sanitize_optional_runtime_text(self.audio.output_device_id.take());
        self.audio.input_sensitivity = self.runtime_profile.clone();
        self.audio.sensitivity = self.audio.sensitivity.clamp(0.1, 3.0);
        self.audio.voice_actor_profiles_root =
            sanitize_voice_root(&self.audio.voice_actor_profiles_root);
        self.voice_actor_profile_id = sanitize_identifier(&self.voice_actor_profile_id);
        self.audio.use_custom_voice_actor = !self.voice_actor_profile_id.trim().is_empty();
        self.audio.auto_play_translation_voice = self.audio.auto_play_out_voice;
        self
    }
}

fn write_atomic(path: &Path, body: &str) -> io::Result<()> {
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

fn sanitize_runtime_profile(value: &str, previous_input_sensitivity: &str) -> String {
    let text = clean_setting_text(value).to_lowercase();
    let previous = clean_setting_text(previous_input_sensitivity).to_lowercase();
    if text.contains("quality") || previous.contains("quality") || previous.contains("noisy") {
        "Quality".to_string()
    } else {
        "Realtime".to_string()
    }
}

fn sanitize_language(value: &str, fallback: &str) -> String {
    let text = clean_setting_text(value).to_lowercase();
    if text.starts_with("ind") || text.starts_with("id") {
        return "id".to_string();
    }
    if text.starts_with("eng") || text.starts_with("en") {
        return "en".to_string();
    }
    if text.is_empty() {
        fallback.to_string()
    } else {
        text.chars().take(2).collect()
    }
}

fn sanitize_identifier(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
        .take(MAX_SETTING_TEXT_CHARS)
        .collect::<String>()
}

fn sanitize_optional_runtime_text(value: Option<String>) -> Option<String> {
    let text = clean_setting_text(&value?);
    if text.is_empty() {
        None
    } else {
        Some(text)
    }
}

fn sanitize_voice_root(value: &str) -> String {
    let text = clean_setting_text(value).replace(char::from(92), "/");
    if text.is_empty()
        || text.starts_with("<member ")
        || text.contains("AudioSettings' objects>")
        || text.contains("..")
        || text.starts_with('/')
        || text.contains(':')
        || text.chars().any(is_unsafe_setting_text_character)
        || text.chars().count() > MAX_SETTING_TEXT_CHARS
    {
        return "EngineData/VoiceActorProfiles".to_string();
    }
    let allowed = [
        "EngineData/VoiceActorProfiles",
        "UserData/SavedProject/VoiceActorProfiles",
    ];
    if allowed
        .iter()
        .any(|prefix| text == *prefix || text.starts_with(&format!("{prefix}/")))
    {
        text
    } else {
        "EngineData/VoiceActorProfiles".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::{sanitize_voice_root, RuntimeSettings};
    use std::fs;

    #[test]
    fn missing_settings_file_falls_back_to_defaults() {
        let path = std::env::temp_dir().join("translateit_missing_settings_test.json");
        let _ = fs::remove_file(&path);
        let settings = RuntimeSettings::load_or_default(&path);
        assert_eq!(settings.source_language, "id");
        assert_eq!(settings.target_language, "en");
        assert_eq!(settings.runtime_profile, "Realtime");
    }

    #[test]
    fn settings_roundtrip_preserves_safe_values() {
        let path = std::env::temp_dir().join("translateit_settings_roundtrip_test.json");
        let _ = fs::remove_file(&path);
        let settings = RuntimeSettings::default().sanitized();
        settings.save_pretty(&path).expect("settings should save");
        let loaded = RuntimeSettings::load_or_default(&path);
        let _ = fs::remove_file(&path);
        assert_eq!(loaded.source_language, "id");
        assert_eq!(loaded.target_language, "en");
        assert_eq!(loaded.runtime_profile, "Realtime");
        assert_eq!(
            loaded.audio.voice_actor_profiles_root,
            "EngineData/VoiceActorProfiles"
        );
    }

    #[test]
    fn unsafe_voice_root_falls_back_to_default_root() {
        assert_eq!(
            sanitize_voice_root("../../private"),
            "EngineData/VoiceActorProfiles"
        );
    }
}
