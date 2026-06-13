#[derive(Debug, Clone)]
pub struct TranslationAdapterContract {
    pub adapter_id: &'static str,
    pub reference_primary_model: &'static str,
    pub reference_fallback_model: &'static str,
    pub cuda_target: bool,
    pub final_runtime_allows_python: bool,
}

impl Default for TranslationAdapterContract {
    fn default() -> Self {
        Self {
            adapter_id: "translation-native-rust-cuda-adapter-pending",
            reference_primary_model: "nllb-200-distilled-600m",
            reference_fallback_model: "marianmt-id-en",
            cuda_target: true,
            final_runtime_allows_python: false,
        }
    }
}

impl TranslationAdapterContract {
    pub fn blocker_note(&self) -> &'static str {
        "Translation cannot report Ready until native Rust-owned tokenizer, model execution, CUDA provider, fallback visibility, and short-phrase parity are implemented."
    }
}
