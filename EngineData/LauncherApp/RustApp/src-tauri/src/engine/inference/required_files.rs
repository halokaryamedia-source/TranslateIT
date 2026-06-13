use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct RequiredFileItem {
    pub file_name: String,
    pub required: bool,
    pub purpose: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct RequiredFileList {
    pub backend_id: String,
    pub target_device: String,
    pub compute_type: String,
    pub final_runtime_allows_python: bool,
    pub items: Vec<RequiredFileItem>,
    pub note: String,
}

impl RequiredFileList {
    pub fn ctranslate2_cuda_candidate() -> Self {
        Self {
            backend_id: "native-ctranslate2-cuda-ffi".to_string(),
            target_device: "cuda".to_string(),
            compute_type: "float16".to_string(),
            final_runtime_allows_python: false,
            items: vec![
                item("ctranslate2.dll", true, "model runtime"),
                item("cudart64_12.dll", true, "cuda runtime"),
                item("cublas64_12.dll", true, "math runtime"),
                item("cublasLt64_12.dll", true, "math runtime lt"),
            ],
            note: "Required file list only. Model validation is still required before Ready.".to_string(),
        }
    }
}

fn item(file_name: &str, required: bool, purpose: &str) -> RequiredFileItem {
    RequiredFileItem {
        file_name: file_name.to_string(),
        required,
        purpose: purpose.to_string(),
    }
}
