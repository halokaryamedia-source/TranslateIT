#[derive(Debug, Clone)]
pub struct EngineConfig {
    pub app_version: &'static str,
    pub asr: AsrConfig,
    pub translation: TranslationConfig,
    pub tts: TtsConfig,
    pub paths: RuntimePaths,
}

#[derive(Debug, Clone)]
pub struct AsrConfig {
    pub primary_engine_id: &'static str,
    pub primary_model_id: &'static str,
    pub backup_model_id: &'static str,
    pub target_device: &'static str,
    pub compute_type: &'static str,
}

#[derive(Debug, Clone)]
pub struct TranslationConfig {
    pub primary_engine_id: &'static str,
    pub primary_model_id: &'static str,
    pub fallback_engine_id: &'static str,
    pub fallback_model_id: &'static str,
    pub target_device: &'static str,
}

#[derive(Debug, Clone)]
pub struct TtsConfig {
    pub primary_engine_id: &'static str,
    pub default_voice_profile_id: &'static str,
    pub fallback_policy: &'static str,
}

#[derive(Debug, Clone)]
pub struct RuntimePaths {
    pub user_cache_dir: &'static str,
    pub user_log_dir: &'static str,
    pub user_saved_dir: &'static str,
    pub asr_model_dir: &'static str,
    pub translation_model_dir: &'static str,
}

impl Default for EngineConfig {
    fn default() -> Self {
        Self {
            app_version: "0.6.0-rust-tauri-conversion",
            asr: AsrConfig {
                primary_engine_id: "native-rust-asr-adapter-pending",
                primary_model_id: "faster-whisper-large-v3-turbo-reference",
                backup_model_id: "faster-whisper-medium-reference",
                target_device: "cuda",
                compute_type: "float16",
            },
            translation: TranslationConfig {
                primary_engine_id: "native-rust-translation-adapter-pending",
                primary_model_id: "nllb-200-distilled-600m-reference",
                fallback_engine_id: "native-rust-translation-fallback-pending",
                fallback_model_id: "marianmt-id-en-reference",
                target_device: "cuda",
            },
            tts: TtsConfig {
                primary_engine_id: "native-rust-tts-adapter-pending",
                default_voice_profile_id: "marcel",
                fallback_policy: "visible-fallback-only",
            },
            paths: RuntimePaths {
                user_cache_dir: "UserData/CacheData",
                user_log_dir: "UserData/LogData",
                user_saved_dir: "UserData/SavedData",
                asr_model_dir: "EngineData/TranscriptEngine/ModelData",
                translation_model_dir: "EngineData/TranslateEngine/ModelData",
            },
        }
    }
}
