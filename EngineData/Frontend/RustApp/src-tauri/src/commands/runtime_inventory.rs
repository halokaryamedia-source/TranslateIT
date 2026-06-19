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
    schema: Option<String>,
    backend_policy: Option<BackendPolicy>,
    models: Vec<ModelManifestEntry>,
}

#[derive(Debug, Clone, serde::Deserialize)]
struct BackendPolicy {
    gpu_primary: Option<bool>,
    cpu_fallback_allowed: Option<bool>,
    cpu_fallback_label: Option<String>,
}

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
            "One or more required models are missing or have no declared download source.".to_string()
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
