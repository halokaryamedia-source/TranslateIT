use serde::Serialize;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::engine::models::SavedSessionPayload;
use crate::engine::paths::ProjectPaths;
use crate::engine::transcript_session::TranscriptSessionRecord;

const MAX_SESSION_ID_CHARS: usize = 96;
const MAX_SAVED_SESSION_FILE_BYTES: usize = 1_000_000;

#[derive(Debug, Clone, Serialize)]
pub struct SessionSaveResult {
    pub ok: bool,
    pub session_id: String,
    pub output_path: String,
    pub segment_count: usize,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SessionSavePreview {
    pub session_id: String,
    pub output_path: String,
    pub segment_count: usize,
    pub ready: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SessionStoreStatus {
    pub output_dir: String,
    pub ready: bool,
    pub note: String,
}

pub fn current_session_store_status() -> SessionStoreStatus {
    let output_dir = saved_session_dir();
    SessionStoreStatus {
        output_dir: normalize_path(&output_dir),
        ready: output_dir.parent().is_some(),
        note: "Rust transcript session store path is resolved. Saving writes transcript JSON payloads under UserData.".to_string(),
    }
}

pub fn preview_session_save(payload: &SavedSessionPayload) -> SessionSavePreview {
    let session_id = sanitize_session_id(&payload.session_id);
    preview_by_parts(session_id, payload.segments.len())
}

pub fn preview_transcript_session_save(session: &TranscriptSessionRecord) -> SessionSavePreview {
    let session_id = sanitize_session_id(&session.session_id);
    preview_by_parts(session_id, session.segments.len())
}

pub fn save_session_payload(mut payload: SavedSessionPayload) -> SessionSaveResult {
    let session_id = sanitize_session_id(&payload.session_id);
    payload.session_id = session_id.clone();
    if payload.created_unix_ms == 0 {
        payload.created_unix_ms = current_unix_ms();
    }
    let segment_count = payload.segments.len();
    let output_path = saved_session_dir().join(format!("{session_id}.json"));
    let output_label = normalize_path(&output_path);

    match write_pretty_json(&output_path, &payload) {
        Ok(()) => SessionSaveResult {
            ok: true,
            session_id,
            output_path: output_label.clone(),
            segment_count,
            message: "Rust session payload saved.".to_string(),
        },
        Err(_error) => SessionSaveResult {
            ok: false,
            session_id,
            output_path: output_label,
            segment_count,
            message: "Failed to save Rust session payload. Open Developer diagnostics for details.".to_string(),
        },
    }
}

fn preview_by_parts(session_id: String, segment_count: usize) -> SessionSavePreview {
    let output_path = saved_session_dir().join(format!("{session_id}.json"));
    let output_label = normalize_path(&output_path);
    SessionSavePreview {
        session_id,
        output_path: output_label,
        segment_count,
        ready: output_path.parent().is_some(),
        message: "Rust session payload save path is ready.".to_string(),
    }
}

fn saved_session_dir() -> PathBuf {
    let project_paths = ProjectPaths::discover();
    PathBuf::from(project_paths.user_saved_dir).join("SavedTranscript")
}

fn write_pretty_json<T: Serialize>(path: &Path, value: &T) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let body = serde_json::to_string_pretty(value)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    if body.len() > MAX_SAVED_SESSION_FILE_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "serialized transcript session exceeds safe file size limit",
        ));
    }
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

fn sanitize_session_id(value: &str) -> String {
    let cleaned = value
        .trim()
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' { ch } else { '_' })
        .take(MAX_SESSION_ID_CHARS)
        .collect::<String>();
    if cleaned.is_empty() {
        format!("session_{}", current_unix_ms())
    } else {
        cleaned
    }
}

fn current_unix_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

fn normalize_path(path: &Path) -> String {
    path.to_string_lossy().replace(char::from(92), "/")
}
