use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioStudioTakeRequest {
    pub take_id: Option<String>,
    pub source: String,
    pub title: String,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioStudioStateUpdateRequest {
    pub take_id: String,
    pub state: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioStudioCommandResult {
    pub ok: bool,
    pub state: String,
    pub message: String,
    pub evidence_required: bool,
}

fn result(state: &str, message: &str) -> AudioStudioCommandResult {
    AudioStudioCommandResult {
        ok: false,
        state: state.to_string(),
        message: message.to_string(),
        evidence_required: true,
    }
}

fn validate_take_request(request: &AudioStudioTakeRequest) -> Option<AudioStudioCommandResult> {
    if request.source.trim().is_empty() {
        return Some(result("invalid_request", "Audio Studio request is missing a source."));
    }
    if request.title.trim().is_empty() {
        return Some(result("invalid_request", "Audio Studio request is missing a title."));
    }
    if request.detail.trim().is_empty() {
        return Some(result("invalid_request", "Audio Studio request is missing detail text."));
    }
    None
}

fn validate_state_request(request: &AudioStudioStateUpdateRequest) -> Option<AudioStudioCommandResult> {
    if request.take_id.trim().is_empty() {
        return Some(result("invalid_request", "Audio Studio state update is missing a take id."));
    }
    let allowed = ["draft", "staged", "accepted", "needs_retry", "blocked"];
    if !allowed.contains(&request.state.as_str()) {
        return Some(result("invalid_request", "Audio Studio state update has an unsupported state."));
    }
    None
}

#[tauri::command]
pub fn audio_studio_import_take(request: AudioStudioTakeRequest) -> AudioStudioCommandResult {
    if let Some(error) = validate_take_request(&request) {
        return error;
    }
    result("placeholder_only", "Audio Studio import route is available as a reviewed stub. Target-PC storage review is still required.")
}

#[tauri::command]
pub fn audio_studio_stage_guided_take(request: AudioStudioTakeRequest) -> AudioStudioCommandResult {
    if let Some(error) = validate_take_request(&request) {
        return error;
    }
    result("placeholder_only", "Audio Studio guided reading route is available as a reviewed stub. Target-PC review is still required.")
}

#[tauri::command]
pub fn audio_studio_update_take_state(request: AudioStudioStateUpdateRequest) -> AudioStudioCommandResult {
    if let Some(error) = validate_state_request(&request) {
        return error;
    }
    result("placeholder_only", "Audio Studio take state route is available as a reviewed stub. Target-PC project-data review is still required.")
}

#[tauri::command]
pub fn audio_studio_export_project_metadata() -> AudioStudioCommandResult {
    result("placeholder_only", "Audio Studio metadata export route is available as a reviewed stub. Target-PC file review is still required.")
}
