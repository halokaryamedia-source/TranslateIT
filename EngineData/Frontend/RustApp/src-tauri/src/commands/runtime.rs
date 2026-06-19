use super::runtime_inventory::{self, GpuPolicyReport, ModelInventoryReport, ModelSetupReport};

#[tauri::command]
pub fn get_model_inventory() -> ModelInventoryReport {
    runtime_inventory::get_model_inventory()
}

#[tauri::command]
pub fn verify_models() -> ModelInventoryReport {
    runtime_inventory::verify_models()
}

#[tauri::command]
pub fn setup_models() -> ModelSetupReport {
    runtime_inventory::setup_models()
}

#[tauri::command]
pub fn get_gpu_policy() -> GpuPolicyReport {
    runtime_inventory::get_gpu_policy()
}
