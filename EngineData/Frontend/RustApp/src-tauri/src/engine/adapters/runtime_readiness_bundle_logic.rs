use serde::Serialize;

use crate::engine::adapters::live_runtime_pipeline_gate_logic::{
    analyze_live_runtime_pipeline_gate, LiveRuntimePipelineGateReport,
};
use crate::engine::adapters::native_capture_bridge_logic::{
    analyze_native_capture_bridge, NativeCaptureBridgeReport, NativeCaptureBridgeRequest,
};
use crate::engine::adapters::runtime_lifecycle_logic::{
    analyze_start_lifecycle_gate, analyze_stop_lifecycle_gate, RuntimeLifecycleGateReport,
};
use crate::engine::diagnostics::RuntimeDiagnostics;
use crate::engine::runtime_state::{
    latest_runtime_handoff_state, latest_runtime_session_state, RuntimeHandoffStateReport,
    RuntimeSessionStateReport,
};

#[derive(Debug, Clone, Serialize)]
pub struct RuntimeReadinessStage {
    pub stage: String,
    pub ready: bool,
    pub blocker: String,
    pub note: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct RuntimeReadinessBundleReport {
    pub ready_for_start_command: bool,
    pub ready_for_stop_command: bool,
    pub ready_for_capture_stream_creation: bool,
    pub ready_for_live_capture_runtime: bool,
    pub ready_for_native_inference_runtime: bool,
    pub ready_for_transcript_persistence: bool,
    pub ready_for_end_to_end_pipeline: bool,
    pub ready_for_user_facing_runtime: bool,
    pub diagnostics: RuntimeDiagnostics,
    pub handoff_state: RuntimeHandoffStateReport,
    pub session_state: RuntimeSessionStateReport,
    pub capture_bridge: NativeCaptureBridgeReport,
    pub pipeline_gate: LiveRuntimePipelineGateReport,
    pub start_gate: RuntimeLifecycleGateReport,
    pub stop_gate: RuntimeLifecycleGateReport,
    pub stages: Vec<RuntimeReadinessStage>,
    pub blockers: Vec<String>,
    pub note: String,
}

pub fn analyze_runtime_readiness_bundle() -> RuntimeReadinessBundleReport {
    let diagnostics = RuntimeDiagnostics::collect();
    let handoff_state = latest_runtime_handoff_state();
    let session_state = latest_runtime_session_state();
    let capture_bridge =
        analyze_native_capture_bridge(NativeCaptureBridgeRequest::default(), session_state.clone());
    let pipeline_gate = analyze_live_runtime_pipeline_gate();
    let start_gate = analyze_start_lifecycle_gate();
    let stop_gate = analyze_stop_lifecycle_gate();

    let ready_for_start_command = start_gate.allowed;
    let ready_for_stop_command = stop_gate.allowed && session_state.ready_for_stop;
    let ready_for_capture_stream_creation = capture_bridge.ready_for_stream_creation;
    let ready_for_live_capture_runtime = ready_for_capture_stream_creation
        && handoff_state
            .snapshot
            .as_ref()
            .map(|snapshot| snapshot.ready_for_live_capture)
            .unwrap_or(false);
    let ready_for_native_inference_runtime = ready_for_start_command
        && diagnostics.asr_adapter_plan.ready
        && diagnostics.translation_adapter_plan.ready
        && diagnostics.backend_validation.ready;
    let ready_for_transcript_persistence = diagnostics.session_store_status.ready;
    let ready_for_end_to_end_pipeline = pipeline_gate.ready_for_user_runtime;
    let ready_for_user_facing_runtime = ready_for_live_capture_runtime
        && ready_for_native_inference_runtime
        && ready_for_transcript_persistence
        && ready_for_end_to_end_pipeline
        && !diagnostics.final_runtime_allows_python;

    let stages = vec![
        RuntimeReadinessStage {
            stage: "handoff_snapshot".to_string(),
            ready: handoff_state.ready_for_start,
            blocker: handoff_state.blocker.clone(),
            note: handoff_state.note.clone(),
        },
        RuntimeReadinessStage {
            stage: "runtime_session".to_string(),
            ready: session_state.has_active_session,
            blocker: session_state.blocker.clone(),
            note: session_state.note.clone(),
        },
        RuntimeReadinessStage {
            stage: "start_gate".to_string(),
            ready: start_gate.allowed,
            blocker: start_gate.blocker.clone(),
            note: start_gate.note.clone(),
        },
        RuntimeReadinessStage {
            stage: "stop_gate".to_string(),
            ready: ready_for_stop_command,
            blocker: if ready_for_stop_command { String::new() } else { session_state.blocker.clone() },
            note: stop_gate.note.clone(),
        },
        RuntimeReadinessStage {
            stage: "capture_bridge".to_string(),
            ready: ready_for_capture_stream_creation,
            blocker: capture_bridge.blockers.join(","),
            note: capture_bridge.note.clone(),
        },
        RuntimeReadinessStage {
            stage: "live_capture_contract".to_string(),
            ready: ready_for_live_capture_runtime,
            blocker: if ready_for_live_capture_runtime { String::new() } else { "capture:not_runtime_ready".to_string() },
            note: "Live capture runtime is only considered ready after capture bridge contract, a fresh accepted handoff snapshot, and active session ownership.".to_string(),
        },
        RuntimeReadinessStage {
            stage: "native_inference_contract".to_string(),
            ready: ready_for_native_inference_runtime,
            blocker: if ready_for_native_inference_runtime { String::new() } else { diagnostics.backend_validation.blocker.clone() },
            note: "Native ASR and translation execution remain blocked until CUDA-capable backend validation is ready.".to_string(),
        },
        RuntimeReadinessStage {
            stage: "transcript_persistence".to_string(),
            ready: ready_for_transcript_persistence,
            blocker: if ready_for_transcript_persistence { String::new() } else { "session_store:not_ready".to_string() },
            note: diagnostics.session_store_status.note.clone(),
        },
        RuntimeReadinessStage {
            stage: "end_to_end_live_pipeline".to_string(),
            ready: ready_for_end_to_end_pipeline,
            blocker: if ready_for_end_to_end_pipeline { String::new() } else { pipeline_gate.blocker.clone() },
            note: pipeline_gate.note.clone(),
        },
        RuntimeReadinessStage {
            stage: "final_user_runtime".to_string(),
            ready: ready_for_user_facing_runtime,
            blocker: if ready_for_user_facing_runtime { String::new() } else { "runtime:not_ready_for_user_facing_claim".to_string() },
            note: "This bundle does not claim final readiness until real capture, ASR, translation, TTS/playback, persistence, and final validation are complete.".to_string(),
        },
    ];

    let mut blockers: Vec<String> = stages
        .iter()
        .filter(|stage| !stage.ready && !stage.blocker.is_empty())
        .map(|stage| format!("{}:{}", stage.stage, stage.blocker))
        .collect();

    blockers.extend(
        diagnostics
            .blockers
            .iter()
            .filter(|blocker| !blocker.is_empty())
            .cloned(),
    );
    blockers.sort();
    blockers.dedup();

    let note = if ready_for_user_facing_runtime {
        "Runtime readiness bundle reports user-facing readiness. Final validation must still be run before release.".to_string()
    } else if ready_for_end_to_end_pipeline {
        "Runtime pipeline gate is complete, but capture contract, persistence, or validation gates still block final readiness.".to_string()
    } else if ready_for_capture_stream_creation {
        "Runtime readiness bundle is ready for CPAL stream creation contract, but real end-to-end inference execution remains pending.".to_string()
    } else if session_state.has_active_session {
        "Runtime readiness bundle has an active preparing session but capture bridge or inference is still blocked.".to_string()
    } else {
        "Runtime readiness bundle is still blocked. This is expected during migration; no production-ready claim is made.".to_string()
    };

    RuntimeReadinessBundleReport {
        ready_for_start_command,
        ready_for_stop_command,
        ready_for_capture_stream_creation,
        ready_for_live_capture_runtime,
        ready_for_native_inference_runtime,
        ready_for_transcript_persistence,
        ready_for_end_to_end_pipeline,
        ready_for_user_facing_runtime,
        diagnostics,
        handoff_state,
        session_state,
        capture_bridge,
        pipeline_gate,
        start_gate,
        stop_gate,
        stages,
        blockers,
        note,
    }
}
