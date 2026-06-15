use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::engine::models::SavedSessionPayload;
use crate::engine::paths::ProjectPaths;
use crate::engine::transcript_session::TranscriptSessionRecord;

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LauncherChatMessage {
    pub role: String,
    pub content: String,
    pub created_unix_ms: u128,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LauncherChatSession {
    pub schema_version: u32,
    pub session_id: String,
    pub title: String,
    pub kind: String,
    pub created_unix_ms: u128,
    pub updated_unix_ms: u128,
    pub messages: Vec<LauncherChatMessage>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LauncherChatSummary {
    pub session_id: String,
    pub title: String,
    pub kind: String,
    pub updated_unix_ms: u128,
    pub message_count: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct LauncherChatActionResult {
    pub ok: bool,
    pub session_id: String,
    pub message: String,
}

pub fn current_session_store_status() -> SessionStoreStatus {
    let output_dir = saved_session_dir();
    SessionStoreStatus {
        output_dir: normalize_path(&output_dir),
        ready: output_dir.parent().is_some(),
        note: "Rust session store path is resolved. Saving writes JSON payloads under UserData.".to_string(),
    }
}

pub fn create_launcher_chat(kind: String) -> LauncherChatSession {
    let now = current_unix_ms();
    let session = LauncherChatSession {
        schema_version: 1,
        session_id: format!("chat_{now}"),
        title: "New Chat".to_string(),
        kind: sanitize_kind(&kind),
        created_unix_ms: now,
        updated_unix_ms: now,
        messages: Vec::new(),
    };
    let _ = write_launcher_chat(&session);
    session
}

pub fn list_launcher_chats(kind: Option<String>) -> Vec<LauncherChatSummary> {
    let filter = kind.map(|value| sanitize_kind(&value));
    let mut rows = Vec::new();
    if let Ok(entries) = fs::read_dir(launcher_chat_dir()) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|value| value.to_str()) != Some("json") {
                continue;
            }
            let Ok(raw) = fs::read_to_string(path) else { continue };
            let Ok(session) = serde_json::from_str::<LauncherChatSession>(&raw) else { continue };
            if let Some(filter_kind) = &filter {
                if &session.kind != filter_kind {
                    continue;
                }
            }
            rows.push(LauncherChatSummary {
                session_id: session.session_id,
                title: session.title,
                kind: session.kind,
                updated_unix_ms: session.updated_unix_ms,
                message_count: session.messages.len(),
            });
        }
    }
    rows.sort_by(|a, b| b.updated_unix_ms.cmp(&a.updated_unix_ms));
    rows
}

pub fn append_launcher_chat_message(session_id: String, role: String, content: String) -> LauncherChatActionResult {
    let clean_session_id = sanitize_session_id(&session_id);
    let clean_content = content.trim().to_string();
    if clean_content.is_empty() {
        return LauncherChatActionResult { ok: false, session_id: clean_session_id, message: "Cannot save an empty chat message.".to_string() };
    }

    let path = launcher_chat_dir().join(format!("{clean_session_id}.json"));
    let mut session = fs::read_to_string(&path)
        .ok()
        .and_then(|raw| serde_json::from_str::<LauncherChatSession>(&raw).ok())
        .unwrap_or_else(|| LauncherChatSession {
            schema_version: 1,
            session_id: clean_session_id.clone(),
            title: title_from_message(&clean_content),
            kind: "unsaved".to_string(),
            created_unix_ms: current_unix_ms(),
            updated_unix_ms: current_unix_ms(),
            messages: Vec::new(),
        });

    let clean_role = sanitize_role(&role);
    if session.title == "New Chat" && clean_role == "user" {
        session.title = title_from_message(&clean_content);
    }
    session.messages.push(LauncherChatMessage { role: clean_role, content: clean_content, created_unix_ms: current_unix_ms() });
    session.updated_unix_ms = current_unix_ms();

    match write_launcher_chat(&session) {
        Ok(()) => LauncherChatActionResult { ok: true, session_id: session.session_id, message: "Chat message saved.".to_string() },
        Err(error) => LauncherChatActionResult { ok: false, session_id: session.session_id, message: format!("Failed to save chat message: {error}") },
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
            message: format!("Rust session payload saved to {output_label}"),
        },
        Err(error) => SessionSaveResult {
            ok: false,
            session_id,
            output_path: output_label,
            segment_count,
            message: format!("Failed to save Rust session payload: {error}"),
        },
    }
}

fn preview_by_parts(session_id: String, segment_count: usize) -> SessionSavePreview {
    let output_path = saved_session_dir().join(format!("{session_id}.json"));
    let output_label = normalize_path(&output_path);
    SessionSavePreview {
        session_id,
        output_path: output_label.clone(),
        segment_count,
        ready: output_path.parent().is_some(),
        message: format!("Rust session payload will be saved to {output_label}"),
    }
}

fn saved_session_dir() -> PathBuf {
    let project_paths = ProjectPaths::discover();
    PathBuf::from(project_paths.user_saved_dir).join("SavedTranscript")
}

fn launcher_chat_dir() -> PathBuf {
    let project_paths = ProjectPaths::discover();
    PathBuf::from(project_paths.user_saved_dir).join("Chat")
}

fn write_launcher_chat(session: &LauncherChatSession) -> io::Result<()> {
    let path = launcher_chat_dir().join(format!("{}.json", sanitize_session_id(&session.session_id)));
    write_pretty_json(&path, session)
}

fn write_pretty_json<T: Serialize>(path: &Path, value: &T) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let body = serde_json::to_string_pretty(value)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    fs::write(path, body)
}

fn sanitize_session_id(value: &str) -> String {
    let cleaned = value
        .trim()
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' { ch } else { '_' })
        .collect::<String>();
    if cleaned.is_empty() {
        format!("session_{}", current_unix_ms())
    } else {
        cleaned
    }
}

fn sanitize_kind(value: &str) -> String {
    match value.trim().to_lowercase().as_str() {
        "recent" => "recent".to_string(),
        "saved" => "saved".to_string(),
        "local" => "local".to_string(),
        _ => "unsaved".to_string(),
    }
}

fn sanitize_role(value: &str) -> String {
    match value.trim().to_lowercase().as_str() {
        "assistant" => "assistant".to_string(),
        "system" => "system".to_string(),
        _ => "user".to_string(),
    }
}

fn title_from_message(value: &str) -> String {
    let title = value.split_whitespace().take(8).collect::<Vec<_>>().join(" ");
    if title.is_empty() {
        "New Chat".to_string()
    } else {
        title.chars().take(64).collect()
    }
}

fn current_unix_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

fn normalize_path(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}
