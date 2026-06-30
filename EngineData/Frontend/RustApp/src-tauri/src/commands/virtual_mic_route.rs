use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

use crate::engine::paths::ProjectPaths;

use super::audio::{list_audio_devices, AudioDeviceSummary};
use super::helper_bridge_runtime::unix_ms;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct VirtualMicRoutePreference {
    pub preferred_output_device: Option<String>,
    pub preferred_input_device: Option<String>,
    pub updated_unix_ms: u128,
}

impl Default for VirtualMicRoutePreference {
    fn default() -> Self {
        Self {
            preferred_output_device: None,
            preferred_input_device: None,
            updated_unix_ms: unix_ms(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct VirtualMicRouteContractStatus {
    pub ok: bool,
    pub route_ready: bool,
    pub selected_output_device: Option<String>,
    pub selected_input_device: Option<String>,
    pub preferred_output_device: Option<String>,
    pub preferred_input_device: Option<String>,
    pub output_device_found: bool,
    pub input_device_found: bool,
    pub preference_persisted: bool,
    pub preference_path: Option<String>,
    pub evidence_path: Option<String>,
    pub route_output_contract_json: String,
    pub available_output_devices: Vec<String>,
    pub available_input_devices: Vec<String>,
    pub blocker: String,
    pub next_action: String,
    pub runtime_claim: String,
    pub updated_unix_ms: u128,
}

static VIRTUAL_MIC_ROUTE_PREFERENCE: OnceLock<Mutex<VirtualMicRoutePreference>> = OnceLock::new();

fn preference_runtime() -> &'static Mutex<VirtualMicRoutePreference> {
    VIRTUAL_MIC_ROUTE_PREFERENCE.get_or_init(|| Mutex::new(load_preference_from_disk()))
}

fn normalized_path_label(path: &Path) -> String {
    path.to_string_lossy().replace(char::from(92), "/")
}

fn preference_path() -> PathBuf {
    let project_paths = ProjectPaths::discover();
    PathBuf::from(project_paths.user_cache_dir).join("virtual_mic_route_preference.json")
}

fn route_evidence_path() -> PathBuf {
    let project_paths = ProjectPaths::discover();
    PathBuf::from(project_paths.user_log_dir)
        .join("RustAppValidation")
        .join("latest_virtual_mic_route_evidence.json")
}

fn load_preference_from_disk() -> VirtualMicRoutePreference {
    let path = preference_path();
    fs::read_to_string(path)
        .ok()
        .and_then(|body| serde_json::from_str::<VirtualMicRoutePreference>(&body).ok())
        .unwrap_or_default()
}

fn save_preference_to_disk(preference: &VirtualMicRoutePreference) -> (bool, Option<String>) {
    let path = preference_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let persisted = serde_json::to_string_pretty(preference)
        .ok()
        .and_then(|body| fs::write(&path, body).ok())
        .is_some();
    (persisted, Some(normalized_path_label(&path)))
}

fn clean_device_name(value: Option<String>) -> Option<String> {
    value
        .map(|text| text.trim().chars().take(180).collect::<String>())
        .filter(|text| !text.is_empty())
}

fn device_names(devices: &[AudioDeviceSummary]) -> Vec<String> {
    devices.iter().map(|device| device.name.clone()).collect()
}

fn has_virtual_device_keyword(name: &str) -> bool {
    let normalized = name.to_lowercase();
    [
        "vb-audio",
        "cable input",
        "cable output",
        "voicemeeter",
        "blackhole",
        "loopback",
        "virtual cable",
        "virtual audio",
        "stereo mix",
    ]
    .iter()
    .any(|keyword| normalized.contains(keyword))
}

fn named_device_exists(devices: &[AudioDeviceSummary], preferred: &str) -> bool {
    devices.iter().any(|device| device.name == preferred)
}

fn auto_virtual_candidate(devices: &[AudioDeviceSummary]) -> Option<String> {
    devices
        .iter()
        .find(|device| has_virtual_device_keyword(&device.name))
        .map(|device| device.name.clone())
}

fn selected_device(
    devices: &[AudioDeviceSummary],
    preferred: &Option<String>,
) -> (Option<String>, bool, bool) {
    if let Some(preferred) = preferred {
        let found = named_device_exists(devices, preferred);
        return (if found { Some(preferred.clone()) } else { None }, found, true);
    }
    let candidate = auto_virtual_candidate(devices);
    let found = candidate.is_some();
    (candidate, found, false)
}

fn current_preference() -> VirtualMicRoutePreference {
    preference_runtime()
        .lock()
        .map(|preference| preference.clone())
        .unwrap_or_else(|_| load_preference_from_disk())
}

fn route_output_contract_json(
    selected_output_device: &Option<String>,
    selected_input_device: &Option<String>,
    route_ready: bool,
    blocker: &str,
) -> String {
    serde_json::to_string_pretty(&json!({
        "schema": "translateit.virtual_route.output_contract.v1",
        "source_audio_path_field": "pipeline_payload.tts_audio_output_path",
        "selected_output_device": selected_output_device,
        "selected_input_device": selected_input_device,
        "route_ready": route_ready,
        "blocker": blocker,
        "next_runtime_step": if route_ready { "connect_source_audio_to_selected_route_target" } else { "resolve_route_blocker_before_runtime_validation" },
        "runtime_claim": "virtual_route_output_contract_source_side_not_audio_runtime_proof"
    }))
    .unwrap_or_else(|_| "{}".to_string())
}

fn write_route_evidence(status: &VirtualMicRouteContractStatus) -> Option<String> {
    let evidence_path = route_evidence_path();
    let parent = evidence_path.parent()?;
    let _ = fs::create_dir_all(parent);
    let evidence_payload = json!({
        "schema": "translateit.virtual_route.evidence.v1",
        "status": status,
        "runtime_claim": "virtual_route_evidence_source_side_not_audio_runtime_proof",
        "written_unix_ms": unix_ms()
    });
    let body = serde_json::to_string_pretty(&evidence_payload).ok()?;
    fs::write(&evidence_path, body).ok()?;
    Some(normalized_path_label(&evidence_path))
}

fn with_route_evidence(mut status: VirtualMicRouteContractStatus) -> VirtualMicRouteContractStatus {
    status.evidence_path = write_route_evidence(&status);
    status
}

fn build_status(
    preference: VirtualMicRoutePreference,
    preference_persisted: bool,
    preference_path: Option<String>,
) -> VirtualMicRouteContractStatus {
    let devices = list_audio_devices();
    let available_output_devices = device_names(&devices.output_devices);
    let available_input_devices = device_names(&devices.input_devices);
    let (selected_output_device, output_device_found, output_was_preferred) =
        selected_device(&devices.output_devices, &preference.preferred_output_device);
    let (selected_input_device, input_device_found, input_was_preferred) =
        selected_device(&devices.input_devices, &preference.preferred_input_device);
    let route_ready = output_device_found && input_device_found;
    let blocker = if route_ready {
        String::new()
    } else if output_was_preferred && !output_device_found {
        "virtual_mic:selected_output_device_missing".to_string()
    } else if input_was_preferred && !input_device_found {
        "virtual_mic:selected_input_device_missing".to_string()
    } else if !output_device_found {
        "virtual_mic:output_device_missing".to_string()
    } else if !input_device_found {
        "virtual_mic:input_device_missing".to_string()
    } else {
        "virtual_mic:route_not_ready".to_string()
    };
    let next_action = if route_ready {
        "connect_tts_output_audio_to_selected_virtual_output_device".to_string()
    } else if blocker.contains("selected") {
        "choose_existing_virtual_mic_route_device".to_string()
    } else {
        "install_or_enable_virtual_audio_cable".to_string()
    };
    let route_output_contract_json = route_output_contract_json(
        &selected_output_device,
        &selected_input_device,
        route_ready,
        &blocker,
    );

    with_route_evidence(VirtualMicRouteContractStatus {
        ok: route_ready,
        route_ready,
        selected_output_device,
        selected_input_device,
        preferred_output_device: preference.preferred_output_device,
        preferred_input_device: preference.preferred_input_device,
        output_device_found,
        input_device_found,
        preference_persisted,
        preference_path,
        evidence_path: None,
        route_output_contract_json,
        available_output_devices,
        available_input_devices,
        blocker,
        next_action,
        runtime_claim: "virtual_mic_route_device_selection_source_side_not_audio_routing_proof".to_string(),
        updated_unix_ms: unix_ms(),
    })
}

pub fn get_virtual_mic_route_selection() -> VirtualMicRouteContractStatus {
    let path = preference_path();
    build_status(
        current_preference(),
        path.is_file(),
        Some(normalized_path_label(&path)),
    )
}

#[tauri::command]
pub fn get_virtual_mic_route_contract_status() -> VirtualMicRouteContractStatus {
    get_virtual_mic_route_selection()
}

#[tauri::command]
pub fn set_preferred_virtual_mic_route_devices(
    output_device: Option<String>,
    input_device: Option<String>,
) -> VirtualMicRouteContractStatus {
    let preference = VirtualMicRoutePreference {
        preferred_output_device: clean_device_name(output_device),
        preferred_input_device: clean_device_name(input_device),
        updated_unix_ms: unix_ms(),
    };
    if let Ok(mut cached) = preference_runtime().lock() {
        *cached = preference.clone();
    }
    let (persisted, path) = save_preference_to_disk(&preference);
    build_status(preference, persisted, path)
}
