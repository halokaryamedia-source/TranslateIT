use serde::Serialize;
use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};

use crate::engine;
use crate::engine::adapters::runtime_lifecycle_logic::{
    analyze_start_lifecycle_gate, analyze_stop_lifecycle_gate, RuntimeLifecycleGateReport,
};
use crate::engine::audio::input::InputPreparationStatus;
use crate::engine::inference::backend_validation::NativeCudaBackendValidationReport;
use crate::engine::paths::ProjectPaths;
use crate::engine::runtime_state::{
    latest_runtime_handoff_state, latest_runtime_session_state, RuntimeHandoffStateReport,
    RuntimeSessionStateReport,
};
use crate::engine::state::{CommandResult, LifecycleState};

use super::helper_bridge::start_helper_bridge;
use super::helper_bridge::{
    cancel_helper_bridge_task, get_helper_bridge_status, send_helper_bridge_request,
    HelperBridgeActionResult, HelperBridgeRequest,
};

const MAX_CAPTURE_PREVIEW_MESSAGE_CHARS: usize = 360;

#[derive(Debug, Clone, Serialize)]
pub struct CaptureHelperBridgeRequestPreview {
    pub ok: bool,
    pub state: String,
    pub message: String,
    pub command: String,
    pub generation_token: u64,
    pub provider_ready: bool,
    pub cuda_ready: bool,
    pub runtime_claim: String,
    pub payload_json: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct VoiceCapturePreparationReport {
    pub ok: bool,
    pub state: String,
    pub microphone_ready: bool,
    pub helper_state: String,
    pub helper_ready: bool,
    pub provider_ready: bool,
    pub cuda_ready: bool,
    pub missing: Vec<String>,
    pub next_actions: Vec<String>,
    pub message: String,
    pub input_status: InputPreparationStatus,
    pub helper_status: super::helper_bridge::HelperBridgeStatus,
}

#[derive(Debug, Clone, Serialize)]
pub struct ModelInventoryItem {
    pub model_id: String,
    pub required: bool,
    pub expected_path: String,
    pub found: bool,
    pub file_count: usize,
    pub size_bytes: u64,
    pub gpu_capable: String,
    pub cpu_fallback: bool,
    pub download_url: Option<String>,
    pub status: String,
    pub blocker: Option<String>,
    pub next_action: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ModelInventoryReport {
    pub ok: bool,
    pub status: String,
    pub created_at: String,
    pub items: Vec<ModelInventoryItem>,
    pub blockers: Vec<String>,
    pub note: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ModelSetupReport {
    pub ok: bool,
    pub status: String,
    pub created_at: String,
    pub output_dir: String,
    pub items: Vec<ModelInventoryItem>,
    pub blockers: Vec<String>,
    pub note: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct GpuPolicyReport {
    pub ok: bool,
    pub status: String,
    pub cuda_available: bool,
    pub gpu_primary: bool,
    pub cpu_fallback_active: bool,
    pub preferred_backend: String,
    pub notes: Vec<String>,
    pub blocker: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, serde::Deserialize)]
struct ModelManifest {
    schema: Option<String>,
    backend_policy: Option<BackendPolicy>,
    models: Vec<ModelManifestEntry>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, serde::Deserialize)]
struct BackendPolicy {
    gpu_primary: Option<bool>,
    cpu_fallback_allowed: Option<bool>,
    cpu_fallback_label: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, serde::Deserialize)]
struct ModelManifestEntry {
    model_id: String,
    required: bool,
    stage: String,
    backend: String,
    expected_path: String,
    gpu_capable: Option<bool>,
    cpu_fallback: Option<bool>,
    download_url: Option<String>,
    checksum: Option<String>,
    license: Option<String>,
    notes: Option<String>,
}

fn now_iso() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", now.as_secs())
}

fn validation_write_path(project_paths: &ProjectPaths, file_name: &str) -> PathBuf {
    PathBuf::from(&project_paths.user_cache_dir)
        .join("validation")
        .join(file_name)
}

fn read_model_manifest(path: &Path) -> Option<ModelManifest> {
    let text = fs::read_to_string(path).ok()?;
    serde_json::from_str::<ModelManifest>(&text).ok()
}

fn count_files(root: &Path) -> (usize, u64) {
    let mut count = 0usize;
    let mut bytes = 0u64;
    let entries = match fs::read_dir(root) {
        Ok(entries) => entries,
        Err(_) => return (0, 0),
    };
    for entry in entries.filter_map(Result::ok) {
        let path = entry.path();
        if path.is_file() {
            count += 1;
            bytes += path.metadata().map(|metadata| metadata.len()).unwrap_or(0);
        }
    }
    (count, bytes)
}

fn build_model_inventory(
    project_paths: &ProjectPaths,
) -> (Vec<ModelInventoryItem>, Vec<String>, String) {
    let root = PathBuf::from(&project_paths.project_root);
    let manifest_path = root
        .join("EngineData")
        .join("Backend")
        .join("LocalWorker")
        .join("WorkerRuntime")
        .join("model_manifest.json");
    let manifest = read_model_manifest(&manifest_path);
    let mut blockers = Vec::new();
    if manifest.is_none() {
        blockers.push("model_manifest_missing_or_invalid".to_string());
    }
    let mut items = Vec::new();
    if let Some(manifest) = manifest {
        for entry in manifest.models {
            let expected_path = root.join(&entry.expected_path);
            let found = expected_path.is_dir() || expected_path.is_file();
            let (file_count, size_bytes) = if expected_path.is_dir() {
                count_files(&expected_path)
            } else if expected_path.is_file() {
                (1, expected_path.metadata().map(|m| m.len()).unwrap_or(0))
            } else {
                (0, 0)
            };
            let gpu_capable = entry
                .gpu_capable
                .map(|value| if value { "true" } else { "false" }.to_string())
                .unwrap_or_else(|| "unknown".to_string());
            let cpu_fallback = entry.cpu_fallback.unwrap_or(false);
            let status = if found {
                "PASS"
            } else if entry.download_url.is_none() {
                if entry.required {
                    "BLOCKED"
                } else {
                    "PARTIAL"
                }
            } else {
                "PARTIAL"
            };
            let blocker = if found {
                None
            } else if entry.download_url.is_none() {
                Some(format!("download_source_missing:{}", entry.model_id))
            } else {
                Some(format!("missing_model:{}", entry.model_id))
            };
            let next_action = if found {
                "Model present".to_string()
            } else if entry.download_url.is_some() {
                format!(
                    "Download and place {} in {}",
                    entry.model_id, entry.expected_path
                )
            } else {
                format!(
                    "Define download URL or place {} in {}",
                    entry.model_id, entry.expected_path
                )
            };
            if entry.required && !found {
                blockers.push(format!("missing_required_model:{}", entry.model_id));
            }
            items.push(ModelInventoryItem {
                model_id: entry.model_id,
                required: entry.required,
                expected_path: entry.expected_path,
                found,
                file_count,
                size_bytes,
                gpu_capable,
                cpu_fallback,
                download_url: entry.download_url,
                status: status.to_string(),
                blocker,
                next_action,
            });
        }
    }
    let ok = blockers.is_empty();
    let status = if ok {
        "PASS"
    } else if blockers
        .iter()
        .any(|blocker| blocker.contains("missing_required_model"))
    {
        "BLOCKED"
    } else {
        "PARTIAL"
    };
    (items, blockers, status.to_string())
}

fn write_validation_json(project_paths: &ProjectPaths, file_name: &str, value: &impl Serialize) {
    let path = validation_write_path(project_paths, file_name);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(text) = serde_json::to_string_pretty(value) {
        let _ = fs::write(path, text);
    }
}

fn is_unsafe_preview_character(character: char) -> bool {
    character == '\0'
        || ('\u{0001}'..='\u{0008}').contains(&character)
        || ('\u{000b}'..='\u{001f}').contains(&character)
        || character == '\u{007f}'
        || ('\u{202a}'..='\u{202e}').contains(&character)
        || ('\u{2066}'..='\u{2069}').contains(&character)
}

fn compact_preview_text(value: &str) -> String {
    let clean = value
        .trim()
        .chars()
        .filter(|character| !is_unsafe_preview_character(*character))
        .take(MAX_CAPTURE_PREVIEW_MESSAGE_CHARS)
        .collect::<String>();
    if clean.is_empty() {
        "status unavailable".to_string()
    } else {
        clean
    }
}

fn capture_request_preview(command: &str) -> CaptureHelperBridgeRequestPreview {
    let status = get_helper_bridge_status();
    let settings = engine::load_settings();
    let payload = if command == "capture_start" {
        json!({
            "command": "capture_start",
            "generation_token": status.generation_token,
            "source_language": settings.source_language,
            "target_language": settings.target_language,
            "runtime_profile": settings.runtime_profile,
            "input_device_id": settings.audio.input_device_id,
            "output_device_id": settings.audio.output_device_id,
            "provider_ready": status.provider_ready,
            "cuda_ready": status.cuda_ready,
            "runtime_claim": "preview_only_capture_not_started"
        })
    } else {
        json!({
            "command": "capture_stop",
            "generation_token": status.generation_token,
            "provider_ready": status.provider_ready,
            "runtime_claim": "preview_only_capture_not_stopped"
        })
    };
    let ready = status.provider_ready;
    let status_message = compact_preview_text(&status.message);
    CaptureHelperBridgeRequestPreview {
        ok: ready,
        state: if ready {
            "request_ready"
        } else {
            "provider_blocked"
        }
        .to_string(),
        message: if ready {
            format!("Prepared {command} helper bridge request preview. Capture has not been started from this command.")
        } else {
            format!("Prepared {command} preview, but capture remains blocked until helper provider readiness is verified. Current helper state: {}; message: {}", compact_preview_text(&status.state), status_message)
        },
        command: command.to_string(),
        generation_token: status.generation_token,
        provider_ready: status.provider_ready,
        cuda_ready: status.cuda_ready,
        runtime_claim: "preview_only_no_capture_runtime_claim".to_string(),
        payload_json: payload.to_string(),
    }
}

fn voice_capture_blockers(
    input_status: &InputPreparationStatus,
    helper_status: &super::helper_bridge::HelperBridgeStatus,
) -> (Vec<String>, Vec<String>, String, String) {
    let mut missing = Vec::new();
    let mut next_actions = Vec::new();
    let helper_state = helper_status.state.clone();
    let mut message = "Voice capture is ready.".to_string();
    let mut state = "ready".to_string();

    if !input_status.prepared {
        missing.push("microphone".to_string());
        next_actions.push("Check microphone device".to_string());
        message = input_status.note.clone();
        state = "missing_microphone".to_string();
    }

    if helper_state == "not_started"
        || helper_state == "stopped"
        || helper_state == "error"
        || helper_state == "blocked"
    {
        next_actions.push("Start Helper".to_string());
        state = "starting".to_string();
    }

    if !helper_status.provider_ready {
        if helper_status.state == "blocked" || helper_status.state == "error" {
            missing.push("worker".to_string());
            next_actions.push("Run Worker Status".to_string());
            message = helper_status.message.clone();
            state = "missing_worker".to_string();
        } else {
            missing.push("models".to_string());
            next_actions.push("Open Developer Diagnostics".to_string());
            message = if helper_status.cuda_ready {
                "Local helper started, but voice models are not ready yet.".to_string()
            } else {
                "Local helper started, but provider readiness is still incomplete. CPU fallback may be available, but voice capture is not ready yet.".to_string()
            };
            state = "missing_models".to_string();
        }
    }

    if helper_status.provider_ready && input_status.prepared {
        state = "ready".to_string();
        message = "Voice provider and microphone are ready.".to_string();
    }

    if !helper_status.cuda_ready {
        next_actions.push("Continue with CPU fallback if models are ready".to_string());
    }

    (missing, next_actions, state, message)
}

#[tauri::command]
pub fn get_runtime_handoff_state() -> RuntimeHandoffStateReport {
    latest_runtime_handoff_state()
}

#[tauri::command]
pub fn get_runtime_session_state() -> RuntimeSessionStateReport {
    latest_runtime_session_state()
}

#[tauri::command]
pub fn analyze_start_gate() -> RuntimeLifecycleGateReport {
    analyze_start_lifecycle_gate()
}

#[tauri::command]
pub fn analyze_stop_gate() -> RuntimeLifecycleGateReport {
    analyze_stop_lifecycle_gate()
}

#[tauri::command]
pub fn prepare_capture_start_request() -> CaptureHelperBridgeRequestPreview {
    capture_request_preview("capture_start")
}

#[tauri::command]
pub fn prepare_capture_stop_request() -> CaptureHelperBridgeRequestPreview {
    capture_request_preview("capture_stop")
}

#[tauri::command]
pub fn check_helper_bridge_health() -> HelperBridgeActionResult {
    let status = get_helper_bridge_status();
    if status.state != "ready" {
        return HelperBridgeActionResult {
            ok: false,
            state: status.state,
            message: "Helper bridge health check skipped because worker is not ready. Use Start Helper first.".to_string(),
            generation_token: status.generation_token,
            runtime_claim: status.runtime_claim,
        };
    }
    send_helper_bridge_request(HelperBridgeRequest {
        task: "status".to_string(),
        payload_json: None,
    })
}

#[tauri::command]
pub fn prepare_voice_capture(auto_start: bool) -> VoiceCapturePreparationReport {
    let input_status = crate::commands::audio::get_input_status();
    let mut helper_status = get_helper_bridge_status();
    if auto_start
        && (helper_status.state == "not_started"
            || helper_status.state == "stopped"
            || helper_status.state == "error"
            || helper_status.state == "blocked")
    {
        let _ = start_helper_bridge();
        helper_status = get_helper_bridge_status();
    }
    let (mut missing, mut next_actions, state, message) =
        voice_capture_blockers(&input_status, &helper_status);
    if !input_status.prepared
        && !next_actions
            .iter()
            .any(|action| action == "Check microphone device")
    {
        next_actions.push("Check microphone device".to_string());
    }
    if !helper_status.provider_ready
        && !next_actions
            .iter()
            .any(|action| action == "Open Developer Diagnostics")
    {
        next_actions.push("Open Developer Diagnostics".to_string());
    }
    if helper_status.provider_ready
        && helper_status.cuda_ready
        && !missing.iter().any(|item| item == "cuda")
    {
        next_actions.retain(|action| action != "Continue with CPU fallback if models are ready");
    }
    let ok = helper_status.provider_ready && input_status.prepared;
    if ok {
        missing.clear();
        next_actions = vec!["Start Voice Capture".to_string()];
    }
    VoiceCapturePreparationReport {
        ok,
        state,
        microphone_ready: input_status.prepared,
        helper_state: helper_status.state.clone(),
        helper_ready: helper_status.state == "ready",
        provider_ready: helper_status.provider_ready,
        cuda_ready: helper_status.cuda_ready,
        missing,
        next_actions,
        message: if ok {
            "Voice capture is ready.".to_string()
        } else {
            message
        },
        input_status,
        helper_status,
    }
}

#[tauri::command]
pub fn start_capture() -> CommandResult {
    let status = get_helper_bridge_status();
    if !status.provider_ready {
        let _ = cancel_helper_bridge_task();
        return CommandResult::blocked(
            LifecycleState::ConversionPending,
            format!(
                "Voice capture is blocked until helper provider readiness is verified. State: {}; CUDA: {}; provider: {}; next: Start Helper, Check Worker Status, Open Developer Diagnostics.",
                compact_preview_text(&status.state),
                status.cuda_ready,
                status.provider_ready
            ),
        );
    }
    let _ = cancel_helper_bridge_task();
    engine::start_capture()
}

#[tauri::command]
pub fn stop_capture() -> CommandResult {
    let _ = cancel_helper_bridge_task();
    engine::stop_capture()
}

#[tauri::command]
pub fn get_model_inventory() -> ModelInventoryReport {
    let project_paths = ProjectPaths::discover();
    let (items, blockers, status) = build_model_inventory(&project_paths);
    let report = ModelInventoryReport {
        ok: blockers.is_empty(),
        status,
        created_at: now_iso(),
        items,
        blockers: blockers.clone(),
        note: if blockers.is_empty() {
            "All required model entries are present in the local model manifest and runtime assets are visible.".to_string()
        } else {
            "One or more required models are missing or have no declared download source."
                .to_string()
        },
    };
    write_validation_json(&project_paths, "latest_model_inventory.json", &report);
    report
}

#[tauri::command]
pub fn verify_models() -> ModelInventoryReport {
    get_model_inventory()
}

#[tauri::command]
pub fn setup_models() -> ModelSetupReport {
    let project_paths = ProjectPaths::discover();
    let (items, blockers, status) = build_model_inventory(&project_paths);
    let output_dir = PathBuf::from(&project_paths.user_cache_dir)
        .join("validation")
        .to_string_lossy()
        .replace('\\', "/");
    let report = ModelSetupReport {
        ok: blockers.is_empty(),
        status: status.clone(),
        created_at: now_iso(),
        output_dir,
        items,
        blockers: blockers.clone(),
        note: if blockers.is_empty() {
            "Model setup is already complete locally.".to_string()
        } else {
            "Model setup is blocked because at least one required model has no download source or is missing.".to_string()
        },
    };
    write_validation_json(&project_paths, "latest_model_setup.json", &report);
    report
}

#[tauri::command]
pub fn get_gpu_policy() -> GpuPolicyReport {
    let report = NativeCudaBackendValidationReport::validate_ctranslate2_cuda_candidate();
    let gpu_primary = report.ready;
    let cpu_fallback_active = report.cpu_degraded_available;
    let status = if report.ready {
        "PASS"
    } else if cpu_fallback_active {
        "PARTIAL"
    } else {
        "BLOCKED"
    };
    GpuPolicyReport {
        ok: report.ready || cpu_fallback_active,
        status: status.to_string(),
        cuda_available: report.nvidia_smi_available,
        gpu_primary,
        cpu_fallback_active,
        preferred_backend: report.preferred_device,
        notes: report.notes,
        blocker: report.blocker,
    }
}
