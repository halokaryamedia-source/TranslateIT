use serde::Serialize;

use crate::engine::inference::backend::NativeInferenceBackendSelection;
use crate::engine::inference::cuda_probe::CudaProbeReport;

#[derive(Debug, Clone, Serialize)]
pub struct TranslationAdapterContract {
    pub adapter_id: &'static str,
    pub reference_primary_model: &'static str,
    pub reference_fallback_model: &'static str,
    pub cuda_target: bool,
    pub final_runtime_allows_python: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct TranslationAdapterPlan {
    pub adapter_id: String,
    pub selected_backend: NativeInferenceBackendSelection,
    pub cuda_probe: CudaProbeReport,
    pub ready: bool,
    pub blocker: String,
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

    pub fn plan_with_backend(
        &self,
        selected_backend: NativeInferenceBackendSelection,
        cuda_probe: CudaProbeReport,
    ) -> TranslationAdapterPlan {
        TranslationAdapterPlan {
            adapter_id: self.adapter_id.to_string(),
            selected_backend,
            cuda_probe,
            ready: false,
            blocker: self.blocker_note().to_string(),
        }
    }
}
