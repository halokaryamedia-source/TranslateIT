use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::engine::paths::ProjectPaths;

const MAX_SESSION_MESSAGE_CHARS: usize = 8_000;
const MAX_MESSAGES_PER_SESSION: usize = 200;
const MAX_CHAT_SESSION_FILE_BYTES: u64 = 1_000_000;
const MAX_CHAT_LIST_ROWS: usize = 200;
const MAX_CHAT_LIST_SCAN_FILES: usize = 1_000;
const MAX_TITLE_CHARS: usize = 64;
const PRIVATE_CHAT_TITLE: &str = "Private Chat";

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

pub fn create_launcher_chat(kind: String) -> LauncherChatSession {
    let now = current_unix_ms();
    let session = LauncherChatSession {
        schema_version: 1,
        session_id: format!("chat_{}_{}", now, std::process::id()),
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
        for entry in entries.flatten().take(MAX_CHAT_LIST_SCAN_FILES) {
            let path = entry.path();
            if path.extension().and_then(|value| value.to_str()) != Some("json") {
                continue;
            }
            if file_too_large(&path, MAX_CHAT_SESSION_FILE_BYTES) {
                continue;
            }
            let Ok(raw) = fs::read_to_string(path) else {
                continue;
            };
            let Ok(session) = serde_json::from_str::<LauncherChatSession>(&raw) else {
                continue;
            };
            let session = sanitize_session(session);
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
    rows.sort_by_key(|row| std::cmp::Reverse(row.updated_unix_ms));
    rows.truncate(MAX_CHAT_LIST_ROWS);
    rows
}

pub fn append_launcher_chat_message(
    session_id: String,
    role: String,
    content: String,
) -> LauncherChatActionResult {
    let clean_session_id = sanitize_session_id(&session_id);
    let clean_content = sanitize_message_content(&content);
    if clean_content.is_empty() {
        return LauncherChatActionResult {
            ok: false,
            session_id: clean_session_id,
            message: "Cannot save an empty chat message.".to_string(),
        };
    }
    let content_chars = clean_content.chars().count();
    if content_chars > MAX_SESSION_MESSAGE_CHARS {
        return LauncherChatActionResult {
            ok: false,
            session_id: clean_session_id,
            message: format!(
                "Chat message is too large to save safely. Limit: {MAX_SESSION_MESSAGE_CHARS} characters. Received: {content_chars} characters."
            ),
        };
    }

    let path = launcher_chat_dir().join(format!("{clean_session_id}.json"));
    if file_too_large(&path, MAX_CHAT_SESSION_FILE_BYTES) {
        return LauncherChatActionResult {
            ok: false,
            session_id: clean_session_id,
            message: "Chat session file is too large to modify safely. Start a new chat."
                .to_string(),
        };
    }

    let mut session = fs::read_to_string(&path)
        .ok()
        .and_then(|raw| serde_json::from_str::<LauncherChatSession>(&raw).ok())
        .map(sanitize_session)
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
    session.messages.push(LauncherChatMessage {
        role: clean_role,
        content: clean_content,
        created_unix_ms: current_unix_ms(),
    });
    session.updated_unix_ms = current_unix_ms();
    session = sanitize_session(session);

    match write_launcher_chat(&session) {
        Ok(()) => LauncherChatActionResult {
            ok: true,
            session_id: session.session_id,
            message: "Chat message saved.".to_string(),
        },
        Err(_error) => LauncherChatActionResult {
            ok: false,
            session_id: session.session_id,
            message: "Failed to save chat message. Open Developer diagnostics for details."
                .to_string(),
        },
    }
}

fn launcher_chat_dir() -> PathBuf {
    let project_paths = ProjectPaths::discover();
    PathBuf::from(project_paths.user_saved_dir).join("Chat")
}

fn write_launcher_chat(session: &LauncherChatSession) -> io::Result<()> {
    let safe_session = sanitize_session(session.clone());
    let path = launcher_chat_dir().join(format!(
        "{}.json",
        sanitize_session_id(&safe_session.session_id)
    ));
    write_pretty_json(&path, &safe_session)
}

fn write_pretty_json<T: Serialize>(path: &Path, value: &T) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let body = serde_json::to_string_pretty(value)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    if u64::try_from(body.len()).unwrap_or(u64::MAX) > MAX_CHAT_SESSION_FILE_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "serialized chat session exceeds safe file size limit",
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

fn file_too_large(path: &Path, max_bytes: u64) -> bool {
    path.metadata()
        .map(|metadata| metadata.len() > max_bytes)
        .unwrap_or(false)
}

fn sanitize_session(mut session: LauncherChatSession) -> LauncherChatSession {
    session.schema_version = session.schema_version.max(1);
    session.session_id = sanitize_session_id(&session.session_id);
    session.kind = sanitize_kind(&session.kind);
    session.title = sanitize_title(&session.title);
    for message in &mut session.messages {
        message.role = sanitize_role(&message.role);
        message.content = sanitize_message_content(&message.content);
        if message.content.chars().count() > MAX_SESSION_MESSAGE_CHARS {
            message.content = message
                .content
                .chars()
                .take(MAX_SESSION_MESSAGE_CHARS)
                .collect::<String>();
        }
    }
    session
        .messages
        .retain(|message| !message.content.trim().is_empty());
    if session.messages.len() > MAX_MESSAGES_PER_SESSION {
        let remove_count = session.messages.len() - MAX_MESSAGES_PER_SESSION;
        session.messages.drain(0..remove_count);
    }
    if session.title.trim().is_empty() {
        session.title = "New Chat".to_string();
    }
    session
}

fn sanitize_session_id(value: &str) -> String {
    let cleaned = value
        .trim()
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '_'
            }
        })
        .take(96)
        .collect::<String>();
    if cleaned.is_empty() {
        format!("session_{}_{}", current_unix_ms(), std::process::id())
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
        _ => "user".to_string(),
    }
}

fn sanitize_title(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed == "New Chat" {
        "New Chat".to_string()
    } else {
        PRIVATE_CHAT_TITLE.chars().take(MAX_TITLE_CHARS).collect()
    }
}

fn is_unsafe_message_character(character: char) -> bool {
    character == '\0'
        || ('\u{0001}'..='\u{0008}').contains(&character)
        || ('\u{000b}'..='\u{001f}').contains(&character)
        || character == '\u{007f}'
        || ('\u{202a}'..='\u{202e}').contains(&character)
        || ('\u{2066}'..='\u{2069}').contains(&character)
}

fn sanitize_message_content(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|character| !is_unsafe_message_character(*character))
        .collect::<String>()
}

fn title_from_message(_value: &str) -> String {
    PRIVATE_CHAT_TITLE.chars().take(MAX_TITLE_CHARS).collect()
}

fn current_unix_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}
