use serde::{Deserialize, Serialize};
use std::path::Path;

const MAX_PLAYBACK_LABEL_CHARS: usize = 160;
const MAX_PLAYBACK_QUEUE_DEPTH: u32 = 10_000;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybackLogicRequest {
    pub audio_path: Option<String>,
    pub output_device_id: Option<String>,
    pub backend_available: bool,
    pub prefer_windows_default: bool,
    pub queue_depth: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct PlaybackLogicResult {
    pub status: String,
    pub message: String,
    pub audio_path: Option<String>,
    pub output_device_id: Option<String>,
    pub used_default_output: bool,
    pub queued: bool,
    pub queue_depth_after_enqueue: u32,
    pub backend_name: String,
    pub backend_blocking: bool,
    pub backend_start_is_actual_audible_start: bool,
    pub backend_event_limitation: String,
}

struct PlaybackResultParts {
    status: String,
    message: String,
    audio_path: Option<String>,
    output_device_id: Option<String>,
    used_default_output: bool,
    queued: bool,
    queue_depth: u32,
    backend_name: String,
    backend_blocking: bool,
}

pub fn plan_playback(request: PlaybackLogicRequest) -> PlaybackLogicResult {
    let queue_depth = request.queue_depth.min(MAX_PLAYBACK_QUEUE_DEPTH);
    let output_device_id = request
        .output_device_id
        .as_deref()
        .map(|value| safe_label(value, "output_device"));
    let Some(audio_path) = request
        .audio_path
        .clone()
        .filter(|value| !value.trim().is_empty())
    else {
        return result(PlaybackResultParts {
            status: "Unavailable".to_string(),
            message: "No replay audio path is available.".to_string(),
            audio_path: None,
            output_device_id,
            used_default_output: true,
            queued: false,
            queue_depth,
            backend_name: "none".to_string(),
            backend_blocking: false,
        });
    };
    let audio_path_label = playback_path_label(&audio_path);
    let path = Path::new(&audio_path);
    if path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_lowercase())
        != Some("wav".to_string())
    {
        return result(PlaybackResultParts {
            status: "Unsupported".to_string(),
            message: "Only WAV playback is supported.".to_string(),
            audio_path: Some(audio_path_label),
            output_device_id,
            used_default_output: true,
            queued: false,
            queue_depth,
            backend_name: "unsupported".to_string(),
            backend_blocking: false,
        });
    }
    if !request.backend_available {
        let used_default_output = output_device_id.is_none();
        return result(PlaybackResultParts {
            status: "Unsupported".to_string(),
            message: "Playback backend is not available.".to_string(),
            audio_path: Some(audio_path_label),
            output_device_id,
            used_default_output,
            queued: false,
            queue_depth,
            backend_name: "unavailable".to_string(),
            backend_blocking: false,
        });
    }
    let used_default_output = request.prefer_windows_default || output_device_id.is_none();
    PlaybackLogicResult {
        status: "Queued".to_string(),
        message: "Audio replay queued for sequential playback.".to_string(),
        audio_path: Some(audio_path_label),
        output_device_id,
        used_default_output,
        queued: true,
        queue_depth_after_enqueue: queue_depth.saturating_add(1).min(MAX_PLAYBACK_QUEUE_DEPTH),
        backend_name: if used_default_output {
            "windows-default-output"
        } else {
            "selected-output-device"
        }
        .to_string(),
        backend_blocking: true,
        backend_start_is_actual_audible_start: false,
        backend_event_limitation:
            "Backend timing is a proxy unless native output stream reports first audible buffer."
                .to_string(),
    }
}

fn result(parts: PlaybackResultParts) -> PlaybackLogicResult {
    PlaybackLogicResult {
        status: parts.status,
        message: parts.message,
        audio_path: parts.audio_path,
        output_device_id: parts.output_device_id,
        used_default_output: parts.used_default_output,
        queued: parts.queued,
        queue_depth_after_enqueue: parts.queue_depth.min(MAX_PLAYBACK_QUEUE_DEPTH),
        backend_name: parts.backend_name,
        backend_blocking: parts.backend_blocking,
        backend_start_is_actual_audible_start: false,
        backend_event_limitation: "No native playback worker is active for this request."
            .to_string(),
    }
}

fn safe_label(value: &str, fallback: &str) -> String {
    let clean = value
        .trim()
        .chars()
        .filter(|character| !character.is_control())
        .take(MAX_PLAYBACK_LABEL_CHARS)
        .collect::<String>()
        .trim()
        .to_string();
    if clean.is_empty() {
        fallback.to_string()
    } else {
        clean
    }
}

fn playback_path_label(value: &str) -> String {
    let path = Path::new(value);
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("audio.wav");
    format!(
        "UserData/CacheData/audio_segments/{}",
        safe_label(file_name, "audio.wav")
    )
}
