use serde::Serialize;

use super::helper_bridge_runtime::unix_ms;
use super::pipeline_handoff::{
    get_live_meeting_runtime_gate_status, get_live_pipeline_session_snapshot, LiveMeetingRuntimeGateStatus,
    LivePipelineSessionSnapshot,
};
use super::virtual_mic_route::{
    get_virtual_mic_route_contract_status, prepare_virtual_mic_output_route_runtime_stub,
    VirtualMicOutputRouteRuntimeStubStatus, VirtualMicRouteContractStatus,
};

#[derive(Debug, Clone, Serialize)]
pub struct ProfessionalRuntimeReadinessGateStatus {
    pub ok: bool,
    pub state: String,
    pub progress_percent: u8,
    pub blockers: Vec<String>,
    pub next_action: String,
    pub summary: String,
    pub live_gate: LiveMeetingRuntimeGateStatus,
    pub route_stub: VirtualMicOutputRouteRuntimeStubStatus,
    pub source_audio_path_ready: bool,
    pub route_stub_ready: bool,
    pub route_stub_source_audio_path: Option<String>,
    pub route_stub_evidence_path: Option<String>,
    pub route_stub_blocker: String,
    pub runtime_claim: String,
    pub updated_unix_ms: u128,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProfessionalSourceOrchestrationStep {
    pub name: String,
    pub ready: bool,
    pub blocker: String,
    pub next_action: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProfessionalSourceReadinessOrchestrationStatus {
    pub ok: bool,
    pub state: String,
    pub development_progress_percent_excluding_ci_local: u8,
    pub remaining_development_gaps: Vec<String>,
    pub steps: Vec<ProfessionalSourceOrchestrationStep>,
    pub pipeline_snapshot: LivePipelineSessionSnapshot,
    pub route_status: VirtualMicRouteContractStatus,
    pub route_stub: VirtualMicOutputRouteRuntimeStubStatus,
    pub professional_gate: ProfessionalRuntimeReadinessGateStatus,
    pub next_action: String,
    pub summary: String,
    pub runtime_claim: String,
    pub updated_unix_ms: u128,
}

fn next_action_for(blockers: &[String]) -> String {
    blockers
        .first()
        .map(|blocker| match blocker.as_str() {
            "virtual_route:missing_source_audio_path" => "dispatch_tts_handoff_request_then_route_stub",
            "virtual_mic:missing_tts_output" => "dispatch_tts_handoff_request",
            "virtual_mic:output_device_missing" | "virtual_mic:input_device_missing" => {
                "install_or_enable_virtual_audio_cable"
            }
            "virtual_mic:selected_output_device_missing" | "virtual_mic:selected_input_device_missing" => {
                "choose_existing_virtual_mic_route_device"
            }
            "route_stub:not_ready" => "prepare_virtual_mic_output_route_runtime_stub_from_latest_tts",
            _ => "continue_source_side_runtime_prerequisite_fix",
        })
        .unwrap_or("ready_for_ci_then_local_validation")
        .to_string()
}

fn professional_gate_from_parts(
    live_gate: LiveMeetingRuntimeGateStatus,
    snapshot: &LivePipelineSessionSnapshot,
) -> ProfessionalRuntimeReadinessGateStatus {
    let source_audio_path = snapshot.payload.tts_audio_output_path.clone();
    let route_stub = prepare_virtual_mic_output_route_runtime_stub(source_audio_path.clone());
    let source_audio_path_ready = source_audio_path
        .as_ref()
        .map(|path| !path.trim().is_empty())
        .unwrap_or(false);
    let route_stub_ready = route_stub.route_stub_ready;

    let mut blockers = live_gate.blockers.clone();
    if !route_stub_ready {
        if route_stub.blocker.is_empty() {
            blockers.push("route_stub:not_ready".to_string());
        } else {
            blockers.push(route_stub.blocker.clone());
        }
    }
    blockers.sort();
    blockers.dedup();

    let route_stub_score = if route_stub_ready { 100u16 } else { 0u16 };
    let progress_percent = (((live_gate.progress_percent as u16) * 4 + route_stub_score) / 5).min(100) as u8;
    let ok = blockers.is_empty() && live_gate.ready && route_stub_ready;
    let next_action = next_action_for(&blockers);
    let route_stub_blocker = route_stub.blocker.clone();

    ProfessionalRuntimeReadinessGateStatus {
        ok,
        state: if ok { "ready" } else { "blocked" }.to_string(),
        progress_percent,
        blockers,
        next_action,
        summary: if ok {
            "Professional source-side gate is ready for CI and local validation. This is still not Windows runtime proof.".to_string()
        } else {
            "Professional source-side gate is still blocked by live pipeline or route-stub prerequisites.".to_string()
        },
        live_gate,
        route_stub: route_stub.clone(),
        source_audio_path_ready,
        route_stub_ready,
        route_stub_source_audio_path: route_stub.source_audio_path.clone(),
        route_stub_evidence_path: route_stub.evidence_path.clone(),
        route_stub_blocker,
        runtime_claim: "professional_runtime_readiness_gate_source_side_not_runtime_proof".to_string(),
        updated_unix_ms: unix_ms(),
    }
}

fn step(name: &str, ready: bool, blocker: String, next_action: String) -> ProfessionalSourceOrchestrationStep {
    ProfessionalSourceOrchestrationStep {
        name: name.to_string(),
        ready,
        blocker,
        next_action,
    }
}

fn development_gaps(
    route_status: &VirtualMicRouteContractStatus,
    route_stub: &VirtualMicOutputRouteRuntimeStubStatus,
    professional_gate: &ProfessionalRuntimeReadinessGateStatus,
) -> Vec<String> {
    let mut gaps = Vec::new();
    if !route_status.route_ready {
        gaps.push("route_device_selection_or_virtual_audio_device_not_ready".to_string());
    }
    if !route_stub.source_audio_ready {
        gaps.push("tts_audio_output_path_not_available_for_route_stub".to_string());
    }
    if !route_stub.route_stub_ready {
        gaps.push("route_runtime_stub_not_ready".to_string());
    }
    if !professional_gate.ok {
        gaps.push("professional_gate_still_blocked".to_string());
    }
    gaps.push("user_facing_route_device_selection_surface_not_finished".to_string());
    gaps.push("real_audio_output_route_runtime_not_implemented".to_string());
    gaps
}

fn development_progress_excluding_ci_local(gaps: &[String]) -> u8 {
    let weighted_total = 100u16;
    let mut missing = 0u16;
    for gap in gaps {
        missing += match gap.as_str() {
            "user_facing_route_device_selection_surface_not_finished" => 6,
            "real_audio_output_route_runtime_not_implemented" => 10,
            "route_runtime_stub_not_ready" => 4,
            "tts_audio_output_path_not_available_for_route_stub" => 3,
            "route_device_selection_or_virtual_audio_device_not_ready" => 3,
            "professional_gate_still_blocked" => 2,
            _ => 2,
        };
    }
    weighted_total.saturating_sub(missing).max(0).min(100) as u8
}

#[tauri::command]
pub fn get_professional_runtime_readiness_gate_status() -> ProfessionalRuntimeReadinessGateStatus {
    let live_gate = get_live_meeting_runtime_gate_status();
    let snapshot = get_live_pipeline_session_snapshot();
    professional_gate_from_parts(live_gate, &snapshot)
}

#[tauri::command]
pub fn run_professional_source_readiness_orchestration() -> ProfessionalSourceReadinessOrchestrationStatus {
    let pipeline_snapshot = get_live_pipeline_session_snapshot();
    let live_gate = get_live_meeting_runtime_gate_status();
    let route_status = get_virtual_mic_route_contract_status();
    let source_audio_path = pipeline_snapshot.payload.tts_audio_output_path.clone();
    let route_stub = prepare_virtual_mic_output_route_runtime_stub(source_audio_path);
    let professional_gate = professional_gate_from_parts(live_gate, &pipeline_snapshot);

    let steps = vec![
        step(
            "pipeline_snapshot",
            pipeline_snapshot.ok,
            pipeline_snapshot.active_blocker.clone(),
            pipeline_snapshot.next_action.clone(),
        ),
        step(
            "virtual_route_status",
            route_status.route_ready,
            route_status.blocker.clone(),
            route_status.next_action.clone(),
        ),
        step(
            "route_runtime_stub",
            route_stub.route_stub_ready,
            route_stub.blocker.clone(),
            route_stub.next_action.clone(),
        ),
        step(
            "professional_gate",
            professional_gate.ok,
            professional_gate.route_stub_blocker.clone(),
            professional_gate.next_action.clone(),
        ),
    ];

    let gaps = development_gaps(&route_status, &route_stub, &professional_gate);
    let development_progress_percent_excluding_ci_local = development_progress_excluding_ci_local(&gaps);
    let ok = gaps
        .iter()
        .all(|gap| !gap.contains("not_ready") && !gap.contains("not_available"));
    let next_action = gaps
        .first()
        .map(|gap| match gap.as_str() {
            "route_device_selection_or_virtual_audio_device_not_ready" => "select_or_install_virtual_route_device",
            "tts_audio_output_path_not_available_for_route_stub" => "finish_tts_audio_output_handoff_then_route_stub",
            "route_runtime_stub_not_ready" => "prepare_route_runtime_stub_from_latest_tts_output",
            "professional_gate_still_blocked" => "inspect_professional_gate_blockers",
            "user_facing_route_device_selection_surface_not_finished" => "build_user_facing_route_device_selection_surface",
            "real_audio_output_route_runtime_not_implemented" => "implement_guarded_real_audio_output_route_runtime",
            _ => "continue_professional_source_development",
        })
        .unwrap_or("ready_for_ci_source_contract_validation")
        .to_string();

    ProfessionalSourceReadinessOrchestrationStatus {
        ok,
        state: if ok { "source_development_ready" } else { "source_development_incomplete" }.to_string(),
        development_progress_percent_excluding_ci_local,
        remaining_development_gaps: gaps,
        steps,
        pipeline_snapshot,
        route_status,
        route_stub,
        professional_gate,
        next_action,
        summary: "Development-only progress excludes CI, local compile, Windows runtime, and end-to-end proof.".to_string(),
        runtime_claim: "professional_source_orchestration_development_only_not_ci_local_runtime_proof".to_string(),
        updated_unix_ms: unix_ms(),
    }
}
