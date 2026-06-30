use serde::Serialize;

use super::helper_bridge_runtime::unix_ms;
use super::pipeline_handoff::{
    get_live_meeting_runtime_gate_status, get_live_pipeline_session_snapshot, LiveMeetingRuntimeGateStatus,
};
use super::virtual_mic_route::{
    prepare_virtual_mic_output_route_runtime_stub, VirtualMicOutputRouteRuntimeStubStatus,
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

#[tauri::command]
pub fn get_professional_runtime_readiness_gate_status() -> ProfessionalRuntimeReadinessGateStatus {
    let live_gate = get_live_meeting_runtime_gate_status();
    let snapshot = get_live_pipeline_session_snapshot();
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
