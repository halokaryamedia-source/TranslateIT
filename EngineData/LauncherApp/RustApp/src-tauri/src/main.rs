mod engine;

use engine::state::{CommandResult, EngineStatus};

#[tauri::command]
fn get_engine_status() -> EngineStatus {
    engine::current_status()
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
        start_capture,
        stop_capture,
        translate_text,
    ]);

    app.run(tauri::generate_context!())
        .expect("TranslateIT RustApp failed to run");
}
