use serde::Serialize;
use std::env;
use std::path::{Path, PathBuf};

use super::cuda_probe::CudaProbeReport;

#[derive(Debug, Clone, Serialize)]
pub struct NativeBackendFileCheck {
    pub file_name: String,
    pub found: bool,
    pub found_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct NativeCudaBackendValidationReport {
    pub backend_id: String,
    pub device: String,
    pub compute_type: String,
    pub nvidia_smi_available: bool,
    pub dependency_checks: Vec<NativeBackendFileCheck>,
    pub ready: bool,
    pub blocker: String,
}

impl NativeCudaBackendValidationReport {
    pub fn validate_ctranslate2_cuda_candidate() -> Self {
        let cuda_probe = CudaProbeReport::probe_host();
        let dependency_names = [
            "ctranslate2.dll",
            "cudart64_12.dll",
            "cublas64_12.dll",
            "cublasLt64_12.dll",
        ];
        let dependency_checks = dependency_names
            .iter()
            .map(|name| check_file_on_path(name))
            .collect::<Vec<_>>();
        let deps_ready = dependency_checks.iter().all(|check| check.found);
        let ready = cuda_probe.nvidia_smi_available && deps_ready;

        Self {
            backend_id: "native-ctranslate2-cuda-ffi".to_string(),
            device: "cuda".to_string(),
            compute_type: "float16".to_string(),
            nvidia_smi_available: cuda_probe.nvidia_smi_available,
            dependency_checks,
            ready,
            blocker: if ready {
                "Native dependency files are visible. Real model load validation is still required before reporting inference Ready.".to_string()
            } else {
                "Native CTranslate2 CUDA dependency visibility is incomplete. Do not report CUDA inference Ready.".to_string()
            },
        }
    }
}

fn check_file_on_path(file_name: &str) -> NativeBackendFileCheck {
    for directory in path_directories() {
        let candidate = directory.join(file_name);
        if candidate.is_file() {
            return NativeBackendFileCheck {
                file_name: file_name.to_string(),
                found: true,
                found_at: Some(normalize_path(&candidate)),
            };
        }
    }

    NativeBackendFileCheck {
        file_name: file_name.to_string(),
        found: false,
        found_at: None,
    }
}

fn path_directories() -> Vec<PathBuf> {
    env::var_os("PATH")
        .map(|value| env::split_paths(&value).collect::<Vec<_>>())
        .unwrap_or_default()
}

fn normalize_path(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}
