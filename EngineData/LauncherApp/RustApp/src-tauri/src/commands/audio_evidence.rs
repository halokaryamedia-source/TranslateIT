use std::fs;
use std::path::PathBuf;
use std::time::UNIX_EPOCH;

use serde_json::{json, Value};

use crate::engine::paths::ProjectPaths;

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

    let modified_unix_ms = fs::metadata(&evidence_path)
        .and_then(|metadata| metadata.modified())
        .ok()
        .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis())
        .unwrap_or_default();

    match fs::read_to_string(&evidence_path)
        .ok()
        .and_then(|content| serde_json::from_str::<Value>(&content).ok())
    {
        Some(mut payload) => {
            if let Some(object) = payload.as_object_mut() {
                object.insert("evidence_unix_ms".to_string(), json!(modified_unix_ms));
            }
            payload
        }
        None => json!({
            "ok": false,
            "stage": "audio_pipeline_evidence_invalid",
            "blocker": "audio_pipeline:evidence_invalid",
            "evidence_unix_ms": modified_unix_ms
        }),
    }
}
