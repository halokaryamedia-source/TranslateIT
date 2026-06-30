use serde::Serialize;
use serde_json::json;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use crate::engine::paths::ProjectPaths;

use super::helper_bridge_runtime::unix_ms;
use super::virtual_mic_route::get_virtual_mic_route_selection;

#[derive(Debug, Clone, Serialize)]
pub struct VirtualAudioRouteRuntimeStatus {
    pub ok: bool,
    pub state: String,
    pub route_runtime_ready: bool,
    pub route_execution_attempted: bool,
    pub route_execution_enabled: bool,
    pub source_audio_path: Option<String>,
    pub source_audio_ready: bool,
    pub selected_output_device: Option<String>,
    pub selected_input_device: Option<String>,
    pub route_ready: bool,
    pub blocker: String,
    pub next_action: String,
    pub route_runtime_contract_json: String,
    pub evidence_path: Option<String>,
    pub provider_script_path: Option<String>,
    pub provider_payload_path: Option<String>,
    pub provider_exit_code: Option<i32>,
    pub provider_response_json: String,
    pub runtime_claim: String,
    pub updated_unix_ms: u128,
}

fn normalized_path_label(path: &Path) -> String {
    path.to_string_lossy().replace(char::from(92), "/")
}

fn project_paths() -> ProjectPaths {
    ProjectPaths::discover()
}

fn evidence_path() -> PathBuf {
    let project_paths = project_paths();
    PathBuf::from(project_paths.user_log_dir)
        .join("RustAppValidation")
        .join("latest_virtual_audio_route_runtime_handoff.json")
}

fn provider_payload_path() -> PathBuf {
    let project_paths = project_paths();
    PathBuf::from(project_paths.user_cache_dir)
        .join("runtime_handoff")
        .join("latest_virtual_audio_route_provider_payload.json")
}

fn provider_script_path() -> PathBuf {
    let project_paths = project_paths();
    PathBuf::from(project_paths.project_root)
        .join("EngineData")
        .join("Backend")
        .join("LocalWorker")
        .join("WorkerRuntime")
        .join("virtual_audio_route_provider.py")
}

fn clean_audio_path(value: Option<String>) -> Option<String> {
    value
        .map(|text| text.trim().chars().take(520).collect::<String>())
        .filter(|text| !text.is_empty())
}

fn contract_json(status: &VirtualAudioRouteRuntimeStatus) -> String {
    serde_json::to_string_pretty(&json!({
        "schema": "translateit.virtual_audio_route.runtime_handoff.v1",
        "route_execution_enabled": status.route_execution_enabled,
        "route_execution_attempted": status.route_execution_attempted,
        "source_audio_path": &status.source_audio_path,
        "selected_output_device": &status.selected_output_device,
        "selected_input_device": &status.selected_input_device,
        "source_audio_ready": status.source_audio_ready,
        "route_ready": status.route_ready,
        "route_runtime_ready": status.route_runtime_ready,
        "provider_script_path": &status.provider_script_path,
        "provider_payload_path": &status.provider_payload_path,
        "provider_exit_code": status.provider_exit_code,
        "provider_response_json": &status.provider_response_json,
        "blocker": &status.blocker,
        "next_action": &status.next_action,
        "runtime_claim": &status.runtime_claim
    }))
    .unwrap_or_else(|_| "{}".to_string())
}

fn write_evidence(status: &VirtualAudioRouteRuntimeStatus) -> Option<String> {
    let evidence_path = evidence_path();
    let parent = evidence_path.parent()?;
    let _ = fs::create_dir_all(parent);
    let payload = json!({
        "schema": "translateit.virtual_audio_route.runtime_handoff_evidence.v1",
        "status": status,
        "written_unix_ms": unix_ms(),
        "runtime_claim": "virtual_audio_route_runtime_handoff_source_side_not_audio_runtime_proof"
    });
    let body = serde_json::to_string_pretty(&payload).ok()?;
    fs::write(&evidence_path, body).ok()?;
    Some(normalized_path_label(&evidence_path))
}

fn with_evidence(mut status: VirtualAudioRouteRuntimeStatus) -> VirtualAudioRouteRuntimeStatus {
    status.route_runtime_contract_json = contract_json(&status);
    status.evidence_path = write_evidence(&status);
    status
}

fn base_status(source_audio_path: Option<String>, enable_route_runtime: bool) -> VirtualAudioRouteRuntimeStatus {
    let route = get_virtual_mic_route_selection();
    let source_audio_path = clean_audio_path(source_audio_path);
    let source_audio_ready = source_audio_path.is_some();
    let route_ready = route.route_ready;
    let route_execution_attempted = enable_route_runtime && source_audio_ready && route_ready;
    let route_runtime_ready = source_audio_ready && route_ready && !enable_route_runtime;
    let blocker = if !source_audio_ready {
        "virtual_audio_route:missing_source_audio_path".to_string()
    } else if !route_ready {
        route.blocker.clone()
    } else if enable_route_runtime {
        "virtual_audio_route:runtime_provider_not_dispatched".to_string()
    } else {
        String::new()
    };
    let next_action = if !source_audio_ready {
        "finish_tts_audio_output_handoff".to_string()
    } else if !route_ready {
        route.next_action.clone()
    } else if enable_route_runtime {
        "dispatch_guarded_virtual_audio_route_provider".to_string()
    } else {
        "enable_route_runtime_after_ci_local_and_windows_validation".to_string()
    };

    VirtualAudioRouteRuntimeStatus {
        ok: route_runtime_ready,
        state: if route_runtime_ready { "runtime_handoff_ready" } else { "blocked" }.to_string(),
        route_runtime_ready,
        route_execution_attempted,
        route_execution_enabled: enable_route_runtime,
        source_audio_path,
        source_audio_ready,
        selected_output_device: route.selected_output_device,
        selected_input_device: route.selected_input_device,
        route_ready,
        blocker,
        next_action,
        route_runtime_contract_json: "{}".to_string(),
        evidence_path: None,
        provider_script_path: None,
        provider_payload_path: None,
        provider_exit_code: None,
        provider_response_json: "{}".to_string(),
        runtime_claim: if enable_route_runtime {
            "virtual_audio_route_runtime_guarded_provider_dispatch_required"
        } else {
            "virtual_audio_route_runtime_handoff_source_side_not_audio_runtime_proof"
        }
        .to_string(),
        updated_unix_ms: unix_ms(),
    }
}

fn write_provider_payload(status: &VirtualAudioRouteRuntimeStatus, dry_run: bool) -> Option<PathBuf> {
    let payload_path = provider_payload_path();
    let parent = payload_path.parent()?;
    let _ = fs::create_dir_all(parent);
    let payload = json!({
        "schema": "translateit.virtual_audio_route.provider_payload.v1",
        "enable_route_runtime": status.route_execution_enabled,
        "dry_run": dry_run,
        "source_audio_path": &status.source_audio_path,
        "selected_output_device": &status.selected_output_device,
        "selected_input_device": &status.selected_input_device,
        "runtime_claim": "virtual_audio_route_provider_payload_source_side"
    });
    let body = serde_json::to_string_pretty(&payload).ok()?;
    fs::write(&payload_path, body).ok()?;
    Some(payload_path)
}

fn python_command() -> String {
    env::var("TRANSLATEIT_PYTHON").unwrap_or_else(|_| "python".to_string())
}

#[tauri::command]
pub fn prepare_guarded_virtual_audio_route_runtime(
    source_audio_path: Option<String>,
    enable_route_runtime: Option<bool>,
) -> VirtualAudioRouteRuntimeStatus {
    with_evidence(base_status(source_audio_path, enable_route_runtime.unwrap_or(false)))
}

#[tauri::command]
pub fn dispatch_guarded_virtual_audio_route_provider(
    source_audio_path: Option<String>,
    enable_route_runtime: Option<bool>,
    dry_run: Option<bool>,
) -> VirtualAudioRouteRuntimeStatus {
    let mut status = base_status(source_audio_path, enable_route_runtime.unwrap_or(false));
    status.route_execution_attempted = false;
    let dry_run = dry_run.unwrap_or(true);
    let provider_script = provider_script_path();
    status.provider_script_path = Some(normalized_path_label(&provider_script));

    if !status.source_audio_ready || !status.route_ready {
        status.runtime_claim = "virtual_audio_route_provider_dispatch_blocked_by_prerequisite".to_string();
        return with_evidence(status);
    }

    if !provider_script.is_file() {
        status.ok = false;
        status.route_runtime_ready = false;
        status.blocker = "virtual_audio_route:provider_script_missing".to_string();
        status.next_action = "package_virtual_audio_route_provider_script".to_string();
        status.runtime_claim = "virtual_audio_route_provider_script_missing_no_execution".to_string();
        return with_evidence(status);
    }

    let Some(payload_path) = write_provider_payload(&status, dry_run) else {
        status.ok = false;
        status.route_runtime_ready = false;
        status.blocker = "virtual_audio_route:provider_payload_write_failed".to_string();
        status.next_action = "inspect_userdata_cache_write_permissions".to_string();
        status.runtime_claim = "virtual_audio_route_provider_payload_not_written".to_string();
        return with_evidence(status);
    };
    status.provider_payload_path = Some(normalized_path_label(&payload_path));

    let output = Command::new(python_command())
        .arg(&provider_script)
        .arg(&payload_path)
        .output();

    match output {
        Ok(output) => {
            status.provider_exit_code = output.status.code();
            status.provider_response_json = String::from_utf8_lossy(&output.stdout).trim().chars().take(8000).collect();
            status.route_execution_attempted = status.route_execution_enabled && !dry_run;
            if output.status.success() {
                status.ok = true;
                status.route_runtime_ready = true;
                status.state = if dry_run { "provider_dry_run_ready" } else { "provider_dispatch_completed" }.to_string();
                status.blocker = String::new();
                status.next_action = if dry_run {
                    "disable_dry_run_after_ci_local_windows_validation".to_string()
                } else {
                    "validate_audio_arrived_at_meeting_input".to_string()
                };
                status.runtime_claim = if dry_run {
                    "virtual_audio_route_provider_dry_run_source_side_not_audio_runtime_proof"
                } else {
                    "virtual_audio_route_provider_dispatch_attempted_needs_windows_runtime_validation"
                }
                .to_string();
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr).trim().chars().take(2000).collect::<String>();
                status.ok = false;
                status.route_runtime_ready = false;
                status.state = "provider_dispatch_blocked".to_string();
                status.blocker = "virtual_audio_route:provider_returned_blocker".to_string();
                status.next_action = "inspect_provider_response_json".to_string();
                if !stderr.is_empty() {
                    status.provider_response_json = json!({
                        "stdout": status.provider_response_json,
                        "stderr": stderr
                    }).to_string();
                }
                status.runtime_claim = "virtual_audio_route_provider_returned_blocker".to_string();
            }
        }
        Err(error) => {
            status.ok = false;
            status.route_runtime_ready = false;
            status.state = "provider_dispatch_failed".to_string();
            status.blocker = "virtual_audio_route:provider_process_failed".to_string();
            status.next_action = "configure_translateit_python_or_runtime_environment".to_string();
            status.provider_response_json = json!({ "error": error.to_string() }).to_string();
            status.runtime_claim = "virtual_audio_route_provider_process_failed_no_audio_execution".to_string();
        }
    }

    with_evidence(status)
}
