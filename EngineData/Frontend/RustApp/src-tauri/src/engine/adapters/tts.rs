#[derive(Debug, Clone)]
pub struct TtsAdapterContract {
    pub adapter_id: &'static str,
    pub reference_voice_profile: &'static str,
    pub fallback_visible: bool,
    pub final_runtime_allows_python: bool,
}

impl Default for TtsAdapterContract {
    fn default() -> Self {
        Self {
            adapter_id: "tts-native-rust-output-adapter-pending",
            reference_voice_profile: "marcel",
            fallback_visible: true,
            final_runtime_allows_python: false,
        }
    }
}

impl TtsAdapterContract {
    pub fn blocker_note(&self) -> &'static str {
        "TTS cannot report Ready until native Rust-owned output playback, fallback visibility, cache reuse, and stop/cancel parity are implemented."
    }
}
