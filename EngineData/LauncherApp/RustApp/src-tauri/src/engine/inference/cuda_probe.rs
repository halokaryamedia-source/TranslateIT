use serde::{Deserialize, Serialize};
use std::process::Command;

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
                let summary = String::from_utf8_lossy(&output.stdout).trim().to_string();
                Self {
                    nvidia_smi_available: true,
                    gpu_summary: if summary.is_empty() { None } else { Some(summary) },
                    cuda_runtime_ready: false,
                    blocker: Some("nvidia-smi is available, but native CUDA inference backend validation is not implemented yet.".to_string()),
                }
            }
            Ok(output) => Self {
                nvidia_smi_available: false,
                gpu_summary: None,
                cuda_runtime_ready: false,
                blocker: Some(format!(
                    "nvidia-smi returned non-success status: {}",
                    output.status
                )),
            },
            Err(error) => Self {
                nvidia_smi_available: false,
                gpu_summary: None,
                cuda_runtime_ready: false,
                blocker: Some(format!("nvidia-smi probe failed: {error}")),
            },
        }
    }
}
