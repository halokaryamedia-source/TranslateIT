use serde::{Deserialize, Serialize};

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
        voice_profile_id: request.voice_profile_id,
        text_length: request.text.chars().count(),
        would_auto_play: request.auto_play,
        message: "Output boundary pending.".to_string(),
    }
}
