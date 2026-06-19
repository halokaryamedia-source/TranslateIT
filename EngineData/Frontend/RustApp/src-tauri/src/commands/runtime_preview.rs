use serde::Serialize;
use std::path::PathBuf;

use crate::engine::audio::input::InputPreparationStatus;

use super::helper_bridge_runtime::HelperBridgeStatus;

pub fn now_iso() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", now.as_secs())
}

pub fn validation_write_path(user_cache_dir: &str, file_name: &str) -> PathBuf {
    PathBuf::from(user_cache_dir).join("validation").join(file_name)
}

pub fn write_validation_json<T: Serialize>(user_cache_dir: &str, file_name: &str, value: &T) {
    let dir = PathBuf::from(user_cache_dir).join("validation");
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join(file_name);
    if let Ok(json) = serde_json::to_string_pretty(value) {
        let _ = std::fs::write(path, json);
    }
}

fn is_unsafe_preview_character(character: char) -> bool {
    matches!(character, '\n' | '\r' | '\t') || character.is_control()
}

pub fn compact_preview_text(value: &str) -> String {
    value
        .chars()
        .filter(|character| !is_unsafe_preview_character(*character))
        .collect::<String>()
        .trim()
        .chars()
        .take(180)
        .collect::<String>()
}

pub fn voice_capture_blockers(
    input_status: &InputPreparationStatus,
    helper_status: &HelperBridgeStatus,
) -> (Vec<String>, Vec<String>, String, String) {
    let mut missing = Vec::new();
    let mut next_actions = Vec::new();
    let helper_state = helper_status.state.clone();
    let mut message = "Voice capture is ready.".to_string();
    let mut state = "ready".to_string();

    if !input_status.prepared {
        missing.push("microphone".to_string());
        next_actions.push("Check microphone device".to_string());
        message = input_status.note.clone();
        state = "missing_microphone".to_string();
    }

    if helper_state == "not_started"
        || helper_state == "stopped"
        || helper_state == "error"
        || helper_state == "blocked"
    {
        next_actions.push("Start Helper".to_string());
        state = "starting".to_string();
    }

    if !helper_status.provider_ready {
        if helper_status.state == "blocked" || helper_status.state == "error" {
            missing.push("worker".to_string());
            next_actions.push("Run Worker Status".to_string());
            message = helper_status.message.clone();
            state = "missing_worker".to_string();
        } else {
            missing.push("models".to_string());
            next_actions.push("Open Developer Diagnostics".to_string());
            message = if helper_status.cuda_ready {
                "Local helper started, but voice models are not ready yet.".to_string()
            } else {
                "Local helper started, but provider readiness is still incomplete. CPU fallback may be available, but voice capture is not ready yet.".to_string()
            };
            state = "missing_models".to_string();
        }
    }

    if helper_status.provider_ready && input_status.prepared {
        state = "ready".to_string();
        message = "Voice provider and microphone are ready.".to_string();
    }

    if !helper_status.cuda_ready {
        next_actions.push("Continue with CPU fallback if models are ready".to_string());
    }

    (missing, next_actions, state, message)
}
