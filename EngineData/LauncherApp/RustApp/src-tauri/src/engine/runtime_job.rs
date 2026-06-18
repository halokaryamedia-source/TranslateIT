use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::engine::audio::input::InputPreparationStatus;

const MAX_RUNTIME_JOB_NOTE_CHARS: usize = 220;

#[derive(Debug, Clone, Serialize)]
pub struct RuntimeCaptureJobPlan {
    pub job_id: String,
    pub session_id: String,
    pub next_segment_id: String,
    pub stage: String,
    pub input_prepared: bool,
    pub input_running: bool,
    pub ready_for_capture_loop: bool,
    pub blocker: String,
    pub note: String,
}

pub fn plan_runtime_capture_job(input_status: InputPreparationStatus) -> RuntimeCaptureJobPlan {
    let now_ms = current_unix_ms();
    let session_id = format!("session_{now_ms}");
    let job_id = format!("capture_job_{now_ms}");
    let next_segment_id = format!("{session_id}_segment_1");
    let mut blocker = String::new();

    if !input_status.prepared {
        blocker = "input_not_prepared".to_string();
    } else if input_status.running {
        blocker = "input_already_running".to_string();
    }

    let ready_for_capture_loop = blocker.is_empty();
    let stage = if ready_for_capture_loop { "capture_ready" } else { "capture_blocked" }.to_string();
    let note = if ready_for_capture_loop {
        "Rust capture job plan is ready. Real microphone stream loop is still pending integration.".to_string()
    } else {
        format!("Rust capture job plan is blocked: {blocker}. {}", compact_note(&input_status.note))
    };

    RuntimeCaptureJobPlan {
        job_id,
        session_id,
        next_segment_id,
        stage,
        input_prepared: input_status.prepared,
        input_running: input_status.running,
        ready_for_capture_loop,
        blocker,
        note,
    }
}

fn compact_note(value: &str) -> String {
    let clean = value
        .trim()
        .chars()
        .filter(|character| !character.is_control())
        .take(MAX_RUNTIME_JOB_NOTE_CHARS)
        .collect::<String>();
    if clean.is_empty() { "Input status unavailable.".to_string() } else { clean }
}

fn current_unix_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}
