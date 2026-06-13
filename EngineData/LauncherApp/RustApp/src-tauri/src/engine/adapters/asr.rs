#[derive(Debug, Clone)]
pub struct AsrAdapterContract {
    pub adapter_id: &'static str,
    pub reference_model: &'static str,
    pub backup_model: &'static str,
    pub cuda_required: bool,
    pub final_runtime_allows_python: bool,
}

impl Default for AsrAdapterContract {
    fn default() -> Self {
        Self {
            adapter_id: "asr-native-rust-cuda-adapter-pending",
            reference_model: "faster-whisper-large-v3-turbo",
            backup_model: "faster-whisper-medium",
            cuda_required: true,
            final_runtime_allows_python: false,
        }
    }
}

impl AsrAdapterContract {
    pub fn blocker_note(&self) -> &'static str {
        "ASR cannot report Ready until native Rust-owned model loading, CUDA validation, decode settings, and no-speech rejection parity are implemented."
    }
}
