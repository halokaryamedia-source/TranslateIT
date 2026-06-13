use serde::{Deserialize, Serialize};

use crate::engine::inference::backend::NativeInferenceBackendSelection;
use crate::engine::inference::cuda_probe::CudaProbeReport;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AsrAdapterContract {
    pub adapter_id: &'static str,
    pub reference_model: &'static str,
    pub backup_model: &'static str,
    pub cuda_required: bool,
    pub final_runtime_allows_python: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AsrAdapterPlan {
    pub adapter_id: String,
    pub selected_backend: NativeInferenceBackendSelection,
    pub cuda_probe: CudaProbeReport,
    pub ready: bool,
    pub blocker: String,
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

    pub fn plan_with_backend(
        &self,
        selected_backend: NativeInferenceBackendSelection,
        cuda_probe: CudaProbeReport,
    ) -> AsrAdapterPlan {
        AsrAdapterPlan {
            adapter_id: self.adapter_id.to_string(),
            selected_backend,
            cuda_probe,
            ready: false,
            blocker: self.blocker_note().to_string(),
        }
    }
}
