mod app_bootstrap;
mod commands;
mod engine;

use tauri::Manager;

const APPLICATION_MEETING_OWNER_ID: &str = "translateit_application_meeting";

fn main() {
    let app = commands::registry::register(
        tauri::Builder::default().setup(|app| app_bootstrap::configure_main_window(app)),
    )
    .build(tauri::generate_context!())
    .expect("TranslateIT app failed to build");

    app.run(|app_handle, event| {
        if let tauri::RunEvent::ExitRequested { api, .. } = event {
            if engine::audio::guided_take::active_guided_take_line_id().is_some()
                || commands::voice_lab::current_voice_lab_build_snapshot().active
            {
                api.prevent_exit();
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.unminimize();
                    let _ = window.show();
                    let _ = window.set_focus();
                }
                return;
            }

            let runtime = engine::runtime_state::latest_runtime_session_state();
            let runtime_state_unavailable =
                runtime.has_active_session && runtime.snapshot.is_none();
            if runtime_state_unavailable {
                api.prevent_exit();
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.unminimize();
                    let _ = window.show();
                    let _ = window.set_focus();
                }
                return;
            }

            let application_meeting_active = runtime
                .snapshot
                .as_ref()
                .map(|snapshot| snapshot.owner_id == APPLICATION_MEETING_OWNER_ID)
                .unwrap_or(false);

            if !application_meeting_active {
                return;
            }

            let result = commands::meeting_session::stop_meeting_translation();
            let meeting_still_owned = result.status.has_session
                && result.status.owner_id.as_deref() == Some(APPLICATION_MEETING_OWNER_ID);

            if meeting_still_owned {
                if let Some(window) = app_handle.get_webview_window("main") {
                    api.prevent_exit();
                    let _ = window.unminimize();
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        }
    });
}
