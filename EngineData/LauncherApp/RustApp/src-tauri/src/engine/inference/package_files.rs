use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct PackageFileItem {
    pub file_name: String,
    pub required: bool,
    pub purpose: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct PackageFileList {
    pub backend_id: String,
    pub target_device: String,
    pub compute_type: String,
    pub final_runtime_allows_python: bool,
    pub items: Vec<PackageFileItem>,
    pub note: String,
}

impl PackageFileList {
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
            note: "Package file list only. Model validation is still required before Ready.".to_string(),
        }
    }
}

fn item(file_name: &str, required: bool, purpose: &str) -> PackageFileItem {
    PackageFileItem {
        file_name: file_name.to_string(),
        required,
        purpose: purpose.to_string(),
    }
}
