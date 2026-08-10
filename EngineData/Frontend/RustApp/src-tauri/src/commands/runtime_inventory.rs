use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

use crate::engine::inference::backend_validation::NativeCudaBackendValidationReport;
use crate::engine::paths::ProjectPaths;

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

#[derive(Debug, Clone, serde::Deserialize)]
struct ModelManifest {
    #[allow(dead_code)]
    schema: Option<String>,
    #[allow(dead_code)]
    backend_policy: Option<BackendPolicy>,
    models: Vec<ModelManifestEntry>,
}

#[derive(Debug, Clone, serde::Deserialize)]
struct BackendPolicy {
    #[allow(dead_code)]
    gpu_primary: Option<bool>,
    #[allow(dead_code)]
    cpu_fallback_allowed: Option<bool>,
    #[allow(dead_code)]
    cpu_fallback_label: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize)]
struct ModelManifestEntry {
    model_id: String,
    required: bool,
    #[allow(dead_code)]
    stage: String,
    #[allow(dead_code)]
    backend: String,
    expected_path: String,
    gpu_capable: Option<bool>,
    cpu_fallback: Option<bool>,
    download_url: Option<String>,
    #[allow(dead_code)]
    checksum: Option<String>,
    #[allow(dead_code)]
    license: Option<String>,
    #[allow(dead_code)]
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
        blockers.push("model_inventory:manifest_missing_or_invalid".to_string());
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

            let metadata_incomplete = entry.download_url.is_none();
            let status = if found {
                "installed"
            } else if entry.required {
                "missing_required"
            } else if metadata_incomplete {
                "missing_optional_metadata_incomplete"
            } else {
                "missing_optional"
            };
            let blocker = if !found && entry.required {
                Some(format!("missing_required_model:{}", entry.model_id))
            } else {
                None
            };
            let next_action = if found {
                "Installed asset path detected. Runtime load/inference must be checked separately."
                    .to_string()
            } else if entry.download_url.is_some() {
                format!(
                    "Install {} at {} through the approved runtime/release asset flow.",
                    entry.model_id, entry.expected_path
                )
            } else {
                format!(
                    "Define reproducible source metadata and install {} at {} through the approved runtime/release asset flow.",
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

    let status = if blockers.is_empty() {
        "installed_required_assets"
    } else if blockers
        .iter()
        .any(|blocker| blocker.starts_with("missing_required_model:"))
    {
        "missing_required_assets"
    } else {
        "inventory_unavailable"
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
            "All model assets marked required by the manifest are present. Optional direction/fallback assets may still be missing. This is installation evidence only; it does not prove model load, inference, quality, latency, or CUDA use."
                .to_string()
        } else {
            "One or more manifest-required model assets are missing. Optional assets do not determine this required-assets status. Inventory results describe installation state only and must not be promoted into runtime readiness."
                .to_string()
        },
    };
    write_validation_json(&project_paths, "latest_model_inventory.json", &report);
    report
}

pub fn verify_models() -> ModelInventoryReport {
    get_model_inventory()
}

pub fn setup_models() -> ModelSetupReport {
    let project_paths = ProjectPaths::discover();
    let (items, blockers, status) = build_model_inventory(&project_paths);
    let output_dir = PathBuf::from(&project_paths.user_cache_dir)
        .join("validation")
        .to_string_lossy()
        .replace('\\', "/");
    let report = ModelSetupReport {
        ok: blockers.is_empty(),
        status,
        created_at: now_iso(),
        output_dir,
        items,
        blockers: blockers.clone(),
        note: "Compatibility command: this operation only inspects manifest-required versus optional asset presence and writes diagnostic evidence. It does not download, install, load, or verify inference for any model."
            .to_string(),
    };
    write_validation_json(&project_paths, "latest_model_setup.json", &report);
    report
}

pub fn get_gpu_policy() -> GpuPolicyReport {
    let report = NativeCudaBackendValidationReport::validate_ctranslate2_cuda_candidate();
    let gpu_primary = report.ready;
    let cpu_fallback_active = report.cpu_degraded_available;
    let status = if report.ready {
        "native_candidate_available"
    } else if cpu_fallback_active {
        "native_candidate_degraded"
    } else {
        "native_candidate_unavailable"
    };
    GpuPolicyReport {
        ok: report.ready || cpu_fallback_active,
        status: status.to_string(),
        cuda_available: report.nvidia_smi_available,
        gpu_primary,
        cpu_fallback_active,
        preferred_backend: report.preferred_device,
        notes: {
            let mut notes = report.notes;
            notes.push("Diagnostic native-backend candidate only. Active Python worker capability/device state is the runtime truth for current ASR/translation/TTS execution.".to_string());
            notes
        },
        blocker: report.blocker,
    }
}
