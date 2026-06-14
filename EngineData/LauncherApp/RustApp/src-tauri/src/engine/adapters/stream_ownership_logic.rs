use serde::{Deserialize, Serialize};

use crate::engine::audio::buffer::{planned_buffer_status, AudioBufferStatus};
use crate::engine::audio::input::InputPreparationStatus;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamOwnershipRequest {
    pub requested_owner_id: Option<String>,
    pub session_id: Option<String>,
    pub allow_takeover: bool,
    pub current_owner_id: Option<String>,
    pub capture_loop_active: bool,
    pub calibration_ready: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct StreamOwnershipReport {
    pub owner_id: String,
    pub session_id: String,
    pub input_prepared: bool,
    pub input_running: bool,
    pub capture_loop_active: bool,
    pub calibration_ready: bool,
    pub buffer_ready_for_vad: bool,
    pub buffer_ready_for_calibration: bool,
    pub ownership_granted: bool,
    pub requires_takeover: bool,
    pub ready_to_start_stream: bool,
    pub blockers: Vec<String>,
    pub input_status: InputPreparationStatus,
    pub buffer_status: AudioBufferStatus,
    pub note: String,
}

pub fn analyze_stream_ownership(request: StreamOwnershipRequest) -> StreamOwnershipReport {
    let input_status = InputPreparationStatus::inspect_default_input();
    let buffer_status = planned_buffer_status();
    let owner_id = sanitize_id(request.requested_owner_id.as_deref(), "translateit_runtime");
    let session_id = sanitize_id(request.session_id.as_deref(), "pending_session");
    let current_owner = request.current_owner_id.unwrap_or_default().trim().to_string();
    let requires_takeover = !current_owner.is_empty() && current_owner != owner_id;
    let mut blockers = Vec::new();

    if !input_status.prepared {
        blockers.push("input:not_prepared".to_string());
    }
    if input_status.running || request.capture_loop_active {
        blockers.push("input:already_running".to_string());
    }
    if requires_takeover && !request.allow_takeover {
        blockers.push("owner:locked_by_other_session".to_string());
    }
    if !buffer_status.ready_for_vad {
        blockers.push("buffer:not_ready_for_vad".to_string());
    }
    if !buffer_status.ready_for_calibration {
        blockers.push("buffer:not_ready_for_calibration".to_string());
    }
    if !request.calibration_ready {
        blockers.push("calibration:not_ready".to_string());
    }

    let ready_to_start_stream = blockers.is_empty();
    let ownership_granted = ready_to_start_stream || (requires_takeover && request.allow_takeover && input_status.prepared);
    let note = if ready_to_start_stream {
        "Stream ownership contract is ready. Real CPAL stream creation is still deferred to runtime integration.".to_string()
    } else {
        format!("Stream ownership contract is blocked by {} guard(s).", blockers.len())
    };

    StreamOwnershipReport {
        owner_id,
        session_id,
        input_prepared: input_status.prepared,
        input_running: input_status.running,
        capture_loop_active: request.capture_loop_active,
        calibration_ready: request.calibration_ready,
        buffer_ready_for_vad: buffer_status.ready_for_vad,
        buffer_ready_for_calibration: buffer_status.ready_for_calibration,
        ownership_granted,
        requires_takeover,
        ready_to_start_stream,
        blockers,
        input_status,
        buffer_status,
        note,
    }
}

fn sanitize_id(value: Option<&str>, fallback: &str) -> String {
    let cleaned = value
        .unwrap_or_default()
        .trim()
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' { ch } else { '_' })
        .collect::<String>();
    if cleaned.is_empty() {
        fallback.to_string()
    } else {
        cleaned
    }
}
