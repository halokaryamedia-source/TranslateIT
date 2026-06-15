use serde::Serialize;
use std::fs;
use std::io;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_LOG_AREA_CHARS: usize = 48;
const MAX_LOG_MESSAGE_CHARS: usize = 360;

#[derive(Debug, Clone, Serialize)]
pub struct RuntimeLogEvent {
    pub timestamp_unix_ms: u128,
    pub level: String,
    pub area: String,
    pub message: String,
}

impl RuntimeLogEvent {
    pub fn info(area: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            timestamp_unix_ms: current_unix_ms(),
            level: "info".to_string(),
            area: compact_log_field(area, MAX_LOG_AREA_CHARS),
            message: compact_log_field(message, MAX_LOG_MESSAGE_CHARS),
        }
    }

    pub fn warning(area: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            timestamp_unix_ms: current_unix_ms(),
            level: "warning".to_string(),
            area: compact_log_field(area, MAX_LOG_AREA_CHARS),
            message: compact_log_field(message, MAX_LOG_MESSAGE_CHARS),
        }
    }
}

pub fn write_jsonl_event(log_dir: &Path, file_name: &str, event: &RuntimeLogEvent) -> io::Result<()> {
    fs::create_dir_all(log_dir)?;
    let path = log_dir.join(file_name);
    let line = serde_json::to_string(event)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    append_line(&path, &line)
}

fn append_line(path: &Path, line: &str) -> io::Result<()> {
    use std::io::Write;

    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)?;
    writeln!(file, "{line}")
}

fn compact_log_field(value: impl Into<String>, max_chars: usize) -> String {
    let mut output = String::new();
    let mut previous_was_space = false;
    let mut written = 0usize;
    let mut truncated = false;

    for character in value.into().chars() {
        let next_character = if character.is_whitespace() {
            if previous_was_space {
                continue;
            }
            previous_was_space = true;
            ' '
        } else {
            previous_was_space = false;
            character
        };

        if written >= max_chars {
            truncated = true;
            break;
        }

        output.push(next_character);
        written += 1;
    }

    let mut output = output.trim().to_string();
    if truncated {
        output.push('…');
    }
    output
}

fn current_unix_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}
