use serde::{Deserialize, Serialize};

use crate::engine::transcript::{build_segment_from_request, SegmentBuildReport, SegmentBuildRequest};

const MAX_SEGMENT_FLOW_ID_CHARS: usize = 96;
const MAX_SEGMENT_FLOW_TEXT_CHARS: usize = 4_000;
const MAX_LANGUAGE_LABEL_CHARS: usize = 32;
const MAX_REALTIME_LATENCY_MS: u32 = 60_000;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SegmentFlowRequest {
    pub capture_ready: bool,
    pub session_id: String,
    pub next_segment_id: String,
    pub segment: SegmentBuildRequest,
    pub vad_accepted: bool,
    pub asr_ready: bool,
    pub translation_ready: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct SegmentFlowReport {
    pub session_id: String,
    pub segment_id: String,
    pub ready_for_runtime_plan: bool,
    pub segment: SegmentBuildReport,
    pub blockers: Vec<String>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RealtimeTranslateStreamRequest {
    pub session_id: String,
    pub segment_id: String,
    pub source_language: String,
    pub target_language: String,
    pub partial_transcript: String,
    pub final_transcript: Option<String>,
    pub previous_translation: Option<String>,
    pub partial_translation: Option<String>,
    pub final_translation: Option<String>,
    pub asr_confidence: Option<f32>,
    pub translation_confidence: Option<f32>,
    pub elapsed_ms: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct RealtimeTranslateStreamReport {
    pub session_id: String,
    pub segment_id: String,
    pub direction_pair: String,
    pub stage: String,
    pub display_transcript: String,
    pub display_translation: String,
    pub should_emit_partial: bool,
    pub should_emit_final: bool,
    pub should_use_quality_fallback: bool,
    pub latency_warning: bool,
    pub blockers: Vec<String>,
    pub message: String,
}

fn is_unsafe_segment_flow_character(character: char) -> bool {
    character == '\0'
        || ('\u{0001}'..='\u{0008}').contains(&character)
        || ('\u{000b}'..='\u{001f}').contains(&character)
        || character == '\u{007f}'
        || ('\u{202a}'..='\u{202e}').contains(&character)
        || ('\u{2066}'..='\u{2069}').contains(&character)
}

fn clean(value: &str) -> String {
    value
        .chars()
        .filter(|character| !is_unsafe_segment_flow_character(*character))
        .take(MAX_SEGMENT_FLOW_TEXT_CHARS)
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn safe_id(value: &str, fallback: &str) -> String {
    let clean = value
        .trim()
        .chars()
        .map(|character| if character.is_ascii_alphanumeric() || matches!(character, '-' | '_') { character } else { '_' })
        .take(MAX_SEGMENT_FLOW_ID_CHARS)
        .collect::<String>();
    if clean.is_empty() { fallback.to_string() } else { clean }
}

fn safe_language(value: &str) -> String {
    let clean = value
        .trim()
        .chars()
        .filter(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
        .take(MAX_LANGUAGE_LABEL_CHARS)
        .collect::<String>()
        .to_lowercase();
    if clean.is_empty() { "unknown".to_string() } else { clean }
}

fn safe_confidence(value: Option<f32>) -> Option<f32> {
    value.map(|value| if value.is_finite() { value.clamp(0.0, 1.0) } else { 0.0 })
}

fn confidence_low(value: Option<f32>, threshold: f32) -> bool {
    value.map(|v| v < threshold).unwrap_or(false)
}

pub fn analyze_segment_flow(request: SegmentFlowRequest) -> SegmentFlowReport {
    let session_id = safe_id(&request.session_id, "session");
    let next_segment_id = safe_id(&request.next_segment_id, "segment");
    let segment = build_segment_from_request(request.segment);
    let segment_session_id = safe_id(&segment.segment.session_id, "session");
    let segment_id = safe_id(&segment.segment.segment_id, "segment");
    let mut blockers = Vec::new();

    if !request.capture_ready {
        blockers.push("capture:not_ready".to_string());
    }
    if session_id != segment_session_id {
        blockers.push("session:mismatch".to_string());
    }
    if next_segment_id != segment_id {
        blockers.push("segment:mismatch".to_string());
    }
    if !segment.valid_duration {
        blockers.push(clean(&segment.warning));
    }
    if !request.vad_accepted {
        blockers.push("vad:not_accepted".to_string());
    }
    if !request.asr_ready {
        blockers.push("asr:not_ready".to_string());
    }
    if !request.translation_ready {
        blockers.push("translation:not_ready".to_string());
    }

    let ready_for_runtime_plan = blockers.is_empty();
    let message = if ready_for_runtime_plan {
        "Segment flow is ready for runtime planning.".to_string()
    } else {
        format!("Segment flow is blocked by {} guard(s).", blockers.len())
    };

    SegmentFlowReport {
        session_id: segment_session_id,
        segment_id,
        ready_for_runtime_plan,
        segment,
        blockers,
        message,
    }
}

pub fn analyze_realtime_translate_stream(request: RealtimeTranslateStreamRequest) -> RealtimeTranslateStreamReport {
    let session_id = safe_id(&request.session_id, "session");
    let segment_id = safe_id(&request.segment_id, "segment");
    let source_language = safe_language(&request.source_language);
    let target_language = safe_language(&request.target_language);
    let partial_transcript = clean(&request.partial_transcript);
    let final_transcript = request.final_transcript.as_deref().map(clean).unwrap_or_default();
    let partial_translation = request.partial_translation.as_deref().map(clean).unwrap_or_default();
    let final_translation = request.final_translation.as_deref().map(clean).unwrap_or_default();
    let previous_translation = request.previous_translation.as_deref().map(clean).unwrap_or_default();
    let asr_confidence = safe_confidence(request.asr_confidence);
    let translation_confidence = safe_confidence(request.translation_confidence);
    let elapsed_ms = request.elapsed_ms.min(MAX_REALTIME_LATENCY_MS);

    let mut blockers = Vec::new();
    if session_id == "session" { blockers.push("session:missing".to_string()); }
    if segment_id == "segment" { blockers.push("segment:missing".to_string()); }
    if source_language == "unknown" || target_language == "unknown" { blockers.push("language:missing".to_string()); }
    if partial_transcript.is_empty() && final_transcript.is_empty() { blockers.push("transcript:missing".to_string()); }

    let has_final_transcript = !final_transcript.is_empty();
    let has_final_translation = !final_translation.is_empty();
    let has_partial_translation = !partial_translation.is_empty();
    let display_transcript = if has_final_transcript { final_transcript.clone() } else { partial_transcript.clone() };
    let display_translation = if has_final_translation {
        final_translation.clone()
    } else if has_partial_translation {
        partial_translation.clone()
    } else {
        previous_translation.clone()
    };

    let should_emit_final = blockers.is_empty() && has_final_transcript && has_final_translation;
    let should_emit_partial = blockers.is_empty() && !should_emit_final && !display_transcript.is_empty() && !display_translation.is_empty();
    let should_use_quality_fallback = confidence_low(asr_confidence, 0.55) || confidence_low(translation_confidence, 0.55);
    let latency_warning = elapsed_ms > 1200 && !should_emit_final;
    let stage = if should_emit_final {
        "final"
    } else if should_emit_partial {
        "partial"
    } else if blockers.is_empty() {
        "waiting"
    } else {
        "blocked"
    }.to_string();

    let message = if should_emit_final {
        "Final realtime translation segment is ready.".to_string()
    } else if should_emit_partial {
        "Partial realtime translation segment is ready.".to_string()
    } else if should_use_quality_fallback {
        "Realtime confidence is low; Quality fallback should be prepared.".to_string()
    } else if latency_warning {
        "Realtime segment is exceeding latency target.".to_string()
    } else if blockers.is_empty() {
        "Realtime segment is waiting for translation output.".to_string()
    } else {
        format!("Realtime segment is blocked by {} guard(s).", blockers.len())
    };

    RealtimeTranslateStreamReport {
        session_id,
        segment_id,
        direction_pair: format!("{}>{}", source_language, target_language),
        stage,
        display_transcript,
        display_translation,
        should_emit_partial,
        should_emit_final,
        should_use_quality_fallback,
        latency_warning,
        blockers,
        message,
    }
}