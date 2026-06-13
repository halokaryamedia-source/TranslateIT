use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NativeInferenceBackendKind {
    CTranslate2Ffi,
    OnnxRuntimeCuda,
    TensorRt,
    Pending,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeInferenceBackendSelection {
    pub backend: NativeInferenceBackendKind,
    pub device: String,
    pub compute_type: String,
    pub final_runtime_allows_python: bool,
    pub selected: bool,
    pub reason: String,
}

impl NativeInferenceBackendSelection {
    pub fn pending_cuda_selection(reason: impl Into<String>) -> Self {
        Self {
            backend: NativeInferenceBackendKind::Pending,
            device: "cuda".to_string(),
            compute_type: "float16".to_string(),
            final_runtime_allows_python: false,
            selected: false,
            reason: reason.into(),
        }
    }

    pub fn ctranslate2_candidate() -> Self {
        Self {
            backend: NativeInferenceBackendKind::CTranslate2Ffi,
            device: "cuda".to_string(),
            compute_type: "float16".to_string(),
            final_runtime_allows_python: false,
            selected: false,
            reason: "Candidate for preserving Faster-Whisper, NLLB, and Marian style behavior through a native CUDA-capable backend. Requires FFI and packaging validation.".to_string(),
        }
    }

    pub fn onnxruntime_candidate() -> Self {
        Self {
            backend: NativeInferenceBackendKind::OnnxRuntimeCuda,
            device: "cuda".to_string(),
            compute_type: "float16".to_string(),
            final_runtime_allows_python: false,
            selected: false,
            reason: "Candidate for exported ONNX models. Requires tokenizer/export parity and CUDA provider packaging validation.".to_string(),
        }
    }
}
