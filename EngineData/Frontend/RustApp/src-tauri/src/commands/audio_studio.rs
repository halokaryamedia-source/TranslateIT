use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs::{self, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::engine::paths::ProjectPaths;

const MAX_TAKE_ID_LENGTH: usize = 160;
const MAX_TAKE_TITLE_LENGTH: usize = 120;
const MAX_TAKE_DETAIL_LENGTH: usize = 500;
const MAX_TAKE_INDEX_FILE_BYTES: u64 = 1_000_000;
const MAX_TAKE_COUNT: usize = 500;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioStudioTakeRequest {
    pub take_id: Option<String>,
    pub source: String,
    pub title: String,
    pub detail: String,
    pub file_name: Option<String>,
    pub size_bytes: Option<u64>,
    pub reading_line_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioStudioStateUpdateRequest {
    pub take_id: String,
    pub state: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioStudioTakeRecord {
    pub schema_version: u32,
    pub take_id: String,
    pub source: String,
    pub state: String,
    pub title: String,
    pub detail: String,
    pub file_name: Option<String>,
    pub size_bytes: Option<u64>,
    pub reading_line_id: Option<String>,
    pub created_unix_ms: u128,
    pub updated_unix_ms: u128,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioStudioTakeIndex {
    pub schema_version: u32,
    pub updated_unix_ms: u128,
    pub takes: Vec<AudioStudioTakeRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioStudioCommandResult {
    pub ok: bool,
    pub state: String,
    pub message: String,
    pub evidence_required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioStudioTakeListResult {
    pub ok: bool,
    pub state: String,
    pub message: String,
    pub evidence_required: bool,
    pub takes: Vec<AudioStudioTakeRecord>,
}

fn result(ok: bool, state: &str, message: &str) -> AudioStudioCommandResult {
    AudioStudioCommandResult {
        ok,
        state: state.to_string(),
        message: message.to_string(),
        evidence_required: true,
    }
}

fn list_result(
    ok: bool,
    state: &str,
    message: &str,
    takes: Vec<AudioStudioTakeRecord>,
) -> AudioStudioTakeListResult {
    AudioStudioTakeListResult {
        ok,
        state: state.to_string(),
        message: message.to_string(),
        evidence_required: true,
        takes,
    }
}

fn current_unix_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

fn is_valid_length(value: &str, max: usize) -> bool {
    value.chars().count() <= max
}

fn normalize_text(value: &str, max: usize, fallback: &str) -> String {
    let normalized = value
        .chars()
        .map(|ch| if ch.is_control() { ' ' } else { ch })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    let safe = if normalized.trim().is_empty() {
        fallback.to_string()
    } else {
        normalized
    };
    if safe.chars().count() <= max {
        safe
    } else {
        safe.chars().take(max.saturating_sub(1)).collect::<String>() + "…"
    }
}

fn normalize_optional_text(value: Option<String>, max: usize) -> Option<String> {
    value
        .as_deref()
        .map(|raw| normalize_text(raw, max, ""))
        .filter(|normalized| !normalized.trim().is_empty())
}

fn sanitize_take_id(value: &str) -> String {
    value
        .trim()
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '_'
            }
        })
        .take(MAX_TAKE_ID_LENGTH)
        .collect::<String>()
}

fn validate_take_request(request: &AudioStudioTakeRequest) -> Option<AudioStudioCommandResult> {
    let allowed_sources = ["import", "guided_reading"];
    if let Some(take_id) = &request.take_id {
        if take_id.trim().is_empty() || !is_valid_length(take_id, MAX_TAKE_ID_LENGTH) {
            return Some(result(
                false,
                "invalid_request",
                "Audio Studio request has an invalid take id.",
            ));
        }
    }
    if !allowed_sources.contains(&request.source.as_str()) {
        return Some(result(
            false,
            "invalid_request",
            "Audio Studio request has an unsupported source.",
        ));
    }
    if request.title.trim().is_empty() {
        return Some(result(
            false,
            "invalid_request",
            "Audio Studio request is missing a title.",
        ));
    }
    if !is_valid_length(&request.title, MAX_TAKE_TITLE_LENGTH) {
        return Some(result(
            false,
            "invalid_request",
            "Audio Studio request title is too long.",
        ));
    }
    if request.detail.trim().is_empty() {
        return Some(result(
            false,
            "invalid_request",
            "Audio Studio request is missing detail text.",
        ));
    }
    if !is_valid_length(&request.detail, MAX_TAKE_DETAIL_LENGTH) {
        return Some(result(
            false,
            "invalid_request",
            "Audio Studio request detail text is too long.",
        ));
    }
    if let Some(file_name) = &request.file_name {
        if !is_valid_length(file_name, MAX_TAKE_TITLE_LENGTH) {
            return Some(result(
                false,
                "invalid_request",
                "Audio Studio request file name is too long.",
            ));
        }
    }
    if let Some(reading_line_id) = &request.reading_line_id {
        if reading_line_id.trim().is_empty()
            || !is_valid_length(reading_line_id, MAX_TAKE_ID_LENGTH)
        {
            return Some(result(
                false,
                "invalid_request",
                "Audio Studio request has an invalid reading line id.",
            ));
        }
    }
    None
}

fn validate_state_request(
    request: &AudioStudioStateUpdateRequest,
) -> Option<AudioStudioCommandResult> {
    if request.take_id.trim().is_empty() || !is_valid_length(&request.take_id, MAX_TAKE_ID_LENGTH) {
        return Some(result(
            false,
            "invalid_request",
            "Audio Studio state update has an invalid take id.",
        ));
    }
    let allowed = ["draft", "staged", "accepted", "needs_retry", "blocked"];
    if !allowed.contains(&request.state.as_str()) {
        return Some(result(
            false,
            "invalid_request",
            "Audio Studio state update has an unsupported state.",
        ));
    }
    None
}

fn audio_studio_cache_dir() -> PathBuf {
    PathBuf::from(ProjectPaths::discover().user_cache_dir).join("AudioStudio")
}

fn audio_studio_saved_dir() -> PathBuf {
    PathBuf::from(ProjectPaths::discover().user_saved_dir).join("AudioStudio")
}

fn audio_studio_log_dir() -> PathBuf {
    audio_studio_cache_dir().join("logs")
}

fn take_index_path() -> PathBuf {
    audio_studio_cache_dir().join("takes.json")
}

fn project_metadata_path() -> PathBuf {
    audio_studio_saved_dir().join("project_metadata.json")
}

fn evidence_log_path() -> PathBuf {
    audio_studio_log_dir().join("evidence.jsonl")
}

fn file_too_large(path: &Path, max_bytes: u64) -> bool {
    path.metadata()
        .map(|metadata| metadata.len() > max_bytes)
        .unwrap_or(false)
}

fn read_take_index() -> AudioStudioTakeIndex {
    let path = take_index_path();
    if file_too_large(&path, MAX_TAKE_INDEX_FILE_BYTES) {
        return empty_take_index();
    }
    fs::read_to_string(path)
        .ok()
        .and_then(|raw| serde_json::from_str::<AudioStudioTakeIndex>(&raw).ok())
        .map(sanitize_take_index)
        .unwrap_or_else(empty_take_index)
}

fn empty_take_index() -> AudioStudioTakeIndex {
    AudioStudioTakeIndex {
        schema_version: 1,
        updated_unix_ms: current_unix_ms(),
        takes: Vec::new(),
    }
}

fn sanitize_take_index(mut index: AudioStudioTakeIndex) -> AudioStudioTakeIndex {
    index.schema_version = index.schema_version.max(1);
    for take in &mut index.takes {
        take.schema_version = take.schema_version.max(1);
        take.take_id = sanitize_take_id(&take.take_id);
        take.title = normalize_text(&take.title, MAX_TAKE_TITLE_LENGTH, "Untitled take");
        take.detail = normalize_text(&take.detail, MAX_TAKE_DETAIL_LENGTH, "Audio Studio take");
        take.file_name = normalize_optional_text(take.file_name.clone(), MAX_TAKE_TITLE_LENGTH);
        take.reading_line_id =
            normalize_optional_text(take.reading_line_id.clone(), MAX_TAKE_ID_LENGTH);
    }
    index.takes.retain(|take| !take.take_id.trim().is_empty());
    index
        .takes
        .sort_by_key(|take| std::cmp::Reverse(take.updated_unix_ms));
    index.takes.truncate(MAX_TAKE_COUNT);
    index
}

fn write_pretty_json<T: Serialize>(path: &Path, value: &T) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let body = serde_json::to_string_pretty(value)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    let temp_path = path.with_extension("json.tmp");
    fs::write(&temp_path, body)?;
    match fs::rename(&temp_path, path) {
        Ok(()) => Ok(()),
        Err(error) => {
            if path.exists() {
                fs::remove_file(path)?;
                fs::rename(&temp_path, path)
            } else {
                let _ = fs::remove_file(&temp_path);
                Err(error)
            }
        }
    }
}

fn write_take_index(index: &AudioStudioTakeIndex) -> io::Result<()> {
    write_pretty_json(&take_index_path(), &sanitize_take_index(index.clone()))
}

fn append_evidence(event: &str, payload: serde_json::Value) -> io::Result<()> {
    fs::create_dir_all(audio_studio_log_dir())?;
    let record = json!({
        "schema": "translateit.audio_studio_evidence_event.v1",
        "event": event,
        "created_unix_ms": current_unix_ms(),
        "payload": payload,
        "runtime_claim": "project_data_only_provider_not_ready"
    });
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(evidence_log_path())?;
    writeln!(file, "{}", record)
}

fn upsert_take(
    request: AudioStudioTakeRequest,
    default_state: &str,
) -> io::Result<AudioStudioTakeRecord> {
    let now = current_unix_ms();
    let mut index = read_take_index();
    let take_id = request
        .take_id
        .as_deref()
        .map(sanitize_take_id)
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| format!("take_{}_{}", now, std::process::id()));
    let title = normalize_text(&request.title, MAX_TAKE_TITLE_LENGTH, "Untitled take");
    let detail = normalize_text(&request.detail, MAX_TAKE_DETAIL_LENGTH, "Audio Studio take");

    let mut record = AudioStudioTakeRecord {
        schema_version: 1,
        take_id: take_id.clone(),
        source: request.source,
        state: default_state.to_string(),
        title,
        detail,
        file_name: normalize_optional_text(request.file_name, MAX_TAKE_TITLE_LENGTH),
        size_bytes: request.size_bytes,
        reading_line_id: normalize_optional_text(request.reading_line_id, MAX_TAKE_ID_LENGTH),
        created_unix_ms: now,
        updated_unix_ms: now,
    };

    if let Some(existing) = index.takes.iter_mut().find(|take| take.take_id == take_id) {
        record.created_unix_ms = existing.created_unix_ms;
        *existing = record.clone();
    } else {
        index.takes.push(record.clone());
    }
    index.updated_unix_ms = now;
    write_take_index(&index)?;
    append_evidence(
        "take_upserted",
        json!({
            "take_id": record.take_id,
            "source": record.source,
            "state": record.state,
            "file_name": record.file_name,
            "size_bytes": record.size_bytes,
            "reading_line_id": record.reading_line_id
        }),
    )?;
    Ok(record)
}

#[tauri::command]
pub fn audio_studio_get_provider_status() -> AudioStudioCommandResult {
    let index = read_take_index();
    let staged_count = index
        .takes
        .iter()
        .filter(|take| take.state == "staged")
        .count();
    let accepted_count = index
        .takes
        .iter()
        .filter(|take| take.state == "accepted")
        .count();
    let _ = append_evidence(
        "provider_status_checked",
        json!({
            "take_count": index.takes.len(),
            "staged_take_count": staged_count,
            "accepted_take_count": accepted_count,
            "provider_state": "provider_blocked",
            "blocked_until": [
                "guided_microphone_capture",
                "audio_quality_measurement",
                "profile_processing",
                "generated_audio_output",
                "streaming_generation"
            ]
        }),
    );
    result(false, "provider_blocked", "Audio Studio provider processing is not connected yet. Project metadata is available, but guided capture, quality scoring, generated audio, and streaming generation still require runtime implementation and target-PC evidence.")
}

#[tauri::command]
pub fn audio_studio_get_quality_gate_status() -> AudioStudioCommandResult {
    let index = read_take_index();
    let accepted_count = index
        .takes
        .iter()
        .filter(|take| take.state == "accepted")
        .count();
    let retry_count = index
        .takes
        .iter()
        .filter(|take| take.state == "needs_retry")
        .count();
    let blocked_count = index
        .takes
        .iter()
        .filter(|take| take.state == "blocked")
        .count();
    let _ = append_evidence(
        "quality_gate_status_checked",
        json!({
            "take_count": index.takes.len(),
            "accepted_take_count": accepted_count,
            "needs_retry_take_count": retry_count,
            "blocked_take_count": blocked_count,
            "quality_state": "provider_blocked",
            "score_available": false,
            "blocked_until": [
                "audio_quality_measurement",
                "noise_floor_measurement",
                "speech_confidence_measurement",
                "clip_peak_detection",
                "target_pc_audio_evidence"
            ]
        }),
    );
    result(false, "provider_blocked", "Audio Studio quality gate is metadata-only. No real quality score is available until microphone/audio analysis and target-PC evidence are implemented.")
}

#[tauri::command]
pub fn audio_studio_import_take(request: AudioStudioTakeRequest) -> AudioStudioCommandResult {
    if let Some(error) = validate_take_request(&request) {
        return error;
    }
    match upsert_take(request, "staged") {
        Ok(record) => result(true, "metadata_ready", &format!("Audio Studio import metadata saved for take {}. Provider processing is still not connected.", record.take_id)),
        Err(_) => result(false, "blocked", "Audio Studio failed to save import metadata under UserData."),
    }
}

#[tauri::command]
pub fn audio_studio_stage_guided_take(request: AudioStudioTakeRequest) -> AudioStudioCommandResult {
    if let Some(error) = validate_take_request(&request) {
        return error;
    }
    match upsert_take(request, "draft") {
        Ok(record) => result(true, "metadata_ready", &format!("Audio Studio guided reading metadata saved for take {}. Recording/provider capture is still not connected.", record.take_id)),
        Err(_) => result(false, "blocked", "Audio Studio failed to save guided reading metadata under UserData."),
    }
}

#[tauri::command]
pub fn audio_studio_update_take_state(
    request: AudioStudioStateUpdateRequest,
) -> AudioStudioCommandResult {
    if let Some(error) = validate_state_request(&request) {
        return error;
    }
    let mut index = read_take_index();
    let clean_take_id = sanitize_take_id(&request.take_id);
    let Some(take) = index
        .takes
        .iter_mut()
        .find(|take| take.take_id == clean_take_id)
    else {
        return result(
            false,
            "invalid_request",
            "Audio Studio take was not found in project metadata.",
        );
    };
    take.state = request.state.clone();
    take.updated_unix_ms = current_unix_ms();
    index.updated_unix_ms = current_unix_ms();
    match write_take_index(&index).and_then(|_| {
        append_evidence(
            "take_state_updated",
            json!({ "take_id": clean_take_id, "state": request.state }),
        )
    }) {
        Ok(()) => result(
            true,
            "metadata_ready",
            "Audio Studio take state saved under UserData.",
        ),
        Err(_) => result(
            false,
            "blocked",
            "Audio Studio failed to save take state under UserData.",
        ),
    }
}

#[tauri::command]
pub fn audio_studio_list_takes() -> AudioStudioTakeListResult {
    let index = read_take_index();
    list_result(
        true,
        "metadata_ready",
        "Audio Studio take metadata loaded from UserData.",
        index.takes,
    )
}

#[tauri::command]
pub fn audio_studio_export_project_metadata() -> AudioStudioCommandResult {
    let index = read_take_index();
    let accepted_count = index
        .takes
        .iter()
        .filter(|take| take.state == "accepted")
        .count();
    let metadata = json!({
        "schema": "translateit.audio_studio_project_metadata.v1",
        "exported_unix_ms": current_unix_ms(),
        "take_count": index.takes.len(),
        "accepted_take_count": accepted_count,
        "takes_path": take_index_path().to_string_lossy().replace('\\', "/"),
        "evidence_log_path": evidence_log_path().to_string_lossy().replace('\\', "/"),
        "runtime_claim": "project_data_only_provider_not_ready",
        "takes": index.takes,
    });
    match write_pretty_json(&project_metadata_path(), &metadata)
        .and_then(|_| append_evidence("project_metadata_exported", json!({ "path": project_metadata_path().to_string_lossy().replace('\\', "/") })))
    {
        Ok(()) => result(true, "metadata_ready", "Audio Studio project metadata exported under UserData/SavedProject/AudioStudio. Provider processing is still not connected."),
        Err(_) => result(false, "blocked", "Audio Studio failed to export project metadata under UserData/SavedProject."),
    }
}
