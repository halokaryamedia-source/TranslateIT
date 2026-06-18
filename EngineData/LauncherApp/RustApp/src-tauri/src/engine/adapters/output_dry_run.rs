use serde::{Deserialize, Serialize};

const MAX_OUTPUT_TEXT_CHARS: usize = 8_000;
const MAX_VOICE_PROFILE_ID_CHARS: usize = 96;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutputDryRunRequest {
    pub text: String,
    pub voice_profile_id: String,
    pub auto_play: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct OutputDryRunResult {
    pub ok: bool,
    pub voice_profile_id: String,
    pub text_length: usize,
    pub would_auto_play: bool,
    pub message: String,
}

pub fn run_output_dry_check(request: OutputDryRunRequest) -> OutputDryRunResult {
    OutputDryRunResult {
        ok: false,
        voice_profile_id: safe_id(&request.voice_profile_id, "voice_profile"),
        text_length: compact_text(&request.text, MAX_OUTPUT_TEXT_CHARS).chars().count(),
        would_auto_play: request.auto_play,
        message: "Output boundary pending.".to_string(),
    }
}

fn compact_text(value: &str, max_chars: usize) -> String {
    value
        .trim()
        .chars()
        .filter(|character| !character.is_control())
        .take(max_chars)
        .collect::<String>()
}

fn safe_id(value: &str, fallback: &str) -> String {
    let clean = value
        .trim()
        .chars()
        .map(|character| if character.is_ascii_alphanumeric() || matches!(character, '-' | '_') { character } else { '_' })
        .take(MAX_VOICE_PROFILE_ID_CHARS)
        .collect::<String>();
    if clean.is_empty() { fallback.to_string() } else { clean }
}
