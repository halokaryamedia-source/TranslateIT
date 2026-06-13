use serde::Serialize;
use std::fs;
use std::io;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

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
            area: area.into(),
            message: message.into(),
        }
    }

    pub fn warning(area: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            timestamp_unix_ms: current_unix_ms(),
            level: "warning".to_string(),
            area: area.into(),
            message: message.into(),
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

fn current_unix_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}
