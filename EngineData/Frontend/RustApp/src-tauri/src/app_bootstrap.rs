use tauri::{LogicalSize, Manager, Runtime};

pub fn configure_main_window<R: Runtime>(
    app: &mut tauri::App<R>,
) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_size(LogicalSize::new(1600.0, 940.0));
        let _ = window.center();
        let _ = window.set_focus();
    }

    Ok(())
}
