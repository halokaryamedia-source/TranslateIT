use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct NativeBackendManifestItem {
    pub file_name: String,
    pub required: bool,
    pub purpose: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct NativeBackendManifest {
    pub backend_id: String,
    pub target_device: String,
    pub compute_type: String,
    pub final_runtime_allows_python: bool,
    pub items: Vec<NativeBackendManifestItem>,
    pub note: String,
}

impl NativeBackendManifest {
    pub fn ctranslate2_cuda_candidate() -> Self {
        Self {
            backend_id: "native-ctranslate2-cuda-ffi".to_string(),
            target_device: "cuda".to_string(),
            compute_type: "float16".to_string(),
            final_runtime_allows_python: false,
            items: vec![
                manifest_item("ctranslate2.dll", true, "Native inference runtime"),
                manifest_item("cudart64_12.dll", true, "CUDA runtime"),
                manifest_item("cublas64_12.dll", true, "CUDA BLAS runtime"),
                manifest_item("cublasLt64_12.dll", true, "CUDA BLAS Lt runtime"),
            ],
            note: "Packaging manifest candidate only. Real model-load validation is still required before Ready.".to_string(),
        }
    }
}

fn manifest_item(file_name: &str, required: bool, purpose: &str) -> NativeBackendManifestItem {
    NativeBackendManifestItem {
        file_name: file_name.to_string(),
        required,
        purpose: purpose.to_string(),
    }
}
