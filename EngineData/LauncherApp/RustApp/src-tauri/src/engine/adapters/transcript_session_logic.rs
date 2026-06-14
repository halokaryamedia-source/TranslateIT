use serde::Serialize;

use crate::engine::transcript_session::{summarize_transcript_session, TranscriptSessionRecord, TranscriptSessionSummary};

#[derive(Debug, Clone, Serialize)]
pub struct TranscriptSessionReadinessReport {
    pub summary: TranscriptSessionSummary,
    pub ready_for_preview: bool,
    pub blockers: Vec<String>,
}

pub fn analyze_transcript_session_readiness(session: TranscriptSessionRecord) -> TranscriptSessionReadinessReport {
    let summary = summarize_transcript_session(&session);
    let mut blockers = Vec::new();
    if session.session_id.trim().is_empty() {
        blockers.push("session_id:empty".to_string());
    }
    if session.segments.is_empty() {
        blockers.push("segments:empty".to_string());
    }
    if session.input_language.trim().is_empty() {
        blockers.push("input_language:empty".to_string());
    }
    if session.output_language.trim().is_empty() {
        blockers.push("output_language:empty".to_string());
    }
    TranscriptSessionReadinessReport {
        summary,
        ready_for_preview: blockers.is_empty(),
        blockers,
    }
}
