use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

use crate::engine::paths::ProjectPaths;
use crate::engine::runtime_state::latest_runtime_session_state;

use super::audio::{list_audio_devices, AudioDeviceSummary};
use super::helper_bridge_runtime::unix_ms;

const APPLICATION_MEETING_OWNER_ID: &str = "translateit_application_meeting";

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
    pub route_pair_id: Option<String>,
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

#[derive(Debug, Clone, Serialize)]
pub struct VirtualMicOutputRouteRuntimeStubStatus {
    pub ok: bool,
    pub route_stub_ready: bool,
    pub source_audio_path: Option<String>,
    pub route_pair_id: Option<String>,
    pub selected_output_device: Option<String>,
    pub selected_input_device: Option<String>,
    pub route_ready: bool,
    pub source_audio_ready: bool,
    pub blocker: String,
    pub next_action: String,
    pub runtime_claim: String,
    pub route_output_contract_json: String,
    pub evidence_path: Option<String>,
    pub updated_unix_ms: u128,
}

#[derive(Debug, Clone)]
struct MeetingVirtualMicRouteSelection {
    generation: Option<u64>,
    pair_id: String,
    output_device: String,
    input_device: String,
}

#[derive(Debug, Clone)]
struct RoutePairCandidate {
    pair_id: String,
    output_device: String,
    input_device: String,
}

#[derive(Debug, Clone)]
struct RouteSelection {
    route_pair_id: Option<String>,
    selected_output_device: Option<String>,
    selected_input_device: Option<String>,
    output_device_found: bool,
    input_device_found: bool,
    blocker: String,
}

static VIRTUAL_MIC_ROUTE_PREFERENCE: OnceLock<Mutex<VirtualMicRoutePreference>> = OnceLock::new();
static MEETING_VIRTUAL_MIC_ROUTE_SELECTION: OnceLock<Mutex<Option<MeetingVirtualMicRouteSelection>>> =
    OnceLock::new();

fn preference_runtime() -> &'static Mutex<VirtualMicRoutePreference> {
    VIRTUAL_MIC_ROUTE_PREFERENCE.get_or_init(|| Mutex::new(load_preference_from_disk()))
}

fn meeting_route_selection_runtime() -> &'static Mutex<Option<MeetingVirtualMicRouteSelection>> {
    MEETING_VIRTUAL_MIC_ROUTE_SELECTION.get_or_init(|| Mutex::new(None))
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

fn route_runtime_stub_evidence_path() -> PathBuf {
    let project_paths = ProjectPaths::discover();
    PathBuf::from(project_paths.user_log_dir)
        .join("RustAppValidation")
        .join("latest_virtual_mic_output_route_stub.json")
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

fn clean_audio_path(value: Option<String>) -> Option<String> {
    value
        .map(|text| text.trim().chars().take(520).collect::<String>())
        .filter(|text| !text.is_empty())
}

fn device_names(devices: &[AudioDeviceSummary]) -> Vec<String> {
    devices.iter().map(|device| device.name.clone()).collect()
}

fn named_device_exists(devices: &[AudioDeviceSummary], preferred: &str) -> bool {
    devices.iter().any(|device| device.name == preferred)
}

fn supported_virtual_pair_provider(name: &str) -> bool {
    let normalized = name.to_ascii_lowercase();
    normalized.contains("vb-audio")
        || normalized.contains("voicemeeter")
        || normalized.contains("virtual cable")
}

fn endpoint_pair_identity(name: &str, expected_role: &str) -> Option<String> {
    if !supported_virtual_pair_provider(name) {
        return None;
    }

    let normalized = name.to_ascii_lowercase();
    let tokens = normalized
        .split(|character: char| !character.is_ascii_alphanumeric())
        .filter(|token| !token.is_empty())
        .collect::<Vec<_>>();
    if !tokens.iter().any(|token| *token == expected_role) {
        return None;
    }

    let identity = tokens
        .into_iter()
        .filter(|token| !matches!(*token, "input" | "output"))
        .collect::<Vec<_>>()
        .join("-");
    if identity.is_empty() {
        None
    } else {
        Some(identity)
    }
}

fn matched_pair_identity(output_device: &str, input_device: &str) -> Option<String> {
    // Windows virtual-cable naming is intentionally role-inverted from the app's
    // point of view: TranslateIT plays TTS into the cable's playback-side "Input"
    // endpoint, while the meeting application selects the paired recording-side
    // "Output" endpoint as its microphone.
    let output_identity = endpoint_pair_identity(output_device, "input")?;
    let input_identity = endpoint_pair_identity(input_device, "output")?;
    if output_identity == input_identity {
        Some(format!("windows_virtual_pair:{output_identity}"))
    } else {
        None
    }
}

fn matched_pair_candidates(
    output_devices: &[AudioDeviceSummary],
    input_devices: &[AudioDeviceSummary],
) -> Vec<RoutePairCandidate> {
    let mut candidates = Vec::new();
    for output in output_devices {
        for input in input_devices {
            let Some(pair_id) = matched_pair_identity(&output.name, &input.name) else {
                continue;
            };
            if candidates
                .iter()
                .any(|candidate: &RoutePairCandidate| candidate.pair_id == pair_id)
            {
                continue;
            }
            candidates.push(RoutePairCandidate {
                pair_id,
                output_device: output.name.clone(),
                input_device: input.name.clone(),
            });
        }
    }
    candidates.sort_by(|left, right| left.pair_id.cmp(&right.pair_id));
    candidates
}

fn primary_vb_cable_pair(candidate: &RoutePairCandidate) -> bool {
    let output = candidate.output_device.to_ascii_lowercase();
    let input = candidate.input_device.to_ascii_lowercase();
    output.starts_with("cable input")
        && input.starts_with("cable output")
        && output.contains("vb-audio virtual cable")
        && input.contains("vb-audio virtual cable")
}

fn select_route_pair(
    output_devices: &[AudioDeviceSummary],
    input_devices: &[AudioDeviceSummary],
    preference: &VirtualMicRoutePreference,
) -> RouteSelection {
    match (
        preference.preferred_output_device.as_deref(),
        preference.preferred_input_device.as_deref(),
    ) {
        (Some(output), Some(input)) => {
            let output_device_found = named_device_exists(output_devices, output);
            let input_device_found = named_device_exists(input_devices, input);
            if !output_device_found {
                return RouteSelection {
                    route_pair_id: None,
                    selected_output_device: Some(output.to_string()),
                    selected_input_device: Some(input.to_string()),
                    output_device_found,
                    input_device_found,
                    blocker: "virtual_mic:selected_output_device_missing".to_string(),
                };
            }
            if !input_device_found {
                return RouteSelection {
                    route_pair_id: None,
                    selected_output_device: Some(output.to_string()),
                    selected_input_device: Some(input.to_string()),
                    output_device_found,
                    input_device_found,
                    blocker: "virtual_mic:selected_input_device_missing".to_string(),
                };
            }
            let route_pair_id = matched_pair_identity(output, input);
            RouteSelection {
                route_pair_id: route_pair_id.clone(),
                selected_output_device: Some(output.to_string()),
                selected_input_device: Some(input.to_string()),
                output_device_found,
                input_device_found,
                blocker: if route_pair_id.is_some() {
                    String::new()
                } else {
                    "virtual_mic:selected_route_pair_mismatch".to_string()
                },
            }
        }
        (Some(output), None) | (None, Some(output)) => RouteSelection {
            route_pair_id: None,
            selected_output_device: preference.preferred_output_device.clone(),
            selected_input_device: preference.preferred_input_device.clone(),
            output_device_found: preference
                .preferred_output_device
                .as_deref()
                .map(|value| named_device_exists(output_devices, value))
                .unwrap_or(false),
            input_device_found: preference
                .preferred_input_device
                .as_deref()
                .map(|value| named_device_exists(input_devices, value))
                .unwrap_or(false),
            blocker: format!(
                "virtual_mic:route_pair_preference_incomplete:{}",
                output.chars().take(80).collect::<String>()
            ),
        },
        (None, None) => {
            let candidates = matched_pair_candidates(output_devices, input_devices);
            let primary = candidates
                .iter()
                .filter(|candidate| primary_vb_cable_pair(candidate))
                .collect::<Vec<_>>();
            let selected = if primary.len() == 1 {
                primary.first().copied()
            } else if candidates.len() == 1 {
                candidates.first()
            } else {
                None
            };

            if let Some(candidate) = selected {
                return RouteSelection {
                    route_pair_id: Some(candidate.pair_id.clone()),
                    selected_output_device: Some(candidate.output_device.clone()),
                    selected_input_device: Some(candidate.input_device.clone()),
                    output_device_found: true,
                    input_device_found: true,
                    blocker: String::new(),
                };
            }

            RouteSelection {
                route_pair_id: None,
                selected_output_device: None,
                selected_input_device: None,
                output_device_found: false,
                input_device_found: false,
                blocker: if candidates.is_empty() {
                    "virtual_mic:matched_route_pair_missing".to_string()
                } else {
                    "virtual_mic:matched_route_pair_ambiguous".to_string()
                },
            }
        }
    }
}

fn current_preference() -> VirtualMicRoutePreference {
    preference_runtime()
        .lock()
        .map(|preference| preference.clone())
        .unwrap_or_else(|_| load_preference_from_disk())
}

fn current_meeting_route_selection() -> Option<MeetingVirtualMicRouteSelection> {
    meeting_route_selection_runtime()
        .lock()
        .ok()
        .and_then(|selection| selection.clone())
}

fn active_application_meeting_generation() -> Option<u64> {
    latest_runtime_session_state()
        .snapshot
        .filter(|snapshot| snapshot.owner_id == APPLICATION_MEETING_OWNER_ID)
        .map(|snapshot| snapshot.generation)
}

fn route_output_contract_json(
    route_pair_id: &Option<String>,
    selected_output_device: &Option<String>,
    selected_input_device: &Option<String>,
    route_ready: bool,
    blocker: &str,
) -> String {
    serde_json::to_string_pretty(&json!({
        "schema": "translateit.virtual_route.output_contract.v2",
        "source_audio_path_field": "pipeline_payload.tts_audio_output_path",
        "route_pair_id": route_pair_id,
        "selected_output_device": selected_output_device,
        "selected_input_device": selected_input_device,
        "meeting_application_microphone_device": selected_input_device,
        "route_ready": route_ready,
        "blocker": blocker,
        "next_runtime_step": if route_ready { "connect_source_audio_to_selected_route_target" } else { "resolve_route_blocker_before_runtime_validation" },
        "runtime_claim": "matched_virtual_route_pair_source_side_not_audio_runtime_proof"
    }))
    .unwrap_or_else(|_| "{}".to_string())
}

fn route_runtime_stub_contract_json(
    source_audio_path: &Option<String>,
    route: &VirtualMicRouteContractStatus,
    route_stub_ready: bool,
    blocker: &str,
) -> String {
    serde_json::to_string_pretty(&json!({
        "schema": "translateit.virtual_route.runtime_stub_contract.v2",
        "source_audio_path": source_audio_path,
        "route_pair_id": &route.route_pair_id,
        "selected_output_device": &route.selected_output_device,
        "selected_input_device": &route.selected_input_device,
        "meeting_application_microphone_device": &route.selected_input_device,
        "route_ready": route.route_ready,
        "route_stub_ready": route_stub_ready,
        "guarded_runtime_execution": false,
        "blocker": blocker,
        "next_runtime_step": if route_stub_ready { "implement_guarded_audio_route_runtime_after_local_compile" } else { "resolve_stub_blocker_before_runtime_route" },
        "runtime_claim": "matched_virtual_route_runtime_stub_source_side_no_audio_execution"
    }))
    .unwrap_or_else(|_| "{}".to_string())
}

fn write_route_evidence(status: &VirtualMicRouteContractStatus) -> Option<String> {
    let evidence_path = route_evidence_path();
    let parent = evidence_path.parent()?;
    let _ = fs::create_dir_all(parent);
    let evidence_payload = json!({
        "schema": "translateit.virtual_route.evidence.v2",
        "status": status,
        "runtime_claim": "matched_virtual_route_evidence_source_side_not_audio_runtime_proof",
        "written_unix_ms": unix_ms()
    });
    let body = serde_json::to_string_pretty(&evidence_payload).ok()?;
    fs::write(&evidence_path, body).ok()?;
    Some(normalized_path_label(&evidence_path))
}

fn write_route_runtime_stub_evidence(status: &VirtualMicOutputRouteRuntimeStubStatus) -> Option<String> {
    let evidence_path = route_runtime_stub_evidence_path();
    let parent = evidence_path.parent()?;
    let _ = fs::create_dir_all(parent);
    let evidence_payload = json!({
        "schema": "translateit.virtual_route.runtime_stub_evidence.v2",
        "status": status,
        "runtime_claim": "matched_virtual_route_runtime_stub_evidence_source_side_no_audio_execution",
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

fn with_runtime_stub_evidence(
    mut status: VirtualMicOutputRouteRuntimeStubStatus,
) -> VirtualMicOutputRouteRuntimeStubStatus {
    status.evidence_path = write_route_runtime_stub_evidence(&status);
    status
}

fn next_action_for_blocker(blocker: &str) -> String {
    if blocker.is_empty() {
        "prepare_virtual_mic_output_route_runtime_stub".to_string()
    } else if blocker.contains("ambiguous") || blocker.contains("preference") || blocker.contains("mismatch") {
        "configure_one_matched_virtual_audio_route_pair".to_string()
    } else if blocker.contains("selected") {
        "restore_selected_virtual_audio_route_pair".to_string()
    } else {
        "install_or_enable_one_supported_virtual_audio_cable_pair".to_string()
    }
}

fn status_from_selection(
    preference: VirtualMicRoutePreference,
    preference_persisted: bool,
    preference_path: Option<String>,
    available_output_devices: Vec<String>,
    available_input_devices: Vec<String>,
    selection: RouteSelection,
    runtime_claim: &str,
) -> VirtualMicRouteContractStatus {
    let route_ready = selection.blocker.is_empty()
        && selection.route_pair_id.is_some()
        && selection.output_device_found
        && selection.input_device_found;
    let route_output_contract_json = route_output_contract_json(
        &selection.route_pair_id,
        &selection.selected_output_device,
        &selection.selected_input_device,
        route_ready,
        &selection.blocker,
    );
    let next_action = next_action_for_blocker(&selection.blocker);

    with_route_evidence(VirtualMicRouteContractStatus {
        ok: route_ready,
        route_ready,
        route_pair_id: selection.route_pair_id,
        selected_output_device: selection.selected_output_device,
        selected_input_device: selection.selected_input_device,
        preferred_output_device: preference.preferred_output_device,
        preferred_input_device: preference.preferred_input_device,
        output_device_found: selection.output_device_found,
        input_device_found: selection.input_device_found,
        preference_persisted,
        preference_path,
        evidence_path: None,
        route_output_contract_json,
        available_output_devices,
        available_input_devices,
        blocker: selection.blocker,
        next_action,
        runtime_claim: runtime_claim.to_string(),
        updated_unix_ms: unix_ms(),
    })
}

fn build_dynamic_status(
    preference: VirtualMicRoutePreference,
    preference_persisted: bool,
    preference_path: Option<String>,
) -> VirtualMicRouteContractStatus {
    let devices = list_audio_devices();
    let available_output_devices = device_names(&devices.output_devices);
    let available_input_devices = device_names(&devices.input_devices);
    let selection = select_route_pair(
        &devices.output_devices,
        &devices.input_devices,
        &preference,
    );
    status_from_selection(
        preference,
        preference_persisted,
        preference_path,
        available_output_devices,
        available_input_devices,
        selection,
        "virtual_mic_matched_route_pair_selection_source_side_not_audio_routing_proof",
    )
}

fn build_fixed_status(
    fixed: &MeetingVirtualMicRouteSelection,
    runtime_claim: &str,
) -> VirtualMicRouteContractStatus {
    let preference = current_preference();
    let path = preference_path();
    let devices = list_audio_devices();
    let available_output_devices = device_names(&devices.output_devices);
    let available_input_devices = device_names(&devices.input_devices);
    let output_device_found = named_device_exists(&devices.output_devices, &fixed.output_device);
    let input_device_found = named_device_exists(&devices.input_devices, &fixed.input_device);
    let pair_still_matches = matched_pair_identity(&fixed.output_device, &fixed.input_device)
        .as_deref()
        == Some(fixed.pair_id.as_str());
    let blocker = if !output_device_found {
        "virtual_mic:selected_output_device_missing".to_string()
    } else if !input_device_found {
        "virtual_mic:selected_input_device_missing".to_string()
    } else if !pair_still_matches {
        "virtual_mic:selected_route_pair_mismatch".to_string()
    } else {
        String::new()
    };
    let selection = RouteSelection {
        route_pair_id: Some(fixed.pair_id.clone()),
        selected_output_device: Some(fixed.output_device.clone()),
        selected_input_device: Some(fixed.input_device.clone()),
        output_device_found,
        input_device_found,
        blocker,
    };
    status_from_selection(
        preference,
        path.is_file(),
        Some(normalized_path_label(&path)),
        available_output_devices,
        available_input_devices,
        selection,
        runtime_claim,
    )
}

fn unbound_active_meeting_status(generation: u64) -> VirtualMicRouteContractStatus {
    let preference = current_preference();
    let path = preference_path();
    let devices = list_audio_devices();
    status_from_selection(
        preference,
        path.is_file(),
        Some(normalized_path_label(&path)),
        device_names(&devices.output_devices),
        device_names(&devices.input_devices),
        RouteSelection {
            route_pair_id: None,
            selected_output_device: None,
            selected_input_device: None,
            output_device_found: false,
            input_device_found: false,
            blocker: format!("virtual_mic:meeting_route_generation_not_bound:{generation}"),
        },
        "virtual_mic_active_meeting_route_not_bound_fail_closed",
    )
}

pub fn clear_prepared_virtual_mic_route_selection() {
    if let Ok(mut selection) = meeting_route_selection_runtime().lock() {
        if selection
            .as_ref()
            .map(|value| value.generation.is_none())
            .unwrap_or(false)
        {
            *selection = None;
        }
    }
}

pub fn prepare_current_virtual_mic_route_for_meeting() -> Result<(), String> {
    let path = preference_path();
    let route = build_dynamic_status(
        current_preference(),
        path.is_file(),
        Some(normalized_path_label(&path)),
    );
    if !route.route_ready {
        return Err(if route.blocker.is_empty() {
            "virtual_mic:matched_route_pair_not_ready".to_string()
        } else {
            route.blocker
        });
    }
    let Some(pair_id) = route.route_pair_id else {
        return Err("virtual_mic:matched_route_pair_identity_missing".to_string());
    };
    let Some(output_device) = route.selected_output_device else {
        return Err("virtual_mic:matched_route_output_missing".to_string());
    };
    let Some(input_device) = route.selected_input_device else {
        return Err("virtual_mic:matched_route_input_missing".to_string());
    };

    let mut selection = meeting_route_selection_runtime()
        .lock()
        .map_err(|_| "virtual_mic:meeting_route_selection_lock_failed".to_string())?;
    *selection = Some(MeetingVirtualMicRouteSelection {
        generation: None,
        pair_id,
        output_device,
        input_device,
    });
    Ok(())
}

pub fn bind_prepared_virtual_mic_route_to_generation(generation: u64) -> Result<(), String> {
    let active_generation = active_application_meeting_generation();
    if active_generation != Some(generation) {
        return Err("virtual_mic:meeting_route_bind_generation_not_active".to_string());
    }

    let mut selection = meeting_route_selection_runtime()
        .lock()
        .map_err(|_| "virtual_mic:meeting_route_selection_lock_failed".to_string())?;
    let Some(prepared) = selection.as_mut() else {
        return Err("virtual_mic:prepared_route_pair_missing".to_string());
    };
    if let Some(existing_generation) = prepared.generation {
        return if existing_generation == generation {
            Ok(())
        } else {
            Err("virtual_mic:prepared_route_pair_bound_to_other_generation".to_string())
        };
    }
    prepared.generation = Some(generation);
    Ok(())
}

pub fn get_virtual_mic_route_selection() -> VirtualMicRouteContractStatus {
    if let Some(generation) = active_application_meeting_generation() {
        if let Some(selection) = current_meeting_route_selection() {
            if selection.generation == Some(generation) {
                return build_fixed_status(
                    &selection,
                    "virtual_mic_generation_bound_route_pair_source_side_not_audio_routing_proof",
                );
            }
        }
        return unbound_active_meeting_status(generation);
    }

    if let Some(selection) = current_meeting_route_selection() {
        if selection.generation.is_none() {
            return build_fixed_status(
                &selection,
                "virtual_mic_prepared_route_pair_source_side_not_audio_routing_proof",
            );
        }
    }

    let path = preference_path();
    build_dynamic_status(
        current_preference(),
        path.is_file(),
        Some(normalized_path_label(&path)),
    )
}

#[tauri::command]
pub fn get_virtual_mic_route_contract_status() -> VirtualMicRouteContractStatus {
    get_virtual_mic_route_selection()
}

fn build_runtime_stub_status(source_audio_path: Option<String>) -> VirtualMicOutputRouteRuntimeStubStatus {
    let route = get_virtual_mic_route_selection();
    let source_audio_path = clean_audio_path(source_audio_path);
    let source_audio_ready = source_audio_path.is_some();
    let route_stub_ready = source_audio_ready && route.route_ready;
    let blocker = if route_stub_ready {
        String::new()
    } else if !source_audio_ready {
        "virtual_route:missing_source_audio_path".to_string()
    } else if !route.route_ready {
        route.blocker.clone()
    } else {
        "virtual_route:stub_not_ready".to_string()
    };
    let next_action = if route_stub_ready {
        "local_compile_then_guarded_audio_route_runtime".to_string()
    } else if !source_audio_ready {
        "provide_tts_audio_output_path_from_tts_handoff".to_string()
    } else if !route.route_ready {
        route.next_action.clone()
    } else {
        "inspect_virtual_route_evidence".to_string()
    };
    let route_output_contract_json = route_runtime_stub_contract_json(
        &source_audio_path,
        &route,
        route_stub_ready,
        &blocker,
    );

    with_runtime_stub_evidence(VirtualMicOutputRouteRuntimeStubStatus {
        ok: route_stub_ready,
        route_stub_ready,
        source_audio_path,
        route_pair_id: route.route_pair_id,
        selected_output_device: route.selected_output_device,
        selected_input_device: route.selected_input_device,
        route_ready: route.route_ready,
        source_audio_ready,
        blocker,
        next_action,
        runtime_claim: "matched_virtual_mic_output_route_runtime_stub_source_side_no_audio_execution"
            .to_string(),
        route_output_contract_json,
        evidence_path: None,
        updated_unix_ms: unix_ms(),
    })
}

#[tauri::command]
pub fn prepare_virtual_mic_output_route_runtime_stub(
    source_audio_path: Option<String>,
) -> VirtualMicOutputRouteRuntimeStubStatus {
    build_runtime_stub_status(source_audio_path)
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
    clear_prepared_virtual_mic_route_selection();
    let (persisted, path) = save_preference_to_disk(&preference);
    build_dynamic_status(preference, persisted, path)
}
