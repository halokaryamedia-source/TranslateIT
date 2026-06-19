#[derive(Debug, Clone)]
pub struct EngineConfig {
    pub app_version: &'static str,
    pub app_name: &'static str,
    pub language_focus_mode: &'static str,
    pub runtime_profile: &'static str,
    pub local_only_mode: bool,
    pub vad_preset: &'static str,
    pub temperature: i32,
    pub beam_size: i32,
    pub condition_on_previous_text: bool,
    pub vad_filter: bool,
    pub word_timestamps: bool,
    pub asr_initial_prompt: &'static str,
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
    pub source_language: &'static str,
    pub task: &'static str,
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
    pub enabled: bool,
    pub use_custom_voice_actor: bool,
    pub default_voice_profile_id: &'static str,
    pub fallback_policy: &'static str,
}

#[derive(Debug, Clone)]
pub struct RuntimePaths {
    pub user_cache_dir: &'static str,
    pub session_cache_dir: &'static str,
    pub audio_segments_dir: &'static str,
    pub user_log_dir: &'static str,
    pub user_saved_dir: &'static str,
    pub saved_transcript_dir: &'static str,
    pub voice_actor_profiles_root: &'static str,
    pub asr_model_dir: &'static str,
    pub translation_model_dir: &'static str,
}

pub const DEFAULT_ASR_INITIAL_PROMPT: &str = "Live bilingual speech in Indonesian and English. Indonesian is the primary spoken language. Transcribe exactly what was spoken, not a paraphrase or translation. Preserve short Indonesian phrases, filler words, names of people and places. Keep natural code-switching, numbers, and simple conversational words. For very short Indonesian utterances, preserve the exact Indonesian words and do not rewrite them in English. Common Indonesian phrases such as halo coba berbicara, coba bicara, lagi, terima kasih, and silakan should stay Indonesian when spoken in Indonesian. Do not invent random words, extra context, or an English rewrite of Indonesian speech.";

impl Default for EngineConfig {
    fn default() -> Self {
        Self {
            app_version: "0.8.2-realtime-profile-prep",
            app_name: "TranslateIT",
            language_focus_mode: "ID/EN Focus",
            runtime_profile: "Realtime",
            local_only_mode: true,
            vad_preset: "Realtime",
            temperature: 0,
            beam_size: 1,
            condition_on_previous_text: false,
            vad_filter: true,
            word_timestamps: false,
            asr_initial_prompt: DEFAULT_ASR_INITIAL_PROMPT,
            asr: AsrConfig {
                primary_engine_id: "faster-whisper-large-v3-turbo-ct2-local-worker-pending",
                primary_model_id: "faster-whisper-large-v3-turbo",
                backup_model_id: "faster-whisper-medium",
                target_device: "cuda",
                compute_type: "int8_float16",
                source_language: "id",
                task: "transcribe",
            },
            translation: TranslationConfig {
                primary_engine_id: "marianmt-id-en-realtime-local-worker-pending",
                primary_model_id: "marianmt-id-en",
                fallback_engine_id: "nllb-quality-local-worker-pending",
                fallback_model_id: "nllb-200-distilled-600M",
                target_device: "cuda",
            },
            tts: TtsConfig {
                primary_engine_id: "piper-local-tts-worker-pending",
                enabled: true,
                use_custom_voice_actor: false,
                default_voice_profile_id: "piper-en-fast",
                fallback_policy: "visible-fallback-only",
            },
            paths: RuntimePaths {
                user_cache_dir: "UserData/CacheData",
                session_cache_dir: "UserData/CacheData/session_cache",
                audio_segments_dir: "UserData/CacheData/audio_segments",
                user_log_dir: "UserData/LogData",
                user_saved_dir: "UserData/SavedProject",
                saved_transcript_dir: "UserData/SavedProject/Chat",
                voice_actor_profiles_root: "UserData/SavedProject/DataWork/VoiceProfiles",
                asr_model_dir: "EngineData/Backend/RuntimeAssets/ASR/ModelData",
                translation_model_dir: "EngineData/Backend/RuntimeAssets/Translation/ModelData",
            },
        }
    }
}
