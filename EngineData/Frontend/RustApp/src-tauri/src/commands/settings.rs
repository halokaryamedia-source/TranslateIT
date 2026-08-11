use serde::Serialize;
use std::path::PathBuf;

use crate::commands::audio::{probe_input_device_candidate, probe_output_device_candidate};
use crate::commands::diagnostic_trace::{trace_command_end, trace_command_start};
use crate::engine;
use crate::engine::logging::{write_jsonl_event, RuntimeLogEvent};
use crate::engine::paths::ProjectPaths;
use crate::engine::settings::RuntimeSettings;
use crate::engine::state::{CommandResult, LifecycleState};

#[derive(Debug, Clone, Serialize)]
pub struct AudioDeviceSelectionResult {
    pub ok: bool,
    pub kind: String,
    pub device_id: Option<String>,
    pub device_name: String,
    pub message: String,
    pub settings: RuntimeSettings,
}

fn normalized_device_id(device_id: Option<String>) -> Option<String> {
    device_id
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn persist_runtime_settings(settings: RuntimeSettings) -> CommandResult {
    let project_paths = ProjectPaths::discover();
    let settings_path =
        PathBuf::from(&project_paths.user_cache_dir).join("rust_runtime_settings.json");
    let log_dir = PathBuf::from(project_paths.user_log_dir);
    let settings = settings.sanitized();

    match settings.save_pretty(&settings_path) {
        Ok(()) => {
            let _ = write_jsonl_event(
                &log_dir,
                "rust_runtime_latest.jsonl",
                &RuntimeLogEvent::info("settings", "Runtime settings saved."),
            );
            CommandResult::ok(LifecycleState::Idle, "Runtime settings saved.")
        }
        Err(_) => {
            let _ = write_jsonl_event(
                &log_dir,
                "rust_runtime_latest.jsonl",
                &RuntimeLogEvent::warning("settings", "Runtime settings save failed."),
            );
            CommandResult::blocked(
                LifecycleState::Error,
                "Failed to save runtime settings. Open Diagnostics for details.",
            )
        }
    }
}

#[tauri::command]
pub fn load_runtime_settings() -> RuntimeSettings {
    let started = trace_command_start(
        "load_runtime_settings",
        "loading runtime settings for launcher startup",
    );
    let settings = engine::load_settings();
    trace_command_end("load_runtime_settings", started, "ok");
    settings
}

#[tauri::command]
pub fn save_runtime_settings(settings: RuntimeSettings) -> CommandResult {
    let started = trace_command_start("save_runtime_settings", "saving runtime settings");
    let result = persist_runtime_settings(settings);
    trace_command_end(
        "save_runtime_settings",
        started,
        format!("state={}", result.state),
    );
    result
}

#[tauri::command]
pub fn select_audio_device(kind: String, device_id: Option<String>) -> AudioDeviceSelectionResult {
    let started = trace_command_start("select_audio_device", format!("kind={kind}"));
    let current = engine::load_settings();
    let requested = normalized_device_id(device_id);

    let (available, device_name, unavailable_message) = match kind.as_str() {
        "microphone" => {
            let probe = probe_input_device_candidate(requested.clone());
            (
                probe.prepared,
                probe
                    .input_device_name
                    .clone()
                    .or_else(|| requested.clone())
                    .unwrap_or_else(|| "Windows Default".to_string()),
                probe.note,
            )
        }
        "meeting-sound" => {
            let probe = probe_output_device_candidate(requested.clone());
            (
                probe.ok,
                probe
                    .resolved_device_name
                    .clone()
                    .or_else(|| requested.clone())
                    .unwrap_or_else(|| "Windows Default".to_string()),
                probe.note,
            )
        }
        _ => {
            trace_command_end("select_audio_device", started, "invalid_kind");
            return AudioDeviceSelectionResult {
                ok: false,
                kind,
                device_id: requested,
                device_name: "Unknown device".to_string(),
                message: "That audio device type is not supported.".to_string(),
                settings: current,
            };
        }
    };

    if !available {
        trace_command_end("select_audio_device", started, "candidate_unavailable");
        return AudioDeviceSelectionResult {
            ok: false,
            kind,
            device_id: requested,
            device_name,
            message: format!(
                "{} The previous device preference was kept.",
                unavailable_message.trim()
            ),
            settings: current,
        };
    }

    let mut candidate = current.clone();
    if kind == "microphone" {
        candidate.audio.input_device_id = requested.clone();
    } else {
        candidate.audio.output_device_id = requested.clone();
    }

    let save = persist_runtime_settings(candidate);
    if !save.ok {
        trace_command_end("select_audio_device", started, "save_failed");
        return AudioDeviceSelectionResult {
            ok: false,
            kind,
            device_id: requested,
            device_name,
            message: "The device is available, but the preference could not be saved. The previous device preference was kept."
                .to_string(),
            settings: current,
        };
    }

    let saved = engine::load_settings();
    let label = if kind == "microphone" {
        "Microphone"
    } else {
        "Meeting sound"
    };
    trace_command_end("select_audio_device", started, "ok");
    AudioDeviceSelectionResult {
        ok: true,
        kind,
        device_id: requested,
        device_name: device_name.clone(),
        message: format!("{label} set to {device_name}."),
        settings: saved,
    }
}
