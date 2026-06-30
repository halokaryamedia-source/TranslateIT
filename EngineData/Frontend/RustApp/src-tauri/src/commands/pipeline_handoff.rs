use serde::Serialize;
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

use crate::engine::paths::ProjectPaths;

use super::asr_payload_boundary::get_latest_asr_audio_payload_status;
use super::helper_bridge::{get_helper_bridge_status, send_helper_worker_task, HelperBridgeWorkerResponse};
use super::helper_bridge_runtime::{unix_ms, HelperBridgeActionResult, HelperBridgeStatus};
use super::runtime_capture::{
    get_cached_asr_handoff_status, get_capture_transcript_boundary_status, prepare_asr_handoff_request,
    AsrHandoffRequestStatus,
};
use super::virtual_mic_route::get_virtual_mic_route_selection;

#[derive(Debug, Clone, Serialize)]
pub struct PipelineHandoffRequestStatus {
    pub stage: String,
    pub prerequisite_stage: String,
    pub prerequisite_ready: bool,
    pub request_prepared: bool,
    pub dispatch_attempted: bool,
    pub dispatch_ok: bool,
    pub state: String,
    pub message: String,
    pub blocker: String,
    pub next_action: String,
    pub generation_token: u64,
    pub runtime_claim: String,
    pub payload_json: String,
    pub updated_unix_ms: u128,
}

#[derive(Debug, Clone, Serialize)]
pub struct PipelinePayloadState {
    pub transcript_text: Option<String>,
    pub translated_text: Option<String>,
    pub tts_text: Option<String>,
    pub transcript_available: bool,
    pub translation_available: bool,
    pub tts_text_available: bool,
    pub tts_audio_output_path: Option<String>,
    pub audio_output_ready: bool,
    pub virtual_mic_ready: bool,
    pub virtual_mic_route_ready: bool,
    pub virtual_mic_output_device: Option<String>,
    pub virtual_mic_input_device: Option<String>,
    pub virtual_mic_blocker: String,
    pub virtual_mic_route_claim: String,
    pub virtual_mic_route_preference_path: Option<String>,
    pub source: String,
    pub updated_unix_ms: u128,
}

impl Default for PipelinePayloadState {
    fn default() -> Self {
        Self {
            transcript_text: None,
            translated_text: None,
            tts_text: None,
            transcript_available: false,
            translation_available: false,
            tts_text_available: false,
            tts_audio_output_path: None,
            audio_output_ready: false,
            virtual_mic_ready: false,
            virtual_mic_route_ready: false,
            virtual_mic_output_device: None,
            virtual_mic_input_device: None,
            virtual_mic_blocker: "virtual_mic:missing_tts_output".to_string(),
            virtual_mic_route_claim: "virtual_mic_route_not_prepared".to_string(),
            virtual_mic_route_preference_path: None,
            source: "empty".to_string(),
            updated_unix_ms: unix_ms(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct LivePipelineSessionSnapshot {
    pub ok: bool,
    pub state: String,
    pub progress_percent: u8,
    pub stage_count: usize,
    pub prepared_count: usize,
    pub dispatch_ok_count: usize,
    pub active_stage: String,
    pub active_blocker: String,
    pub next_action: String,
    pub summary: String,
    pub runtime_claim: String,
    pub evidence_path: Option<String>,
    pub payload: PipelinePayloadState,
    pub stages: Vec<PipelineHandoffRequestStatus>,
    pub updated_unix_ms: u128,
}

#[derive(Debug, Clone, Serialize)]
pub struct LiveMeetingRuntimeGateStatus {
    pub ready: bool,
    pub state: String,
    pub progress_percent: u8,
    pub blockers: Vec<String>,
    pub next_action: String,
    pub summary: String,
    pub capture_ready: bool,
    pub asr_ready: bool,
    pub transcript_ready: bool,
    pub translation_ready: bool,
    pub tts_ready: bool,
    pub audio_output_ready: bool,
    pub virtual_mic_ready: bool,
    pub virtual_mic_route_ready: bool,
    pub virtual_mic_output_device: Option<String>,
    pub virtual_mic_input_device: Option<String>,
    pub evidence_path: Option<String>,
    pub runtime_claim: String,
    pub updated_unix_ms: u128,
}

static TRANSLATION_HANDOFF_STATUS: OnceLock<Mutex<Option<PipelineHandoffRequestStatus>>> = OnceLock::new();
static TTS_HANDOFF_STATUS: OnceLock<Mutex<Option<PipelineHandoffRequestStatus>>> = OnceLock::new();
static PIPELINE_PAYLOAD_STATE: OnceLock<Mutex<PipelinePayloadState>> = OnceLock::new();

fn translation_status_runtime() -> &'static Mutex<Option<PipelineHandoffRequestStatus>> {
    TRANSLATION_HANDOFF_STATUS.get_or_init(|| Mutex::new(None))
}

fn tts_status_runtime() -> &'static Mutex<Option<PipelineHandoffRequestStatus>> {
    TTS_HANDOFF_STATUS.get_or_init(|| Mutex::new(None))
}

fn payload_state_runtime() -> &'static Mutex<PipelinePayloadState> {
    PIPELINE_PAYLOAD_STATE.get_or_init(|| Mutex::new(PipelinePayloadState::default()))
}

fn normalized_path_label(path: &Path) -> String {
    path.to_string_lossy().replace(char::from(92), "/")
}

fn latest_pipeline_evidence_path() -> PathBuf {
    let project_paths = ProjectPaths::discover();
    PathBuf::from(project_paths.user_log_dir)
        .join("RustAppValidation")
        .join("latest_live_pipeline_evidence.json")
}

fn write_pipeline_evidence(snapshot: &LivePipelineSessionSnapshot) -> Option<String> {
    let evidence_path = latest_pipeline_evidence_path();
    let parent = evidence_path.parent()?;
    let _ = fs::create_dir_all(parent);
    let evidence_payload = json!({
        "schema": "translateit.live_pipeline.evidence.v1",
        "snapshot": snapshot,
        "runtime_claim": "pipeline_evidence_file_source_side_not_runtime_proof",
        "written_unix_ms": unix_ms()
    });
    let body = serde_json::to_string_pretty(&evidence_payload).ok()?;
    fs::write(&evidence_path, body).ok()?;
    Some(normalized_path_label(&evidence_path))
}

fn record_stage_status(status: &PipelineHandoffRequestStatus) {
    let runtime = match status.stage.as_str() {
        "translation_handoff" => Some(translation_status_runtime()),
        "tts_handoff" => Some(tts_status_runtime()),
        _ => None,
    };
    if let Some(runtime) = runtime {
        if let Ok(mut cached) = runtime.lock() {
            *cached = Some(status.clone());
        }
    }
}

fn clear_stage_caches() {
    if let Ok(mut cached) = translation_status_runtime().lock() {
        *cached = None;
    }
    if let Ok(mut cached) = tts_status_runtime().lock() {
        *cached = None;
    }
    if let Ok(mut payload) = payload_state_runtime().lock() {
        *payload = PipelinePayloadState::default();
    }
}

fn cached_translation_status() -> Option<PipelineHandoffRequestStatus> {
    translation_status_runtime()
        .lock()
        .ok()
        .and_then(|cached| cached.clone())
}

fn cached_tts_status() -> Option<PipelineHandoffRequestStatus> {
    tts_status_runtime()
        .lock()
        .ok()
        .and_then(|cached| cached.clone())
}

fn current_payload_state() -> PipelinePayloadState {
    payload_state_runtime()
        .lock()
        .map(|payload| payload.clone())
        .unwrap_or_default()
}

fn current_asr_status() -> AsrHandoffRequestStatus {
    get_cached_asr_handoff_status().unwrap_or_else(prepare_asr_handoff_request)
}

fn normalize_seed_text(text: Option<String>, fallback: &str) -> String {
    text.unwrap_or_else(|| fallback.to_string()).trim().to_string()
}

fn set_transcript_payload(text: String, source: &str) {
    if let Ok(mut payload) = payload_state_runtime().lock() {
        payload.transcript_available = !text.is_empty();
        payload.transcript_text = if text.is_empty() { None } else { Some(text) };
        payload.source = source.to_string();
        payload.updated_unix_ms = unix_ms();
    }
}

fn set_translation_payload(text: String, source: &str) {
    if let Ok(mut payload) = payload_state_runtime().lock() {
        payload.translation_available = !text.is_empty();
        payload.tts_text_available = !text.is_empty();
        payload.translated_text = if text.is_empty() { None } else { Some(text.clone()) };
        payload.tts_text = if text.is_empty() { None } else { Some(text) };
        payload.source = source.to_string();
        payload.updated_unix_ms = unix_ms();
    }
}

fn set_tts_output_payload(output_path: String, audio_output_ready: bool, source: &str) {
    if let Ok(mut payload) = payload_state_runtime().lock() {
        payload.tts_audio_output_path = if output_path.is_empty() { None } else { Some(output_path) };
        payload.audio_output_ready = audio_output_ready && payload.tts_audio_output_path.is_some();
        payload.virtual_mic_ready = false;
        payload.virtual_mic_route_ready = false;
        payload.virtual_mic_output_device = None;
        payload.virtual_mic_input_device = None;
        payload.virtual_mic_blocker = if payload.audio_output_ready {
            "virtual_mic:output_not_prepared_yet".to_string()
        } else {
            "virtual_mic:missing_tts_output".to_string()
        };
        payload.virtual_mic_route_claim = "virtual_mic_route_not_prepared".to_string();
        payload.virtual_mic_route_preference_path = None;
        payload.source = source.to_string();
        payload.updated_unix_ms = unix_ms();
    }
}

fn set_virtual_mic_prepared() {
    let route = get_virtual_mic_route_selection();
    if let Ok(mut payload) = payload_state_runtime().lock() {
        payload.virtual_mic_output_device = route.selected_output_device.clone();
        payload.virtual_mic_input_device = route.selected_input_device.clone();
        payload.virtual_mic_route_preference_path = route.preference_path.clone();
        payload.virtual_mic_route_claim = route.runtime_claim.clone();
        if !payload.audio_output_ready || payload.tts_audio_output_path.is_none() {
            payload.virtual_mic_ready = false;
            payload.virtual_mic_route_ready = false;
            payload.virtual_mic_blocker = "virtual_mic:missing_tts_output".to_string();
        } else if !route.route_ready {
            payload.virtual_mic_ready = false;
            payload.virtual_mic_route_ready = false;
            payload.virtual_mic_blocker = route.blocker;
        } else {
            payload.virtual_mic_ready = true;
            payload.virtual_mic_route_ready = true;
            payload.virtual_mic_blocker = String::new();
            payload.source = "preferred_virtual_mic_route_prepared_from_tts_output_path".to_string();
        }
        payload.updated_unix_ms = unix_ms();
    }
}

fn dev_translation_placeholder(payload: &PipelinePayloadState) -> String {
    let transcript = payload
        .transcript_text
        .clone()
        .unwrap_or_else(|| "missing transcript".to_string());
    format!("[dev-contract translation pending for] {transcript}")
}

fn promote_translation_payload_after_contract(dispatch_ok: bool, payload: &PipelinePayloadState) {
    if !dispatch_ok || payload.translation_available {
        return;
    }
    set_translation_payload(
        dev_translation_placeholder(payload),
        "worker_dev_translation_contract_acceptance",
    );
}

fn transcript_from_worker_response(raw: &str) -> Option<String> {
    serde_json::from_str::<Value>(raw)
        .ok()
        .and_then(|value| value.get("transcript_text").and_then(Value::as_str).map(str::trim).map(str::to_string))
        .filter(|text| !text.is_empty())
}

fn translated_from_worker_response(raw: &str) -> Option<String> {
    let value = serde_json::from_str::<Value>(raw).ok()?;
    value
        .get("translated_text")
        .and_then(Value::as_str)
        .map(str::trim)
        .map(str::to_string)
        .filter(|text| !text.is_empty())
        .or_else(|| {
            value
                .get("contract_payload")
                .and_then(|payload| payload.get("translated_text"))
                .and_then(Value::as_str)
                .map(str::trim)
                .map(str::to_string)
                .filter(|text| !text.is_empty())
        })
}

fn tts_output_from_worker_response(raw: &str) -> (Option<String>, bool) {
    let Some(value) = serde_json::from_str::<Value>(raw).ok() else {
        return (None, false);
    };
    let output_path = value
        .get("output_path")
        .and_then(Value::as_str)
        .map(str::trim)
        .map(str::to_string)
        .filter(|text| !text.is_empty())
        .or_else(|| {
            value
                .get("contract_payload")
                .and_then(|payload| payload.get("output_path"))
                .and_then(Value::as_str)
                .map(str::trim)
                .map(str::to_string)
                .filter(|text| !text.is_empty())
        });
    let audio_output_ready = value
        .get("audio_output_ready")
        .and_then(Value::as_bool)
        .or_else(|| {
            value
                .get("contract_payload")
                .and_then(|payload| payload.get("audio_output_ready"))
                .and_then(Value::as_bool)
        })
        .unwrap_or(false);
    (output_path, audio_output_ready)
}

fn action_result_from_worker_response(response: &HelperBridgeWorkerResponse) -> HelperBridgeActionResult {
    HelperBridgeActionResult {
        ok: response.ok,
        state: response.state.clone(),
        message: response.message.clone(),
        generation_token: response.generation_token,
        runtime_claim: response.runtime_claim.clone(),
    }
}

fn dispatch_translation_worker_response(payload_json: &str) -> (HelperBridgeActionResult, Option<String>) {
    let payload = serde_json::from_str::<Value>(payload_json).unwrap_or_else(|_| json!({}));
    let response = send_helper_worker_task("translation_handoff", payload);
    let translated = translated_from_worker_response(&response.worker_response_json);
    (action_result_from_worker_response(&response), translated)
}

fn dispatch_tts_worker_response(payload_json: &str) -> (HelperBridgeActionResult, Option<String>, bool) {
    let payload = serde_json::from_str::<Value>(payload_json).unwrap_or_else(|_| json!({}));
    let response = send_helper_worker_task("tts_handoff", payload);
    let (output_path, audio_output_ready) = tts_output_from_worker_response(&response.worker_response_json);
    (action_result_from_worker_response(&response), output_path, audio_output_ready)
}

fn handoff_payload(stage: &str, helper: &HelperBridgeStatus, asr: &AsrHandoffRequestStatus, payload: &PipelinePayloadState) -> Value {
    json!({
        "command": stage,
        "generation_token": helper.generation_token,
        "source": "live_pipeline_handoff_stub",
        "asr_boundary_ready": asr.boundary_ready,
        "asr_request_prepared": asr.request_prepared,
        "asr_dispatch_attempted": asr.dispatch_attempted,
        "asr_dispatch_ok": asr.dispatch_ok,
        "frames_received": asr.frames_received,
        "buffered_duration_ms": asr.buffered_duration_ms,
        "transcript_available": payload.transcript_available,
        "translation_available": payload.translation_available,
        "tts_text_available": payload.tts_text_available,
        "audio_output_ready": payload.audio_output_ready,
        "virtual_mic_ready": payload.virtual_mic_ready,
        "virtual_mic_route_ready": payload.virtual_mic_route_ready,
        "transcript_text": payload.transcript_text,
        "translated_text": payload.translated_text,
        "tts_text": payload.tts_text,
        "tts_audio_output_path": payload.tts_audio_output_path,
        "virtual_mic_output_device": payload.virtual_mic_output_device,
        "virtual_mic_input_device": payload.virtual_mic_input_device,
        "virtual_mic_blocker": payload.virtual_mic_blocker,
        "virtual_mic_route_claim": payload.virtual_mic_route_claim,
        "virtual_mic_route_preference_path": payload.virtual_mic_route_preference_path,
        "payload_source": payload.source,
        "runtime_claim": "pipeline_handoff_metadata_and_dev_payload_no_runtime_proof"
    })
}

fn status_from_parts(
    stage: &str,
    prerequisite_stage: &str,
    prerequisite_ready: bool,
    request_prepared: bool,
    dispatch: Option<HelperBridgeActionResult>,
    payload_json: String,
    generation_token: u64,
    blocked_reason: &str,
    prepared_next_action: &str,
) -> PipelineHandoffRequestStatus {
    let dispatch_attempted = dispatch.is_some();
    let dispatch_ok = dispatch.as_ref().map(|result| result.ok).unwrap_or(false);
    let state = dispatch
        .as_ref()
        .map(|result| result.state.clone())
        .unwrap_or_else(|| if request_prepared { "request_ready".to_string() } else { "blocked".to_string() });
    let message = dispatch
        .as_ref()
        .map(|result| result.message.clone())
        .unwrap_or_else(|| {
            if request_prepared {
                format!("{stage} request prepared as metadata/dev-payload pipeline handoff stub.")
            } else {
                format!("{stage} request blocked before dispatch: {blocked_reason}")
            }
        });
    let blocker = if dispatch_ok || request_prepared {
        "".to_string()
    } else {
        blocked_reason.to_string()
    };
    let next_action = if dispatch_ok {
        format!("implement_worker_{stage}_runtime")
    } else if request_prepared {
        prepared_next_action.to_string()
    } else {
        format!("complete_{prerequisite_stage}_first")
    };

    PipelineHandoffRequestStatus {
        stage: stage.to_string(),
        prerequisite_stage: prerequisite_stage.to_string(),
        prerequisite_ready,
        request_prepared,
        dispatch_attempted,
        dispatch_ok,
        state,
        message,
        blocker,
        next_action,
        generation_token: dispatch
            .as_ref()
            .map(|result| result.generation_token)
            .unwrap_or(generation_token),
        runtime_claim: "pipeline_handoff_stub_no_runtime_claim".to_string(),
        payload_json,
        updated_unix_ms: unix_ms(),
    }
}

fn translation_prerequisite() -> (AsrHandoffRequestStatus, HelperBridgeStatus, PipelinePayloadState, String, bool) {
    let asr = current_asr_status();
    let helper = get_helper_bridge_status();
    let payload = current_payload_state();
    let payload_json = handoff_payload("translation_handoff", &helper, &asr, &payload).to_string();
    let ready = asr.dispatch_ok || payload.transcript_available;
    (asr, helper, payload, payload_json, ready)
}

fn tts_prerequisite() -> (AsrHandoffRequestStatus, HelperBridgeStatus, PipelinePayloadState, String, bool) {
    let asr = current_asr_status();
    let helper = get_helper_bridge_status();
    let payload = current_payload_state();
    let payload_json = handoff_payload("tts_handoff", &helper, &asr, &payload).to_string();
    let ready = payload.translation_available
        || cached_translation_status()
            .map(|status| status.dispatch_ok)
            .unwrap_or(false);
    (asr, helper, payload, payload_json, ready)
}

fn build_pipeline_snapshot(stages: Vec<PipelineHandoffRequestStatus>) -> LivePipelineSessionSnapshot {
    let payload = current_payload_state();
    let stage_count = stages.len();
    let prepared_count = stages.iter().filter(|stage| stage.request_prepared).count();
    let dispatch_ok_count = stages.iter().filter(|stage| stage.dispatch_ok).count();
    let payload_count = [
        payload.transcript_available,
        payload.translation_available,
        payload.tts_text_available,
        payload.audio_output_ready,
        payload.virtual_mic_ready,
        payload.virtual_mic_route_ready,
    ]
    .iter()
    .filter(|available| **available)
    .count();
    let first_blocked = stages
        .iter()
        .find(|stage| !stage.dispatch_ok && !stage.request_prepared)
        .or_else(|| stages.iter().find(|stage| !stage.dispatch_ok));
    let progress_percent = if stage_count == 0 {
        0
    } else {
        (((prepared_count + dispatch_ok_count) * 32 + payload_count * 15) / stage_count).min(100) as u8
    };
    let ok = stage_count > 0
        && stages.iter().all(|stage| stage.dispatch_ok)
        && payload.virtual_mic_ready
        && payload.virtual_mic_route_ready;
    let state = if ok {
        "virtual_mic_route_prepared_stub_dispatch".to_string()
    } else if prepared_count > 0 || dispatch_ok_count > 0 || payload_count > 0 {
        "partial_stub_progress".to_string()
    } else {
        "blocked".to_string()
    };
    let active_stage = if !payload.audio_output_ready && stages.iter().all(|stage| stage.dispatch_ok || stage.request_prepared) {
        "tts_handoff".to_string()
    } else if payload.audio_output_ready && !payload.virtual_mic_route_ready {
        "virtual_mic_route".to_string()
    } else {
        first_blocked
            .map(|stage| stage.stage.clone())
            .unwrap_or_else(|| "none".to_string())
    };
    let active_blocker = if payload.audio_output_ready && !payload.virtual_mic_route_ready {
        payload.virtual_mic_blocker.clone()
    } else {
        first_blocked
            .map(|stage| stage.blocker.clone())
            .unwrap_or_default()
    };
    let next_action = if payload.audio_output_ready && !payload.virtual_mic_route_ready {
        "prepare_virtual_mic_output_from_latest_tts".to_string()
    } else {
        first_blocked
            .map(|stage| stage.next_action.clone())
            .unwrap_or_else(|| "inspect_pipeline_runtime_proof".to_string())
    };
    let summary = format!(
        "{} stages, {} prepared, {} dispatch accepted, {} payload markers. Active blocker: {}.",
        stage_count,
        prepared_count,
        dispatch_ok_count,
        payload_count,
        if active_blocker.is_empty() { "none" } else { active_blocker.as_str() }
    );

    let mut snapshot = LivePipelineSessionSnapshot {
        ok,
        state,
        progress_percent,
        stage_count,
        prepared_count,
        dispatch_ok_count,
        active_stage,
        active_blocker,
        next_action,
        summary,
        runtime_claim: "pipeline_session_snapshot_source_side_not_runtime_proof".to_string(),
        evidence_path: None,
        payload,
        stages,
        updated_unix_ms: unix_ms(),
    };
    snapshot.evidence_path = write_pipeline_evidence(&snapshot);
    snapshot
}

fn build_live_meeting_runtime_gate(snapshot: LivePipelineSessionSnapshot) -> LiveMeetingRuntimeGateStatus {
    let capture_ready = snapshot
        .stages
        .iter()
        .find(|stage| stage.stage == "capture_transcript_boundary")
        .map(|stage| stage.request_prepared)
        .unwrap_or(false);
    let asr_ready = snapshot.payload.transcript_available;
    let transcript_ready = snapshot.payload.transcript_available;
    let translation_ready = snapshot.payload.translation_available;
    let tts_ready = snapshot.payload.tts_text_available;
    let audio_output_ready = snapshot.payload.audio_output_ready;
    let virtual_mic_ready = snapshot.payload.virtual_mic_ready;
    let virtual_mic_route_ready = snapshot.payload.virtual_mic_route_ready;
    let checks = [
        (capture_ready, "capture:boundary_not_ready"),
        (asr_ready, "asr:transcript_not_ready"),
        (transcript_ready, "pipeline:transcript_payload_missing"),
        (translation_ready, "translation:translated_text_missing"),
        (tts_ready, "tts:text_payload_missing"),
        (audio_output_ready, "tts:audio_output_not_ready"),
        (virtual_mic_ready && virtual_mic_route_ready, if snapshot.payload.virtual_mic_blocker.is_empty() { "virtual_mic:route_not_ready" } else { snapshot.payload.virtual_mic_blocker.as_str() }),
    ];
    let blockers = checks
        .iter()
        .filter_map(|(ready, blocker)| if *ready { None } else { Some((*blocker).to_string()) })
        .collect::<Vec<_>>();
    let ready_count = checks.iter().filter(|(ready, _)| *ready).count();
    let progress_percent = ((ready_count * 100) / checks.len()).min(100) as u8;
    let ready = blockers.is_empty();
    let next_action = blockers
        .first()
        .map(|blocker| match blocker.as_str() {
            "capture:boundary_not_ready" => "start_capture_and_wait_for_transcript_boundary",
            "asr:transcript_not_ready" | "pipeline:transcript_payload_missing" => "dispatch_asr_decode_and_promote_transcript",
            "translation:translated_text_missing" => "dispatch_translation_handoff_request",
            "tts:text_payload_missing" => "dispatch_tts_handoff_request",
            "tts:audio_output_not_ready" => "dispatch_tts_handoff_request",
            "virtual_mic:missing_tts_output" => "dispatch_tts_handoff_request",
            "virtual_mic:output_device_missing" | "virtual_mic:input_device_missing" => "install_or_select_virtual_audio_cable",
            "virtual_mic:selected_output_device_missing" | "virtual_mic:selected_input_device_missing" => "choose_existing_virtual_mic_route_device",
            _ => "inspect_live_pipeline_evidence",
        })
        .unwrap_or("ready_for_local_runtime_validation")
        .to_string();

    LiveMeetingRuntimeGateStatus {
        ready,
        state: if ready { "ready" } else { "blocked" }.to_string(),
        progress_percent,
        blockers,
        next_action,
        summary: if ready {
            "Live meeting runtime gate is source-side ready. This is still not runtime proof until local Windows validation runs.".to_string()
        } else {
            "Live meeting runtime gate is blocked by one or more source-side prerequisites.".to_string()
        },
        capture_ready,
        asr_ready,
        transcript_ready,
        translation_ready,
        tts_ready,
        audio_output_ready,
        virtual_mic_ready,
        virtual_mic_route_ready,
        virtual_mic_output_device: snapshot.payload.virtual_mic_output_device.clone(),
        virtual_mic_input_device: snapshot.payload.virtual_mic_input_device.clone(),
        evidence_path: snapshot.evidence_path.clone(),
        runtime_claim: "live_meeting_runtime_gate_source_side_not_windows_runtime_proof".to_string(),
        updated_unix_ms: unix_ms(),
    }
}

#[tauri::command]
pub fn seed_dev_asr_transcript(text: Option<String>) -> LivePipelineSessionSnapshot {
    let transcript = normalize_seed_text(text, "Hello from TranslateIT developer transcript seed.");
    set_transcript_payload(transcript, "developer_diagnostics_seed_transcript");
    let _ = prepare_translation_handoff_request();
    build_pipeline_snapshot(get_live_pipeline_handoff_status())
}

#[tauri::command]
pub fn promote_latest_asr_payload_transcript() -> LivePipelineSessionSnapshot {
    let asr_payload = get_latest_asr_audio_payload_status();
    if asr_payload.dispatch_ok && asr_payload.transcript_text_present {
        if let Some(transcript) = transcript_from_worker_response(&asr_payload.worker_response_json) {
            set_transcript_payload(transcript, "asr_decode_worker_response_promoted_after_guarded_validation");
            let _ = prepare_translation_handoff_request();
        }
    }
    build_pipeline_snapshot(get_live_pipeline_handoff_status())
}

#[tauri::command]
pub fn seed_dev_translated_text(text: Option<String>) -> LivePipelineSessionSnapshot {
    let translated = normalize_seed_text(text, "Halo dari seed terjemahan developer TranslateIT.");
    set_translation_payload(translated, "developer_diagnostics_seed_translation");
    let _ = prepare_tts_handoff_request();
    build_pipeline_snapshot(get_live_pipeline_handoff_status())
}

#[tauri::command]
pub fn prepare_virtual_mic_output_from_latest_tts() -> LivePipelineSessionSnapshot {
    set_virtual_mic_prepared();
    build_pipeline_snapshot(get_live_pipeline_handoff_status())
}

#[tauri::command]
pub fn get_live_meeting_runtime_gate_status() -> LiveMeetingRuntimeGateStatus {
    build_live_meeting_runtime_gate(build_pipeline_snapshot(get_live_pipeline_handoff_status()))
}

#[tauri::command]
pub fn prepare_translation_handoff_request() -> PipelineHandoffRequestStatus {
    let (asr, helper, payload, payload_json, ready) = translation_prerequisite();
    let status = status_from_parts(
        "translation_handoff",
        "asr_handoff_or_seeded_transcript",
        ready,
        ready,
        None,
        payload_json,
        helper.generation_token,
        if asr.dispatch_ok || payload.transcript_available { "" } else { "translation_handoff:missing_asr_transcript" },
        "dispatch_translation_handoff_request",
    );
    record_stage_status(&status);
    status
}

#[tauri::command]
pub fn dispatch_translation_handoff_request() -> PipelineHandoffRequestStatus {
    let (_asr, helper, payload, payload_json, ready) = translation_prerequisite();
    let status = if !ready {
        status_from_parts(
            "translation_handoff",
            "asr_handoff_or_seeded_transcript",
            ready,
            false,
            None,
            payload_json,
            helper.generation_token,
            "translation_handoff:missing_asr_transcript",
            "complete_asr_handoff_or_seed_dev_transcript_first",
        )
    } else {
        let (dispatch, translated_text) = dispatch_translation_worker_response(&payload_json);
        let dispatch_ok = dispatch.ok;
        let status = status_from_parts(
            "translation_handoff",
            "asr_handoff_or_seeded_transcript",
            ready,
            true,
            Some(dispatch),
            payload_json,
            helper.generation_token,
            "",
            "implement_translation_runtime",
        );
        if dispatch_ok {
            if let Some(translated_text) = translated_text {
                set_translation_payload(
                    translated_text,
                    "translation_handoff_worker_response_promoted_after_guarded_validation",
                );
            } else {
                promote_translation_payload_after_contract(true, &payload);
            }
        }
        status
    };
    record_stage_status(&status);
    status
}

#[tauri::command]
pub fn prepare_tts_handoff_request() -> PipelineHandoffRequestStatus {
    let (_asr, helper, _payload, payload_json, ready) = tts_prerequisite();
    let status = status_from_parts(
        "tts_handoff",
        "translation_handoff_or_seeded_translation",
        ready,
        ready,
        None,
        payload_json,
        helper.generation_token,
        "tts_handoff:missing_translated_text",
        "dispatch_tts_handoff_request",
    );
    record_stage_status(&status);
    status
}

#[tauri::command]
pub fn dispatch_tts_handoff_request() -> PipelineHandoffRequestStatus {
    let (_asr, helper, _payload, payload_json, ready) = tts_prerequisite();
    let status = if !ready {
        status_from_parts(
            "tts_handoff",
            "translation_handoff_or_seeded_translation",
            ready,
            false,
            None,
            payload_json,
            helper.generation_token,
            "tts_handoff:missing_translated_text",
            "complete_translation_handoff_or_seed_dev_translation_first",
        )
    } else {
        let (dispatch, output_path, audio_output_ready) = dispatch_tts_worker_response(&payload_json);
        let dispatch_ok = dispatch.ok;
        let status = status_from_parts(
            "tts_handoff",
            "translation_handoff_or_seeded_translation",
            ready,
            true,
            Some(dispatch),
            payload_json,
            helper.generation_token,
            "",
            "implement_tts_runtime",
        );
        if dispatch_ok {
            if let Some(output_path) = output_path {
                set_tts_output_payload(
                    output_path,
                    audio_output_ready,
                    "tts_handoff_worker_response_promoted_after_guarded_validation",
                );
            }
        }
        status
    };
    record_stage_status(&status);
    status
}

#[tauri::command]
pub fn run_dev_pipeline_contract_smoke() -> LivePipelineSessionSnapshot {
    clear_stage_caches();
    set_transcript_payload(
        "Hello from the TranslateIT dev pipeline contract smoke.".to_string(),
        "developer_contract_smoke_transcript",
    );
    let translation = dispatch_translation_handoff_request();
    if translation.dispatch_ok && !current_payload_state().translation_available {
        set_translation_payload(
            "Halo dari smoke contract TranslateIT.".to_string(),
            "developer_contract_smoke_translation_fallback",
        );
    }
    let _ = dispatch_tts_handoff_request();
    build_pipeline_snapshot(get_live_pipeline_handoff_status())
}

#[tauri::command]
pub fn get_live_pipeline_handoff_status() -> Vec<PipelineHandoffRequestStatus> {
    let capture_boundary = get_capture_transcript_boundary_status();
    let asr = current_asr_status();
    let translation = cached_translation_status().unwrap_or_else(prepare_translation_handoff_request);
    let tts = cached_tts_status().unwrap_or_else(prepare_tts_handoff_request);
    vec![
        PipelineHandoffRequestStatus {
            stage: "capture_transcript_boundary".to_string(),
            prerequisite_stage: "capture".to_string(),
            prerequisite_ready: capture_boundary.existing_capture_active,
            request_prepared: capture_boundary.transcript_handoff_ready,
            dispatch_attempted: capture_boundary.capture_dispatch_attempted,
            dispatch_ok: capture_boundary.capture_dispatch_ok,
            state: if capture_boundary.transcript_handoff_ready { "request_ready" } else { "blocked" }.to_string(),
            message: if capture_boundary.transcript_handoff_ready {
                "Capture transcript boundary is ready for ASR handoff.".to_string()
            } else {
                format!("Capture transcript boundary blocked: {}", capture_boundary.blocker)
            },
            blocker: capture_boundary.blocker,
            next_action: capture_boundary.next_action,
            generation_token: 0,
            runtime_claim: capture_boundary.runtime_claim,
            payload_json: "{}".to_string(),
            updated_unix_ms: unix_ms(),
        },
        PipelineHandoffRequestStatus {
            stage: "asr_handoff".to_string(),
            prerequisite_stage: "capture_transcript_boundary".to_string(),
            prerequisite_ready: asr.boundary_ready,
            request_prepared: asr.request_prepared,
            dispatch_attempted: asr.dispatch_attempted,
            dispatch_ok: asr.dispatch_ok,
            state: asr.state,
            message: asr.message,
            blocker: asr.blocker,
            next_action: asr.next_action,
            generation_token: asr.generation_token,
            runtime_claim: asr.runtime_claim,
            payload_json: asr.payload_json,
            updated_unix_ms: unix_ms(),
        },
        translation,
        tts,
    ]
}

#[tauri::command]
pub fn get_live_pipeline_session_snapshot() -> LivePipelineSessionSnapshot {
    build_pipeline_snapshot(get_live_pipeline_handoff_status())
}

#[tauri::command]
pub fn reset_live_pipeline_handoff_status() -> LivePipelineSessionSnapshot {
    clear_stage_caches();
    let _ = prepare_asr_handoff_request();
    build_pipeline_snapshot(get_live_pipeline_handoff_status())
}
