use serde::Serialize;
use std::env;
use std::path::{Path, PathBuf};

use crate::engine::paths::ProjectPaths;

use super::cuda_probe::CudaProbeReport;

pub const CUDA_CORE_PASS: &str = "CUDA_CORE_PASS";
pub const CUDA_CORE_FAIL: &str = "CUDA_CORE_FAIL";
pub const CUDA_CORE_WARN: &str = "CUDA_CORE_WARN";
pub const CPU_DEGRADED_AVAILABLE: &str = "CPU_DEGRADED_AVAILABLE";

#[derive(Debug, Clone, Serialize)]
pub struct NativeBackendFileCheck {
    pub file_name: String,
    pub found: bool,
    pub found_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct NativeRuntimeFileRequirement {
    pub file_name: String,
    pub required: bool,
    pub purpose: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct NativeRuntimeFileRequirementList {
    pub backend_id: String,
    pub device: String,
    pub compute_type: String,
    pub final_runtime_allows_python: bool,
    pub files: Vec<NativeRuntimeFileRequirement>,
    pub note: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ModelDirectoryCheck {
    pub label: String,
    pub path: String,
    pub exists: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct NativeCudaBackendValidationReport {
    pub backend_id: String,
    pub core_status: String,
    pub device: String,
    pub compute_type: String,
    pub preferred_device: String,
    pub preferred_compute_type: String,
    pub cpu_degraded_available: bool,
    pub nvidia_smi_available: bool,
    pub dependency_checks: Vec<NativeBackendFileCheck>,
    pub file_requirements: NativeRuntimeFileRequirementList,
    pub model_directories: Vec<ModelDirectoryCheck>,
    pub notes: Vec<String>,
    pub ready: bool,
    pub blocker: String,
}

impl NativeRuntimeFileRequirementList {
    pub fn ctranslate2_cuda_candidate() -> Self {
        Self {
            backend_id: "native-ctranslate2-cuda-ffi".to_string(),
            device: "cuda".to_string(),
            compute_type: "float16".to_string(),
            final_runtime_allows_python: false,
            files: vec![
                runtime_file("ctranslate2.dll", true, "model runtime"),
                runtime_file("cudart64_12.dll", true, "cuda runtime"),
                runtime_file("cublas64_12.dll", true, "cuda math"),
                runtime_file("cublasLt64_12.dll", true, "cuda math lt"),
            ],
            note: "Requirement list only. Real model validation is still required before Ready."
                .to_string(),
        }
    }
}

impl NativeCudaBackendValidationReport {
    pub fn validate_ctranslate2_cuda_candidate() -> Self {
        let cuda_probe = CudaProbeReport::probe_host();
        let project_paths = ProjectPaths::discover();
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
        let model_directories = vec![
            model_dir("asr_model_dir", &project_paths.asr_model_dir),
            model_dir(
                "translation_model_dir",
                &project_paths.translation_model_dir,
            ),
        ];
        let model_dirs_ready = model_directories.iter().all(|check| check.exists);
        let cpu_degraded_available = deps_ready || model_dirs_ready;
        let ready = cuda_probe.nvidia_smi_available && deps_ready && model_dirs_ready;
        let core_status = if ready {
            CUDA_CORE_PASS
        } else if cpu_degraded_available {
            CUDA_CORE_WARN
        } else {
            CUDA_CORE_FAIL
        };
        let preferred_compute_type = if ready { "float16" } else { "int8" };
        let notes = build_notes(
            &cuda_probe,
            deps_ready,
            model_dirs_ready,
            cpu_degraded_available,
        );

        Self {
            backend_id: "native-ctranslate2-cuda-ffi".to_string(),
            core_status: core_status.to_string(),
            device: "cuda".to_string(),
            compute_type: "float16".to_string(),
            preferred_device: if ready { "cuda" } else { "cpu" }.to_string(),
            preferred_compute_type: preferred_compute_type.to_string(),
            cpu_degraded_available,
            nvidia_smi_available: cuda_probe.nvidia_smi_available,
            dependency_checks,
            file_requirements: NativeRuntimeFileRequirementList::ctranslate2_cuda_candidate(),
            model_directories,
            notes,
            ready,
            blocker: if ready {
                "Native dependency files and model directories are visible. Real model load validation is still required before reporting inference Ready.".to_string()
            } else if cpu_degraded_available {
                format!("{CPU_DEGRADED_AVAILABLE}: explicit degraded-mode approval is required before CPU fallback.")
            } else {
                "Native dependency or model directory visibility is incomplete. Do not report CUDA inference Ready.".to_string()
            },
        }
    }
}

fn build_notes(
    cuda_probe: &CudaProbeReport,
    deps_ready: bool,
    model_dirs_ready: bool,
    cpu_degraded_available: bool,
) -> Vec<String> {
    let mut notes = Vec::new();
    if !cuda_probe.nvidia_smi_available {
        notes.push("NVIDIA driver or nvidia-smi is not visible to the Rust runtime.".to_string());
    }
    if !deps_ready {
        notes.push("Native CUDA runtime dependency files are incomplete.".to_string());
    }
    if !model_dirs_ready {
        notes.push("ASR or translation model directories are incomplete.".to_string());
    }
    if cpu_degraded_available {
        notes.push(format!(
            "{CPU_DEGRADED_AVAILABLE}: real ASR can run only with explicit degraded-mode approval."
        ));
    }
    notes
}

fn runtime_file(file_name: &str, required: bool, purpose: &str) -> NativeRuntimeFileRequirement {
    NativeRuntimeFileRequirement {
        file_name: file_name.to_string(),
        required,
        purpose: purpose.to_string(),
    }
}

fn model_dir(label: &str, path: &str) -> ModelDirectoryCheck {
    ModelDirectoryCheck {
        label: label.to_string(),
        path: path.to_string(),
        exists: Path::new(path).is_dir(),
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
