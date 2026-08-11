use crate::engine::paths::{initialize_tauri_path_context, ProjectPaths};
use tauri::{LogicalSize, Manager, Runtime};

#[cfg(target_os = "windows")]
mod windows_power_lifecycle {
    use std::ffi::c_void;

    use tauri::{Runtime, WebviewWindow};

    const APPLICATION_MEETING_OWNER_ID: &str = "translateit_application_meeting";
    const WM_POWERBROADCAST: u32 = 0x0218;
    const PBT_APMSUSPEND: usize = 0x0004;
    const PBT_APMRESUMECRITICAL: usize = 0x0006;
    const PBT_APMRESUMEAUTOMATIC: usize = 0x0012;
    const TRANSLATEIT_POWER_SUBCLASS_ID: usize = 0x5452_5057;

    type Hwnd = *mut c_void;
    type Lparam = isize;
    type Lresult = isize;
    type Wparam = usize;
    type SubclassProc = Option<
        unsafe extern "system" fn(Hwnd, u32, Wparam, Lparam, usize, usize) -> Lresult,
    >;

    #[link(name = "Comctl32")]
    extern "system" {
        fn SetWindowSubclass(
            hwnd: Hwnd,
            subclass_proc: SubclassProc,
            subclass_id: usize,
            ref_data: usize,
        ) -> i32;
        fn DefSubclassProc(hwnd: Hwnd, message: u32, wparam: Wparam, lparam: Lparam) -> Lresult;
    }

    fn application_meeting_owned() -> bool {
        crate::engine::runtime_state::latest_runtime_session_state()
            .snapshot
            .as_ref()
            .map(|snapshot| snapshot.owner_id == APPLICATION_MEETING_OWNER_ID)
            .unwrap_or(false)
    }

    fn converge_application_meeting_to_stopped() {
        if application_meeting_owned() {
            // Canonical Meeting Stop revokes generation/output authority before it
            // cancels provider/helper/consumers and releases audio resources. Calling
            // the same path on resume is intentionally idempotent convergence in case
            // Windows suspended before cleanup could finish; it never starts/resumes a
            // Meeting.
            let _ = crate::commands::meeting_session::stop_meeting_translation();
        }
    }

    unsafe extern "system" fn translateit_power_window_proc(
        hwnd: Hwnd,
        message: u32,
        wparam: Wparam,
        lparam: Lparam,
        _subclass_id: usize,
        _ref_data: usize,
    ) -> Lresult {
        if message == WM_POWERBROADCAST
            && matches!(
                wparam,
                PBT_APMSUSPEND | PBT_APMRESUMECRITICAL | PBT_APMRESUMEAUTOMATIC
            )
        {
            converge_application_meeting_to_stopped();
        }

        unsafe { DefSubclassProc(hwnd, message, wparam, lparam) }
    }

    pub fn install<R: Runtime>(
        window: &WebviewWindow<R>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let hwnd = window.hwnd()?;
        let installed = unsafe {
            SetWindowSubclass(
                hwnd.0,
                Some(translateit_power_window_proc),
                TRANSLATEIT_POWER_SUBCLASS_ID,
                0,
            )
        };
        if installed == 0 {
            return Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                "TranslateIT could not install the Windows power lifecycle hook.",
            )
            .into());
        }
        Ok(())
    }
}

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

    // Child runtime processes consume these as transport values only. The values are
    // always overwritten from ProjectPaths so user environment state cannot become a
    // second installed-path authority.
    std::env::set_var("TRANSLATEIT_RUNTIME_ROOT", &paths.runtime_root);
    std::env::set_var("TRANSLATEIT_USER_DATA_ROOT", &paths.user_data_root);

    Ok(paths)
}

pub fn configure_main_window<R: Runtime>(
    app: &mut tauri::App<R>,
) -> Result<(), Box<dyn std::error::Error>> {
    let _paths = configure_runtime_paths(app)?;

    if let Some(window) = app.get_webview_window("main") {
        #[cfg(target_os = "windows")]
        windows_power_lifecycle::install(&window)?;

        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_size(LogicalSize::new(1600.0, 940.0));
        let _ = window.center();
        let _ = window.set_focus();
    }

    Ok(())
}
