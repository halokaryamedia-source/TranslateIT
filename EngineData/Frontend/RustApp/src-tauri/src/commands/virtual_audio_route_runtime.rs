use serde::Serialize;
use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};

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
    pub runtime_claim: String,
    pub updated_unix_ms: u128,
}

fn normalized_path_label(path: &Path) -> String {
    path.to_string_lossy().replace(char::from(92), "/")
}

fn evidence_path() -> PathBuf {
    let project_paths = ProjectPaths::discover();
    PathBuf::from(project_paths.user_log_dir)
        .join("RustAppValidation")
        .join("latest_virtual_audio_route_runtime_handoff.json")
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

#[tauri::command]
pub fn prepare_guarded_virtual_audio_route_runtime(
    source_audio_path: Option<String>,
    enable_route_runtime: Option<bool>,
) -> VirtualAudioRouteRuntimeStatus {
    let route = get_virtual_mic_route_selection();
    let source_audio_path = clean_audio_path(source_audio_path);
    let source_audio_ready = source_audio_path.is_some();
    let route_ready = route.route_ready;
    let route_execution_enabled = enable_route_runtime.unwrap_or(false);
    let route_execution_attempted = route_execution_enabled && source_audio_ready && route_ready;
    let route_runtime_ready = source_audio_ready && route_ready && !route_execution_enabled;
    let blocker = if !source_audio_ready {
        "virtual_audio_route:missing_source_audio_path".to_string()
    } else if !route_ready {
        route.blocker.clone()
    } else if route_execution_enabled {
        "virtual_audio_route:runtime_provider_not_implemented".to_string()
    } else {
        String::new()
    };
    let next_action = if !source_audio_ready {
        "finish_tts_audio_output_handoff".to_string()
    } else if !route_ready {
        route.next_action.clone()
    } else if route_execution_enabled {
        "implement_platform_specific_audio_route_provider".to_string()
    } else {
        "enable_route_runtime_after_ci_local_and_windows_validation".to_string()
    };

    with_evidence(VirtualAudioRouteRuntimeStatus {
        ok: route_runtime_ready,
        state: if route_runtime_ready { "runtime_handoff_ready" } else { "blocked" }.to_string(),
        route_runtime_ready,
        route_execution_attempted,
        route_execution_enabled,
        source_audio_path,
        source_audio_ready,
        selected_output_device: route.selected_output_device,
        selected_input_device: route.selected_input_device,
        route_ready,
        blocker,
        next_action,
        route_runtime_contract_json: "{}".to_string(),
        evidence_path: None,
        runtime_claim: if route_execution_enabled {
            "virtual_audio_route_runtime_guarded_provider_not_implemented"
        } else {
            "virtual_audio_route_runtime_handoff_source_side_not_audio_runtime_proof"
        }
        .to_string(),
        updated_unix_ms: unix_ms(),
    })
}
