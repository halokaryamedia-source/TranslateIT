use serde::{Deserialize, Serialize};

use crate::engine::adapters::frame_pipeline_logic::{analyze_frame_pipeline, FramePipelineReport, FramePipelineRequest};
use crate::engine::adapters::native_execution_bridge_logic::{build_native_execution_bridge, NativeExecutionBridgeReport, NativeExecutionBridgeRequest};
use crate::engine::adapters::segment_flow_logic::{analyze_segment_flow, SegmentFlowReport, SegmentFlowRequest};
use crate::engine::adapters::stream_ownership_logic::{analyze_stream_ownership, StreamOwnershipReport, StreamOwnershipRequest};
use crate::engine::transcript_session::{plan_transcript_session_paths, TranscriptSessionPlanReport, TranscriptSessionPlanRequest};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RealtimeHandoffRequest {
    pub stream: StreamOwnershipRequest,
    pub frame: FramePipelineRequest,
    pub segment: SegmentFlowRequest,
    pub native_execution: NativeExecutionBridgeRequest,
    pub transcript_save: TranscriptSessionPlanRequest,
    pub require_native_execution_ready: bool,
    pub require_save_plan_ready: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct RealtimeStageReadiness {
    pub stage: String,
    pub ready: bool,
    pub blocker_count: usize,
    pub note: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct RealtimeHandoffReport {
    pub stream: StreamOwnershipReport,
    pub frame: FramePipelineReport,
    pub segment: SegmentFlowReport,
    pub native_execution: NativeExecutionBridgeReport,
    pub transcript_save: TranscriptSessionPlanReport,
    pub stages: Vec<RealtimeStageReadiness>,
    pub ready_for_live_capture: bool,
    pub ready_for_segment_runtime: bool,
    pub ready_for_native_execution: bool,
    pub ready_for_safe_save: bool,
    pub ready_for_realtime_handoff: bool,
    pub blockers: Vec<String>,
    pub note: String,
}

pub fn analyze_realtime_handoff(request: RealtimeHandoffRequest) -> RealtimeHandoffReport {
    let stream = analyze_stream_ownership(request.stream);
    let frame = analyze_frame_pipeline(request.frame);
    let segment = analyze_segment_flow(request.segment);
    let native_execution = build_native_execution_bridge(request.native_execution);
    let transcript_save = plan_transcript_session_paths(request.transcript_save);

    let ready_for_live_capture = stream.ready_to_start_stream && frame.ready_for_segment_builder;
    let ready_for_segment_runtime = ready_for_live_capture && segment.ready_for_runtime_plan;
    let ready_for_native_execution = native_execution.ready_for_execution;
    let ready_for_safe_save = transcript_save.ready_to_save;

    let mut blockers = Vec::new();
    prefix_blockers("stream", &stream.blockers, &mut blockers);
    prefix_blockers("frame", &frame.blockers, &mut blockers);
    prefix_blockers("segment", &segment.blockers, &mut blockers);
    prefix_blockers("native_execution", &native_execution.blockers, &mut blockers);
    prefix_blockers("transcript_save", &transcript_save.paths.guard_blockers, &mut blockers);

    if request.require_native_execution_ready && !ready_for_native_execution {
        blockers.push("handoff:native_execution_required".to_string());
    }
    if request.require_save_plan_ready && !ready_for_safe_save {
        blockers.push("handoff:save_plan_required".to_string());
    }

    let ready_for_realtime_handoff = blockers.is_empty()
        && ready_for_segment_runtime
        && (!request.require_native_execution_ready || ready_for_native_execution)
        && (!request.require_save_plan_ready || ready_for_safe_save);

    let stages = vec![
        stage("stream_ownership", stream.ready_to_start_stream, stream.blockers.len(), &stream.note),
        stage("frame_pipeline", frame.ready_for_segment_builder, frame.blockers.len(), &frame.note),
        stage("segment_flow", segment.ready_for_runtime_plan, segment.blockers.len(), &segment.message),
        stage("native_execution", native_execution.ready_for_execution, native_execution.blockers.len(), &native_execution.note),
        stage("transcript_save", transcript_save.ready_to_save, transcript_save.paths.guard_blockers.len(), &transcript_save.message),
    ];

    let note = if ready_for_realtime_handoff {
        "Realtime handoff is ready for the next integration layer. This report does not execute microphone capture, ASR, translation, TTS, or file export.".to_string()
    } else {
        format!("Realtime handoff is blocked by {} guard(s). No runtime side effects were executed.", blockers.len())
    };

    RealtimeHandoffReport {
        stream,
        frame,
        segment,
        native_execution,
        transcript_save,
        stages,
        ready_for_live_capture,
        ready_for_segment_runtime,
        ready_for_native_execution,
        ready_for_safe_save,
        ready_for_realtime_handoff,
        blockers,
        note,
    }
}

fn prefix_blockers(prefix: &str, source: &[String], target: &mut Vec<String>) {
    target.extend(source.iter().map(|blocker| format!("{prefix}:{blocker}")));
}

fn stage(stage: &str, ready: bool, blocker_count: usize, note: &str) -> RealtimeStageReadiness {
    RealtimeStageReadiness {
        stage: stage.to_string(),
        ready,
        blocker_count,
        note: note.to_string(),
    }
}
