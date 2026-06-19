use crate::engine::hardware::{collect_hardware_usage, HardwareUsageReport};

#[tauri::command]
pub fn get_hardware_usage() -> HardwareUsageReport {
    collect_hardware_usage()
}
