use serde::{Deserialize, Serialize};

pub const CAPTURE_MODE_DIAGNOSTIC_ONLY: &str = "Diagnostic Only";
pub const CAPTURE_MODE_MOCK_PIPELINE: &str = "Mock Pipeline";
pub const CAPTURE_MODE_REAL_ASR_MOCK_TRANSLATION: &str = "Real ASR + Mock Translation";
pub const CAPTURE_MODE_REAL_ASR_REAL_TRANSLATION: &str = "Real ASR + Real Translation";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineDecisionRequest {
    pub capture_mode: String,
    pub segment_id: String,
    pub language_bias: Option<String>,
    pub should_translate: bool,
    pub vad_accepted: bool,
    pub vad_reason: Option<String>,
    pub audio_reason: Option<String>,
    pub asr_ready: bool,
    pub translation_ready: bool,
    pub tts_requested: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct PipelineDecisionReport {
    pub segment_id: String,
    pub capture_mode: String,
    pub accepted: bool,
    pub reject_reason_code: String,
    pub asr_required: bool,
    pub asr_allowed: bool,
    pub translation_required: bool,
    pub translation_allowed: bool,
    pub output_requested: bool,
    pub asr_status: String,
    pub translation_status: String,
    pub event_messages: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StaleJobGuardRequest {
    pub active_generation: u64,
    pub callback_generation: u64,
    pub active_session_id: String,
    pub callback_session_id: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct StaleJobGuardReport {
    pub accepted: bool,
    pub stale_job_rejected: bool,
    pub reason: String,
}

pub fn decide_pipeline(request: PipelineDecisionRequest) -> PipelineDecisionReport {
    let mode = normalize_capture_mode(&request.capture_mode);
    let mut messages = Vec::new();
    let reject_reason = request.vad_reason.clone().or(request.audio_reason.clone()).unwrap_or_default();
    let reject_reason_code = if request.vad_accepted { String::new() } else { reject_reason_code(&reject_reason) };
    let accepted = request.vad_accepted;
    let asr_required = matches!(mode.as_str(), CAPTURE_MODE_REAL_ASR_MOCK_TRANSLATION | CAPTURE_MODE_REAL_ASR_REAL_TRANSLATION);
    let translation_required = mode == CAPTURE_MODE_REAL_ASR_REAL_TRANSLATION && request.should_translate;
    let asr_allowed = accepted && asr_required && request.asr_ready;
    let translation_allowed = asr_allowed && translation_required && request.translation_ready;

    if !accepted {
        messages.push(format!("segment_rejected={reject_reason_code}"));
    }
    if asr_required && !request.asr_ready {
        messages.push("asr_blocked_runtime_not_ready".to_string());
    }
    if translation_required && !request.translation_ready {
        messages.push("translation_blocked_runtime_not_ready".to_string());
    }
    if mode == CAPTURE_MODE_DIAGNOSTIC_ONLY {
        messages.push("diagnostic_only_no_asr_or_translation".to_string());
    }
    if mode == CAPTURE_MODE_MOCK_PIPELINE {
        messages.push("mock_pipeline_no_real_model_execution".to_string());
    }

    PipelineDecisionReport {
        segment_id: request.segment_id,
        capture_mode: mode,
        accepted,
        reject_reason_code,
        asr_required,
        asr_allowed,
        translation_required,
        translation_allowed,
        output_requested: request.tts_requested && translation_allowed,
        asr_status: if asr_allowed { "allowed" } else if asr_required { "blocked" } else { "not_required" }.to_string(),
        translation_status: if translation_allowed { "allowed" } else if translation_required { "blocked" } else { "not_required" }.to_string(),
        event_messages: messages,
    }
}

pub fn check_stale_job(request: StaleJobGuardRequest) -> StaleJobGuardReport {
    if request.active_session_id != request.callback_session_id {
        return StaleJobGuardReport {
            accepted: false,
            stale_job_rejected: true,
            reason: "session_mismatch".to_string(),
        };
    }
    if request.active_generation != request.callback_generation {
        return StaleJobGuardReport {
            accepted: false,
            stale_job_rejected: true,
            reason: "generation_mismatch".to_string(),
        };
    }
    StaleJobGuardReport {
        accepted: true,
        stale_job_rejected: false,
        reason: "accepted".to_string(),
    }
}

fn normalize_capture_mode(mode: &str) -> String {
    match mode.trim() {
        CAPTURE_MODE_DIAGNOSTIC_ONLY => CAPTURE_MODE_DIAGNOSTIC_ONLY.to_string(),
        CAPTURE_MODE_MOCK_PIPELINE => CAPTURE_MODE_MOCK_PIPELINE.to_string(),
        CAPTURE_MODE_REAL_ASR_MOCK_TRANSLATION => CAPTURE_MODE_REAL_ASR_MOCK_TRANSLATION.to_string(),
        CAPTURE_MODE_REAL_ASR_REAL_TRANSLATION => CAPTURE_MODE_REAL_ASR_REAL_TRANSLATION.to_string(),
        _ => CAPTURE_MODE_DIAGNOSTIC_ONLY.to_string(),
    }
}

fn reject_reason_code(reason: &str) -> String {
    let lowered = reason.to_lowercase();
    if lowered.contains("silence") {
        "rejected_silence"
    } else if lowered.contains("profan") || lowered.contains("nonsense") || lowered.contains("hallucination") || lowered.contains("contextless") {
        "rejected_content"
    } else if lowered.contains("focus") {
        "rejected_focus"
    } else if lowered.contains("energy") || lowered.contains("threshold") {
        "rejected_low_energy"
    } else if lowered.contains("snr") || lowered.contains("noise") {
        "rejected_low_snr"
    } else if lowered.contains("short") {
        "rejected_short_speech"
    } else if lowered.contains("clipping") {
        "rejected_clipping"
    } else if lowered.is_empty() {
        "rejected_unknown"
    } else {
        "rejected_other"
    }.to_string()
}
