use super::runtime_inventory::{self, ModelInventoryReport};

#[tauri::command]
pub fn verify_models() -> ModelInventoryReport {
    runtime_inventory::verify_models()
}
