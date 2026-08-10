use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::engine::paths::ProjectPaths;

const HISTORY_SCHEMA_VERSION: u32 = 2;
const MAX_HISTORY_ENTRY_FILE_BYTES: u64 = 2_000_000;
const MAX_HISTORY_LIST_SCAN_FILES: usize = 2_000;
const MAX_HISTORY_LIST_ROWS: usize = 500;
const MAX_HISTORY_TEXT_CHARS: usize = 16_000;
const MAX_HISTORY_TITLE_CHARS: usize = 96;
const MAX_HISTORY_SNIPPET_CHARS: usize = 160;
const MAX_HISTORY_TURNS: usize = 600;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryTurn {
    pub sequence: u64,
    pub lane: String,
    pub source_text: String,
    pub translated_text: String,
    pub delivery_state: Option<String>,
    pub created_unix_ms: u128,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub schema_version: u32,
    pub entry_id: String,
    pub entry_type: String,
    pub title: String,
    pub created_unix_ms: u128,
    pub updated_unix_ms: u128,
    pub saved_unix_ms: Option<u128>,
    pub duration_ms: Option<u64>,
    pub interrupted: bool,
    #[serde(default)]
    pub dropped_turn_count: u64,
    pub source_language: String,
    pub target_language: String,
    pub tone: String,
    pub mode: String,
    pub text_source: Option<String>,
    pub text_target: Option<String>,
    pub turns: Vec<HistoryTurn>,
}

#[derive(Debug, Clone, Serialize)]
pub struct HistorySummary {
    pub entry_id: String,
    pub entry_type: String,
    pub title: String,
    pub created_unix_ms: u128,
    pub updated_unix_ms: u128,
    pub saved_unix_ms: Option<u128>,
    pub duration_ms: Option<u64>,
    pub interrupted: bool,
    pub source_language: String,
    pub target_language: String,
    pub snippet: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct HistoryWriteResult {
    pub ok: bool,
    pub entry_id: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct HistoryClearResult {
    pub ok: bool,
    pub removed_count: usize,
    pub message: String,
}

pub fn create_text_recent(
    source: String,
    target: String,
    source_language: String,
    target_language: String,
    tone: String,
    mode: String,
) -> HistoryWriteResult {
    let source = sanitize_text(&source);
    let target = sanitize_text(&target);
    if source.is_empty() || target.is_empty() {
        return HistoryWriteResult {
            ok: false,
            entry_id: String::new(),
            message: "History was not saved because the completed Text translation was empty."
                .to_string(),
        };
    }

    let now = current_unix_ms();
    let entry_id = format!("text_{}_{}", now, std::process::id());
    let entry = sanitize_entry(HistoryEntry {
        schema_version: HISTORY_SCHEMA_VERSION,
        entry_id: entry_id.clone(),
        entry_type: "text".to_string(),
        title: "Text Translation".to_string(),
        created_unix_ms: now,
        updated_unix_ms: now,
        saved_unix_ms: None,
        duration_ms: None,
        interrupted: false,
        dropped_turn_count: 0,
        source_language,
        target_language,
        tone,
        mode,
        text_source: Some(source),
        text_target: Some(target),
        turns: Vec::new(),
    });

    match write_entry(&scope_dir("recent"), &entry) {
        Ok(()) => HistoryWriteResult {
            ok: true,
            entry_id,
            message: "Translation added to Recent History.".to_string(),
        },
        Err(_) => HistoryWriteResult {
            ok: false,
            entry_id,
            message: "Translation completed, but Recent History could not be saved."
                .to_string(),
        },
    }
}

pub fn create_meeting_recent(
    session_id: String,
    started_unix_ms: u128,
    ended_unix_ms: u128,
    source_language: String,
    target_language: String,
    tone: String,
    mode: String,
    interrupted: bool,
    dropped_turn_count: u64,
    turns: Vec<HistoryTurn>,
) -> HistoryWriteResult {
    let entry_id = sanitize_entry_id(&session_id);
    if entry_id.is_empty() {
        return HistoryWriteResult {
            ok: false,
            entry_id,
            message: "Meeting History was not saved because the finalized session id was invalid."
                .to_string(),
        };
    }

    if let Some(existing) = get_history("recent".to_string(), entry_id.clone()) {
        return HistoryWriteResult {
            ok: true,
            entry_id: existing.entry_id,
            message: "Meeting is already present in Recent History.".to_string(),
        };
    }

    let ended_unix_ms = if ended_unix_ms == 0 {
        current_unix_ms()
    } else {
        ended_unix_ms
    };
    let created_unix_ms = if started_unix_ms == 0 {
        ended_unix_ms
    } else {
        started_unix_ms.min(ended_unix_ms)
    };
    let duration_ms = u64::try_from(ended_unix_ms.saturating_sub(created_unix_ms))
        .unwrap_or(u64::MAX);
    let interrupted = interrupted
        || turns
            .iter()
            .any(|turn| turn.delivery_state.as_deref() == Some("interrupted"));

    let entry = sanitize_entry(HistoryEntry {
        schema_version: HISTORY_SCHEMA_VERSION,
        entry_id: entry_id.clone(),
        entry_type: "meeting".to_string(),
        title: "Meeting Translation".to_string(),
        created_unix_ms,
        updated_unix_ms: ended_unix_ms,
        saved_unix_ms: None,
        duration_ms: Some(duration_ms),
        interrupted,
        dropped_turn_count,
        source_language,
        target_language,
        tone,
        mode,
        text_source: None,
        text_target: None,
        turns,
    });

    if entry.turns.is_empty() {
        return HistoryWriteResult {
            ok: true,
            entry_id: String::new(),
            message: "Meeting ended with no committed translated turns, so no Recent History entry was created."
                .to_string(),
        };
    }

    match write_entry(&scope_dir("recent"), &entry) {
        Ok(()) => HistoryWriteResult {
            ok: true,
            entry_id,
            message: "Meeting added to Recent History.".to_string(),
        },
        Err(_) => HistoryWriteResult {
            ok: false,
            entry_id,
            message: "Meeting ended, but Recent History could not be saved.".to_string(),
        },
    }
}

pub fn list_history(scope: String, entry_type: Option<String>) -> Vec<HistorySummary> {
    let scope = sanitize_scope(&scope);
    let type_filter = entry_type.map(|value| sanitize_entry_type(&value));
    let mut rows = Vec::new();

    if let Ok(entries) = fs::read_dir(scope_dir(&scope)) {
        for entry in entries.flatten().take(MAX_HISTORY_LIST_SCAN_FILES) {
            let path = entry.path();
            if path.extension().and_then(|value| value.to_str()) != Some("json") {
                continue;
            }
            let Some(history) = read_entry(&path) else {
                continue;
            };
            if let Some(filter) = &type_filter {
                if filter != "all" && &history.entry_type != filter {
                    continue;
                }
            }
            rows.push(summary_from_entry(&history));
        }
    }

    rows.sort_by_key(|row| std::cmp::Reverse(row.updated_unix_ms));
    rows.truncate(MAX_HISTORY_LIST_ROWS);
    rows
}

pub fn get_history(scope: String, entry_id: String) -> Option<HistoryEntry> {
    let scope = sanitize_scope(&scope);
    let entry_id = sanitize_entry_id(&entry_id);
    if entry_id.is_empty() {
        return None;
    }
    read_entry(&scope_dir(&scope).join(format!("{entry_id}.json")))
}

pub fn save_history(entry_id: String) -> HistoryWriteResult {
    let entry_id = sanitize_entry_id(&entry_id);
    let Some(mut entry) = get_history("recent".to_string(), entry_id.clone()) else {
        return HistoryWriteResult {
            ok: false,
            entry_id,
            message: "The Recent History item could not be found.".to_string(),
        };
    };

    let saved_path = scope_dir("saved").join(format!("{}.json", entry.entry_id));
    if let Some(existing) = read_entry(&saved_path) {
        return HistoryWriteResult {
            ok: true,
            entry_id: existing.entry_id,
            message: "This item is already Saved.".to_string(),
        };
    }

    let now = current_unix_ms();
    entry.saved_unix_ms = Some(now);
    entry.updated_unix_ms = now;
    entry = sanitize_entry(entry);

    match write_entry(&scope_dir("saved"), &entry) {
        Ok(()) => HistoryWriteResult {
            ok: true,
            entry_id: entry.entry_id,
            message: "Saved copy created.".to_string(),
        },
        Err(_) => HistoryWriteResult {
            ok: false,
            entry_id: entry.entry_id,
            message: "The item could not be Saved.".to_string(),
        },
    }
}

pub fn remove_saved_history(entry_id: String) -> HistoryWriteResult {
    let entry_id = sanitize_entry_id(&entry_id);
    if entry_id.is_empty() {
        return HistoryWriteResult {
            ok: false,
            entry_id,
            message: "Saved item id is invalid.".to_string(),
        };
    }
    let path = scope_dir("saved").join(format!("{entry_id}.json"));
    match fs::remove_file(&path) {
        Ok(()) => HistoryWriteResult {
            ok: true,
            entry_id,
            message: "Removed from Saved.".to_string(),
        },
        Err(error) if error.kind() == io::ErrorKind::NotFound => HistoryWriteResult {
            ok: true,
            entry_id,
            message: "The item was already removed from Saved.".to_string(),
        },
        Err(_) => HistoryWriteResult {
            ok: false,
            entry_id,
            message: "The Saved item could not be removed.".to_string(),
        },
    }
}

pub fn clear_recent_history() -> HistoryClearResult {
    let dir = scope_dir("recent");
    let Ok(entries) = fs::read_dir(&dir) else {
        return HistoryClearResult {
            ok: true,
            removed_count: 0,
            message: "Recent History is already clear.".to_string(),
        };
    };

    let mut removed_count = 0usize;
    let mut failed = false;
    for entry in entries.flatten().take(MAX_HISTORY_LIST_SCAN_FILES) {
        let path = entry.path();
        if path.extension().and_then(|value| value.to_str()) != Some("json") {
            continue;
        }
        match fs::remove_file(path) {
            Ok(()) => removed_count += 1,
            Err(_) => failed = true,
        }
    }

    HistoryClearResult {
        ok: !failed,
        removed_count,
        message: if failed {
            "Some Recent History items could not be cleared. Saved items were not touched."
                .to_string()
        } else {
            "Recent History cleared. Saved items were not affected.".to_string()
        },
    }
}

fn summary_from_entry(entry: &HistoryEntry) -> HistorySummary {
    let snippet_source = entry
        .text_source
        .as_deref()
        .or_else(|| entry.turns.first().map(|turn| turn.source_text.as_str()))
        .unwrap_or("");
    HistorySummary {
        entry_id: entry.entry_id.clone(),
        entry_type: entry.entry_type.clone(),
        title: entry.title.clone(),
        created_unix_ms: entry.created_unix_ms,
        updated_unix_ms: entry.updated_unix_ms,
        saved_unix_ms: entry.saved_unix_ms,
        duration_ms: entry.duration_ms,
        interrupted: entry.interrupted,
        source_language: entry.source_language.clone(),
        target_language: entry.target_language.clone(),
        snippet: compact_text(snippet_source, MAX_HISTORY_SNIPPET_CHARS),
    }
}

fn history_root() -> PathBuf {
    let paths = ProjectPaths::discover();
    PathBuf::from(paths.user_saved_dir).join("History")
}

fn scope_dir(scope: &str) -> PathBuf {
    match sanitize_scope(scope).as_str() {
        "saved" => history_root().join("Saved"),
        _ => history_root().join("Recent"),
    }
}

fn write_entry(dir: &Path, entry: &HistoryEntry) -> io::Result<()> {
    fs::create_dir_all(dir)?;
    let entry = sanitize_entry(entry.clone());
    let path = dir.join(format!("{}.json", sanitize_entry_id(&entry.entry_id)));
    let body = serde_json::to_string_pretty(&entry)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    if u64::try_from(body.len()).unwrap_or(u64::MAX) > MAX_HISTORY_ENTRY_FILE_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "history entry exceeds safe file size limit",
        ));
    }
    let temp_path = path.with_extension("json.tmp");
    fs::write(&temp_path, body)?;
    match fs::rename(&temp_path, &path) {
        Ok(()) => Ok(()),
        Err(error) => {
            if path.exists() {
                fs::remove_file(&path)?;
                fs::rename(&temp_path, &path)
            } else {
                let _ = fs::remove_file(&temp_path);
                Err(error)
            }
        }
    }
}

fn read_entry(path: &Path) -> Option<HistoryEntry> {
    let metadata = path.metadata().ok()?;
    if metadata.len() > MAX_HISTORY_ENTRY_FILE_BYTES {
        return None;
    }
    let raw = fs::read_to_string(path).ok()?;
    serde_json::from_str::<HistoryEntry>(&raw)
        .ok()
        .map(sanitize_entry)
}

fn sanitize_entry(mut entry: HistoryEntry) -> HistoryEntry {
    entry.schema_version = entry.schema_version.max(HISTORY_SCHEMA_VERSION);
    entry.entry_id = sanitize_entry_id(&entry.entry_id);
    entry.entry_type = sanitize_entry_type(&entry.entry_type);
    entry.title = compact_text(&entry.title, MAX_HISTORY_TITLE_CHARS);
    if entry.title.is_empty() {
        entry.title = if entry.entry_type == "meeting" {
            "Meeting".to_string()
        } else {
            "Text Translation".to_string()
        };
    }
    entry.source_language = sanitize_language(&entry.source_language, "id");
    entry.target_language = sanitize_language(&entry.target_language, "en");
    entry.tone = compact_text(&entry.tone, 32);
    entry.mode = compact_text(&entry.mode, 32);
    entry.text_source = sanitize_optional_text(entry.text_source.take());
    entry.text_target = sanitize_optional_text(entry.text_target.take());
    if entry.turns.len() > MAX_HISTORY_TURNS {
        let remove_count = entry.turns.len() - MAX_HISTORY_TURNS;
        entry.turns.drain(0..remove_count);
        entry.dropped_turn_count = entry
            .dropped_turn_count
            .saturating_add(u64::try_from(remove_count).unwrap_or(u64::MAX));
    }
    for turn in &mut entry.turns {
        turn.lane = match turn.lane.trim().to_lowercase().as_str() {
            "incoming" => "incoming".to_string(),
            _ => "you".to_string(),
        };
        turn.source_text = sanitize_text(&turn.source_text);
        turn.translated_text = sanitize_text(&turn.translated_text);
        turn.delivery_state = turn
            .delivery_state
            .take()
            .map(|value| compact_text(&value, 64))
            .filter(|value| !value.is_empty());
    }
    entry
        .turns
        .retain(|turn| !turn.source_text.is_empty() || !turn.translated_text.is_empty());
    entry
}

fn sanitize_scope(value: &str) -> String {
    if value.trim().eq_ignore_ascii_case("saved") {
        "saved".to_string()
    } else {
        "recent".to_string()
    }
}

fn sanitize_entry_type(value: &str) -> String {
    match value.trim().to_lowercase().as_str() {
        "meeting" => "meeting".to_string(),
        "all" => "all".to_string(),
        _ => "text".to_string(),
    }
}

fn sanitize_entry_id(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
        .take(96)
        .collect::<String>()
}

fn sanitize_language(value: &str, fallback: &str) -> String {
    let clean = compact_text(value, 16).to_lowercase();
    if clean.starts_with("id") || clean.starts_with("ind") {
        "id".to_string()
    } else if clean.starts_with("en") || clean.starts_with("eng") {
        "en".to_string()
    } else if clean.is_empty() {
        fallback.to_string()
    } else {
        clean.chars().take(8).collect()
    }
}

fn sanitize_optional_text(value: Option<String>) -> Option<String> {
    let clean = sanitize_text(&value?);
    if clean.is_empty() {
        None
    } else {
        Some(clean)
    }
}

fn sanitize_text(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|character| !is_unsafe_text_character(*character))
        .take(MAX_HISTORY_TEXT_CHARS)
        .collect::<String>()
}

fn compact_text(value: &str, limit: usize) -> String {
    value
        .trim()
        .chars()
        .filter(|character| !is_unsafe_text_character(*character))
        .take(limit)
        .collect::<String>()
}

fn is_unsafe_text_character(character: char) -> bool {
    character == '\0'
        || ('\u{0001}'..='\u{0008}').contains(&character)
        || ('\u{000b}'..='\u{001f}').contains(&character)
        || character == '\u{007f}'
        || ('\u{202a}'..='\u{202e}').contains(&character)
        || ('\u{2066}'..='\u{2069}').contains(&character)
}

fn current_unix_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}
