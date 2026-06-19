mod app_bootstrap;
mod commands;
mod engine;

fn main() {
    let app = commands::registry::register(
        tauri::Builder::default().setup(|app| app_bootstrap::configure_main_window(app)),
    );

    app.run(tauri::generate_context!())
        .expect("TranslateIT app failed to start");
}
