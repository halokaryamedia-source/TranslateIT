use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

use serde_json::{json, Value};

use crate::engine::paths::ProjectPaths;

const MAX_EVIDENCE_FILE_BYTES: u64 = 1_000_000;

fn modified_unix_ms(path: &Path) -> u128 {
    fs::metadata(path)
        .and_then(|metadata| metadata.modified())
        .ok()
        .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

fn normalized_path_label(path: &Path) -> String {
    path.to_string_lossy().replace(char::from(92), "/")
}

fn read_json_value(path: &Path) -> Option<Value> {
    let metadata = fs::metadata(path).ok()?;
    if metadata.len() > MAX_EVIDENCE_FILE_BYTES {
        return None;
    }
    fs::read_to_string(path)
        .ok()
        .and_then(|content| serde_json::from_str::<Value>(&content).ok())
}

#[tauri::command]
pub fn get_latest_audio_pipeline_evidence() -> Value {
    let project_paths = ProjectPaths::discover();
    let evidence_path = PathBuf::from(project_paths.user_log_dir)
        .join("RustAppValidation")
        .join("latest_audio_pipeline_evidence.json");
    if !evidence_path.is_file() {
        return json!({
            "ok": false,
            "stage": "audio_pipeline_evidence_missing",
            "blocker": "audio_pipeline:evidence_missing"
        });
    }

    let evidence_unix_ms = modified_unix_ms(&evidence_path);

    match read_json_value(&evidence_path) {
        Some(mut payload) => {
            if let Some(object) = payload.as_object_mut() {
                object.insert("evidence_unix_ms".to_string(), json!(evidence_unix_ms));
            }
            payload
        }
        None => json!({
            "ok": false,
            "stage": "audio_pipeline_evidence_invalid",
            "blocker": "audio_pipeline:evidence_invalid_or_too_large",
            "evidence_unix_ms": evidence_unix_ms
        }),
    }
}

fn latest_matching_file(dir: &Path, suffix: &str) -> Option<PathBuf> {
    fs::read_dir(dir)
        .ok()?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.is_file())
        .filter(|path| path.file_name().and_then(|name| name.to_str()).map(|name| name.ends_with(suffix)).unwrap_or(false))
        .max_by_key(|path| modified_unix_ms(path))
}

#[tauri::command]
pub fn get_latest_audio_studio_validation_evidence() -> Value {
    let project_paths = ProjectPaths::discover();
    let evidence_dir = PathBuf::from(project_paths.user_cache_dir)
        .join("AudioStudio")
        .join("logs");
    if !evidence_dir.is_dir() {
        return json!({
            "ok": false,
            "stage": "audio_studio_validation_evidence_missing",
            "blocker": "audio_studio:evidence_dir_missing",
            "evidence_dir": normalized_path_label(&evidence_dir)
        });
    }

    let summary_path = latest_matching_file(&evidence_dir, ".summary.json");
    let log_path = latest_matching_file(&evidence_dir, ".log");
    let Some(summary_path) = summary_path else {
        return json!({
            "ok": false,
            "stage": "audio_studio_validation_summary_missing",
            "blocker": "audio_studio:summary_missing",
            "evidence_dir": normalized_path_label(&evidence_dir)
        });
    };

    let summary_unix_ms = modified_unix_ms(&summary_path);
    match read_json_value(&summary_path) {
        Some(summary) => json!({
            "ok": true,
            "stage": "audio_studio_validation_summary_loaded",
            "summary_path": normalized_path_label(&summary_path),
            "log_path": log_path.map(|path| normalized_path_label(&path)),
            "evidence_unix_ms": summary_unix_ms,
            "summary": summary
        }),
        None => json!({
            "ok": false,
            "stage": "audio_studio_validation_summary_invalid",
            "blocker": "audio_studio:summary_invalid_or_too_large",
            "summary_path": normalized_path_label(&summary_path),
            "evidence_unix_ms": summary_unix_ms
        }),
    }
}
