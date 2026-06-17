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

fn placeholder_result(message: &str) -> AudioStudioCommandResult {
    AudioStudioCommandResult {
        ok: false,
        state: "placeholder_only".to_string(),
        message: message.to_string(),
        evidence_required: true,
    }
}

#[tauri::command]
pub fn audio_studio_import_take(_request: AudioStudioTakeRequest) -> AudioStudioCommandResult {
    placeholder_result("Audio Studio import route is a non-local placeholder. Target-PC storage evidence is required before enabling it.")
}

#[tauri::command]
pub fn audio_studio_stage_guided_take(_request: AudioStudioTakeRequest) -> AudioStudioCommandResult {
    placeholder_result("Audio Studio guided reading route is a non-local placeholder. Target-PC capture evidence is required before enabling it.")
}

#[tauri::command]
pub fn audio_studio_update_take_state(_request: AudioStudioStateUpdateRequest) -> AudioStudioCommandResult {
    placeholder_result("Audio Studio take state route is a non-local placeholder. Target-PC project-data evidence is required before enabling it.")
}

#[tauri::command]
pub fn audio_studio_export_project_metadata() -> AudioStudioCommandResult {
    placeholder_result("Audio Studio metadata export route is a non-local placeholder. Target-PC file-write evidence is required before enabling it.")
}
