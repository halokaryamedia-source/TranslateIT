use serde::Serialize;
use sysinfo::System;

#[derive(Debug, Clone, Serialize)]
pub struct HardwareMetric {
    pub label: String,
    pub percent: Option<f32>,
    pub status: String,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct HardwareUsageReport {
    pub cpu: HardwareMetric,
    pub ram: HardwareMetric,
    pub gpu: HardwareMetric,
    pub note: String,
}

fn metric(label: &str, percent: Option<f32>, status: &str, detail: &str) -> HardwareMetric {
    HardwareMetric {
        label: label.to_string(),
        percent: percent.map(|value| value.clamp(0.0, 100.0)),
        status: status.to_string(),
        detail: detail.to_string(),
    }
}

pub fn collect_hardware_usage() -> HardwareUsageReport {
    let mut system = System::new_all();
    system.refresh_all();
    let total_memory = system.total_memory();
    let ram_percent = if total_memory > 0 {
        Some((system.used_memory() as f32 / total_memory as f32) * 100.0)
    } else {
        None
    };

    HardwareUsageReport {
        cpu: metric("CPU", Some(system.global_cpu_info().cpu_usage()), "Connected", "Native sysinfo CPU sampler."),
        ram: metric("RAM", ram_percent, "Connected", "Native sysinfo RAM sampler."),
        gpu: metric("GPU", None, "Unavailable", "GPU usage percent is not guessed. CUDA/GPU readiness remains available in runtime diagnostics."),
        note: "CPU and RAM are sampled natively. GPU percent requires a dedicated native GPU sampler and is intentionally not faked.".to_string(),
    }
}
