use serde::{Deserialize, Serialize};
use std::process::Command;

const MAX_CUDA_PROBE_SUMMARY_CHARS: usize = 240;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CudaProbeReport {
    pub nvidia_smi_available: bool,
    pub gpu_summary: Option<String>,
    pub cuda_runtime_ready: bool,
    pub blocker: Option<String>,
}

impl CudaProbeReport {
    pub fn probe_host() -> Self {
        match Command::new("nvidia-smi")
            .args([
                "--query-gpu=name,driver_version,memory.total",
                "--format=csv,noheader",
            ])
            .output()
        {
            Ok(output) if output.status.success() => {
                let summary = compact_cuda_probe_text(&String::from_utf8_lossy(&output.stdout));
                Self {
                    nvidia_smi_available: true,
                    gpu_summary: if summary.is_empty() { None } else { Some(summary) },
                    cuda_runtime_ready: false,
                    blocker: Some("nvidia-smi is available, but native CUDA inference backend validation is not implemented yet.".to_string()),
                }
            }
            Ok(_output) => Self {
                nvidia_smi_available: false,
                gpu_summary: None,
                cuda_runtime_ready: false,
                blocker: Some("nvidia-smi returned a non-success status.".to_string()),
            },
            Err(_error) => Self {
                nvidia_smi_available: false,
                gpu_summary: None,
                cuda_runtime_ready: false,
                blocker: Some("nvidia-smi probe failed or is unavailable.".to_string()),
            },
        }
    }
}

fn compact_cuda_probe_text(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|character| !character.is_control())
        .take(MAX_CUDA_PROBE_SUMMARY_CHARS)
        .collect::<String>()
}
