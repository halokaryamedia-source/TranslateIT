mod engine;

use engine::audio::input::InputPreparationStatus;
use engine::diagnostics::RuntimeDiagnostics;
use engine::settings::RuntimeSettings;
use engine::state::{CommandResult, EngineStatus};

#[tauri::command]
fn get_engine_status() -> EngineStatus {
    engine::current_status()
}

#[tauri::command]
fn get_runtime_diagnostics() -> RuntimeDiagnostics {
    engine::runtime_diagnostics()
}

#[tauri::command]
fn get_input_status() -> InputPreparationStatus {
    InputPreparationStatus::inspect_default_input()
}

#[tauri::command]
fn load_runtime_settings() -> RuntimeSettings {
    engine::load_settings()
}

#[tauri::command]
fn save_default_runtime_settings() -> CommandResult {
    engine::save_default_settings()
}

#[tauri::command]
fn start_capture() -> CommandResult {
    engine::start_capture()
}

#[tauri::command]
fn stop_capture() -> CommandResult {
    engine::stop_capture()
}

#[tauri::command]
fn translate_text(source: String) -> CommandResult {
    engine::translate_text(source)
}

fn main() {
    let app = tauri::Builder::default().invoke_handler(tauri::generate_handler![
        get_engine_status,
        get_runtime_diagnostics,
        get_input_status,
        load_runtime_settings,
        save_default_runtime_settings,
        start_capture,
        stop_capture,
        translate_text,
    ]);

    app.run(tauri::generate_context!())
        .expect("TranslateIT RustApp failed to run");
}
