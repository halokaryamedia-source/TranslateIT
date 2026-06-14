use serde::{Deserialize, Serialize};

use crate::engine::transcript::{build_segment_from_request, SegmentBuildReport, SegmentBuildRequest};

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

pub fn analyze_segment_flow(request: SegmentFlowRequest) -> SegmentFlowReport {
    let segment = build_segment_from_request(request.segment);
    let mut blockers = Vec::new();

    if !request.capture_ready {
        blockers.push("capture:not_ready".to_string());
    }
    if request.session_id != segment.segment.session_id {
        blockers.push("session:mismatch".to_string());
    }
    if request.next_segment_id != segment.segment.segment_id {
        blockers.push("segment:mismatch".to_string());
    }
    if !segment.valid_duration {
        blockers.push(segment.warning.clone());
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
        session_id: segment.segment.session_id.clone(),
        segment_id: segment.segment.segment_id.clone(),
        ready_for_runtime_plan,
        segment,
        blockers,
        message,
    }
}
