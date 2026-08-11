use serde::Serialize;
use serde_json::{json, Value};
use std::env;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread;
use std::time::Duration;

use crate::engine::paths::ProjectPaths;
use crate::engine::runtime_state::runtime_generation_is_authoritative;

use super::bridge_paths::{
    resolve_worker_python_command, worker_python_unavailable_message, worker_root,
};
use super::helper_bridge_runtime::unix_ms;
use super::virtual_mic_route::get_virtual_mic_route_selection;

const ROUTE_PROCESS_POLL_MS: u64 = 20;

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

#[derive(Debug, Clone, Serialize)]
pub struct MeetingRouteExecutionGuardStatus {
    pub ready: bool,
    pub provider_script_ready: bool,
    pub execution_guard_enabled: bool,
    pub blocker: String,
    pub note: String,
}

#[derive(Clone)]
struct MeetingRouteCancelControl {
    generation: u64,
    cancel_requested: Arc<AtomicBool>,
}

static MEETING_ROUTE_CANCEL_CONTROL: OnceLock<Mutex<Option<MeetingRouteCancelControl>>> = OnceLock::new();

fn meeting_route_cancel_control() -> &'static Mutex<Option<MeetingRouteCancelControl>> {
    MEETING_ROUTE_CANCEL_CONTROL.get_or_init(|| Mutex::new(None))
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
    worker_root().join("virtual_audio_route_provider.py")
}

fn clean_audio_path(value: Option<String>) -> Option<String> {
    value
        .map(|text| text.trim().chars().take(520).collect::<String>())
        .filter(|text| !text.is_empty())
}

fn truthy_environment(name: &str) -> bool {
    env::var(name)
        .ok()
        .map(|value| matches!(value.trim().to_ascii_lowercase().as_str(), "1" | "true" | "yes" | "on" | "enabled"))
        .unwrap_or(false)
}

pub fn meeting_route_execution_guard_status() -> MeetingRouteExecutionGuardStatus {
    let provider_script_ready = provider_script_path().is_file();
    let execution_guard_enabled = truthy_environment("TRANSLATEIT_ENABLE_VIRTUAL_AUDIO_ROUTE_PROVIDER");
    let ready = provider_script_ready && execution_guard_enabled;
    let blocker = if !provider_script_ready {
        "virtual_audio_route:provider_script_missing"
    } else if !execution_guard_enabled {
        "virtual_audio_route:provider_execution_guard_disabled"
    } else {
        ""
    }
    .to_string();
    MeetingRouteExecutionGuardStatus {
        ready,
        provider_script_ready,
        execution_guard_enabled,
        blocker,
        note: if ready {
            "Meeting Microphone route provider execution is enabled at the current source/runtime boundary. Windows delivery still requires local proof."
        } else if !provider_script_ready {
            "Meeting Microphone route provider script is missing."
        } else {
            "Meeting Microphone route execution guard is disabled, so Translation Live must remain blocked instead of claiming delivery."
        }
        .to_string(),
    }
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

fn write_provider_payload(
    status: &VirtualAudioRouteRuntimeStatus,
    dry_run: bool,
    meeting_generation: Option<u64>,
) -> Option<PathBuf> {
    let payload_path = provider_payload_path();
    let parent = payload_path.parent()?;
    let _ = fs::create_dir_all(parent);
    let payload = json!({
        "schema": "translateit.virtual_audio_route.provider_payload.v2",
        "enable_route_runtime": status.route_execution_enabled,
        "dry_run": dry_run,
        "source_audio_path": &status.source_audio_path,
        "selected_output_device": &status.selected_output_device,
        "selected_input_device": &status.selected_input_device,
        "meeting_generation": meeting_generation,
        "runtime_claim": "virtual_audio_route_provider_payload_source_side"
    });
    let body = serde_json::to_string_pretty(&payload).ok()?;
    fs::write(&payload_path, body).ok()?;
    Some(payload_path)
}

fn mark_python_runtime_missing(status: &mut VirtualAudioRouteRuntimeStatus, runtime_claim: &str) {
    status.ok = false;
    status.route_runtime_ready = false;
    status.state = "provider_dispatch_failed".to_string();
    status.blocker = "virtual_audio_route:python_runtime_missing".to_string();
    status.next_action = "restore_translateit_python_runtime".to_string();
    status.provider_response_json =
        json!({ "error": worker_python_unavailable_message() }).to_string();
    status.runtime_claim = runtime_claim.to_string();
}

fn read_pipe(mut pipe: Option<impl Read>, max_bytes: usize) -> String {
    let Some(mut pipe) = pipe.take() else {
        return String::new();
    };
    let mut buffer = Vec::new();
    let _ = pipe.by_ref().take(max_bytes as u64).read_to_end(&mut buffer);
    String::from_utf8_lossy(&buffer).trim().to_string()
}

fn provider_response_flags(raw: &str) -> (bool, bool, bool) {
    let value = serde_json::from_str::<Value>(raw).unwrap_or_else(|_| json!({}));
    (
        value.get("ok").and_then(Value::as_bool).unwrap_or(false),
        value
            .get("route_execution_attempted")
            .and_then(Value::as_bool)
            .unwrap_or(false),
        value
            .get("audio_route_ready")
            .and_then(Value::as_bool)
            .unwrap_or(false),
    )
}

fn install_meeting_route_cancel_control(generation: u64) -> Arc<AtomicBool> {
    let cancel_requested = Arc::new(AtomicBool::new(false));
    if let Ok(mut control) = meeting_route_cancel_control().lock() {
        *control = Some(MeetingRouteCancelControl {
            generation,
            cancel_requested: Arc::clone(&cancel_requested),
        });
    }
    cancel_requested
}

fn clear_meeting_route_cancel_control(generation: u64) {
    if let Ok(mut control) = meeting_route_cancel_control().lock() {
        if control
            .as_ref()
            .map(|value| value.generation == generation)
            .unwrap_or(false)
        {
            *control = None;
        }
    }
}

pub fn cancel_meeting_virtual_audio_route_provider(generation: u64) -> bool {
    meeting_route_cancel_control()
        .lock()
        .ok()
        .and_then(|control| control.clone())
        .filter(|control| control.generation == generation)
        .map(|control| {
            control.cancel_requested.store(true, Ordering::Release);
            true
        })
        .unwrap_or(false)
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

    let Some(python) = resolve_worker_python_command() else {
        mark_python_runtime_missing(
            &mut status,
            "virtual_audio_route_provider_python_runtime_missing_no_execution",
        );
        return with_evidence(status);
    };

    let Some(payload_path) = write_provider_payload(&status, dry_run, None) else {
        status.ok = false;
        status.route_runtime_ready = false;
        status.blocker = "virtual_audio_route:provider_payload_write_failed".to_string();
        status.next_action = "inspect_userdata_cache_write_permissions".to_string();
        status.runtime_claim = "virtual_audio_route_provider_payload_not_written".to_string();
        return with_evidence(status);
    };
    status.provider_payload_path = Some(normalized_path_label(&payload_path));

    let output = Command::new(&python.program)
        .args(&python.bootstrap_args)
        .arg(&provider_script)
        .arg(&payload_path)
        .output();

    match output {
        Ok(output) => {
            status.provider_exit_code = output.status.code();
            status.provider_response_json = String::from_utf8_lossy(&output.stdout)
                .trim()
                .chars()
                .take(8000)
                .collect::<String>();
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
            status.next_action = "restore_translateit_python_runtime".to_string();
            status.provider_response_json = json!({ "error": error.to_string() }).to_string();
            status.runtime_claim = "virtual_audio_route_provider_process_failed_no_audio_execution".to_string();
        }
    }

    with_evidence(status)
}

pub fn dispatch_meeting_virtual_audio_route_provider(
    source_audio_path: String,
    generation: u64,
) -> VirtualAudioRouteRuntimeStatus {
    let mut status = base_status(Some(source_audio_path), true);
    status.route_execution_attempted = false;
    let guard = meeting_route_execution_guard_status();
    let provider_script = provider_script_path();
    status.provider_script_path = Some(normalized_path_label(&provider_script));

    if !runtime_generation_is_authoritative(generation) {
        status.ok = false;
        status.route_runtime_ready = false;
        status.blocker = "virtual_audio_route:meeting_generation_stale".to_string();
        status.next_action = "discard_stale_meeting_output".to_string();
        status.runtime_claim = "meeting_route_generation_rejected_before_execution".to_string();
        return with_evidence(status);
    }
    if !status.source_audio_ready || !status.route_ready {
        status.runtime_claim = "meeting_route_blocked_by_prerequisite".to_string();
        return with_evidence(status);
    }
    if !guard.ready {
        status.ok = false;
        status.route_runtime_ready = false;
        status.blocker = guard.blocker;
        status.next_action = "enable_and_validate_meeting_route_provider".to_string();
        status.runtime_claim = "meeting_route_execution_guard_blocked".to_string();
        return with_evidence(status);
    }

    let Some(python) = resolve_worker_python_command() else {
        mark_python_runtime_missing(
            &mut status,
            "meeting_route_python_runtime_missing_no_audio_execution",
        );
        return with_evidence(status);
    };

    let Some(payload_path) = write_provider_payload(&status, false, Some(generation)) else {
        status.ok = false;
        status.route_runtime_ready = false;
        status.blocker = "virtual_audio_route:provider_payload_write_failed".to_string();
        status.next_action = "inspect_userdata_cache_write_permissions".to_string();
        status.runtime_claim = "meeting_route_provider_payload_not_written".to_string();
        return with_evidence(status);
    };
    status.provider_payload_path = Some(normalized_path_label(&payload_path));

    let cancel_requested = install_meeting_route_cancel_control(generation);
    let spawn_result = Command::new(&python.program)
        .args(&python.bootstrap_args)
        .arg(&provider_script)
        .arg(&payload_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn();

    let mut child = match spawn_result {
        Ok(child) => child,
        Err(error) => {
            clear_meeting_route_cancel_control(generation);
            status.ok = false;
            status.route_runtime_ready = false;
            status.state = "provider_dispatch_failed".to_string();
            status.blocker = "virtual_audio_route:provider_process_failed".to_string();
            status.next_action = "restore_translateit_python_runtime".to_string();
            status.provider_response_json = json!({ "error": error.to_string() }).to_string();
            status.runtime_claim = "meeting_route_provider_process_failed_no_audio_execution".to_string();
            return with_evidence(status);
        }
    };

    let mut cancelled = false;
    let exit_status = loop {
        if cancel_requested.load(Ordering::Acquire)
            || !runtime_generation_is_authoritative(generation)
        {
            cancelled = true;
            let _ = child.kill();
            break child.wait().ok();
        }
        match child.try_wait() {
            Ok(Some(exit)) => break Some(exit),
            Ok(None) => thread::sleep(Duration::from_millis(ROUTE_PROCESS_POLL_MS)),
            Err(_) => {
                let _ = child.kill();
                break child.wait().ok();
            }
        }
    };

    let stdout = read_pipe(child.stdout.take(), 8_000);
    let stderr = read_pipe(child.stderr.take(), 2_000);
    clear_meeting_route_cancel_control(generation);
    status.provider_exit_code = exit_status.and_then(|value| value.code());
    status.provider_response_json = if stderr.is_empty() {
        stdout.clone()
    } else {
        json!({ "stdout": stdout, "stderr": stderr }).to_string()
    };

    if cancelled || !runtime_generation_is_authoritative(generation) {
        status.ok = false;
        status.route_runtime_ready = false;
        status.route_execution_attempted = true;
        status.state = "provider_cancelled".to_string();
        status.blocker = "virtual_audio_route:meeting_generation_revoked".to_string();
        status.next_action = "discard_stale_meeting_output".to_string();
        status.runtime_claim = "meeting_route_provider_cancelled_after_generation_revoke".to_string();
        return with_evidence(status);
    }

    let (provider_ok, execution_attempted, audio_route_ready) = provider_response_flags(&stdout);
    status.route_execution_attempted = execution_attempted;
    status.ok = provider_ok && execution_attempted && audio_route_ready;
    status.route_runtime_ready = status.ok;
    status.state = if status.ok {
        "provider_dispatch_completed"
    } else {
        "provider_dispatch_blocked"
    }
    .to_string();
    status.blocker = if status.ok {
        String::new()
    } else if !execution_attempted {
        "virtual_audio_route:provider_did_not_execute".to_string()
    } else {
        "virtual_audio_route:provider_returned_blocker".to_string()
    };
    status.next_action = if status.ok {
        "validate_audio_arrived_at_meeting_input"
    } else {
        "inspect_provider_response_json"
    }
    .to_string();
    status.runtime_claim = if status.ok {
        "meeting_route_provider_execution_attempted_needs_windows_runtime_validation"
    } else {
        "meeting_route_provider_execution_not_accepted"
    }
    .to_string();
    with_evidence(status)
}
