use crate::engine::paths::{initialize_tauri_path_context, ProjectPaths};
use tauri::{LogicalSize, Manager, Runtime};

fn configure_runtime_paths<R: Runtime>(
    app: &tauri::App<R>,
) -> Result<ProjectPaths, Box<dyn std::error::Error>> {
    let current_paths = ProjectPaths::discover();
    let paths = if current_paths.is_repository_development() {
        // `tauri dev` and local repository execution keep the explicit repository
        // development layout. This fallback is intentionally distinct from installed
        // path proof.
        current_paths
    } else {
        let resource_dir = app.path().resource_dir()?;
        let app_local_data_dir = app.path().app_local_data_dir()?;
        initialize_tauri_path_context(resource_dir, app_local_data_dir)?
    };

    paths.ensure_user_data_dirs()?;
    Ok(paths)
}

pub fn configure_main_window<R: Runtime>(
    app: &mut tauri::App<R>,
) -> Result<(), Box<dyn std::error::Error>> {
    let _paths = configure_runtime_paths(app)?;

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_size(LogicalSize::new(1600.0, 940.0));
        let _ = window.center();
        let _ = window.set_focus();
    }

    Ok(())
}
