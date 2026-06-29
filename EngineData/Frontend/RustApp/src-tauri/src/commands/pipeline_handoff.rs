use serde::Serialize;
use serde_json::{json, Value};
use std::sync::{Mutex, OnceLock};

use super::helper_bridge::{get_helper_bridge_status, send_helper_bridge_request};
use super::helper_bridge_runtime::{unix_ms, HelperBridgeActionResult, HelperBridgeRequest, HelperBridgeStatus};
use super::runtime_capture::{
    get_cached_asr_handoff_status, get_capture_transcript_boundary_status, prepare_asr_handoff_request,
    AsrHandoffRequestStatus,
};

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
    pub stages: Vec<PipelineHandoffRequestStatus>,
    pub updated_unix_ms: u128,
}

static TRANSLATION_HANDOFF_STATUS: OnceLock<Mutex<Option<PipelineHandoffRequestStatus>>> = OnceLock::new();
static TTS_HANDOFF_STATUS: OnceLock<Mutex<Option<PipelineHandoffRequestStatus>>> = OnceLock::new();

fn translation_status_runtime() -> &'static Mutex<Option<PipelineHandoffRequestStatus>> {
    TRANSLATION_HANDOFF_STATUS.get_or_init(|| Mutex::new(None))
}

fn tts_status_runtime() -> &'static Mutex<Option<PipelineHandoffRequestStatus>> {
    TTS_HANDOFF_STATUS.get_or_init(|| Mutex::new(None))
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

fn current_asr_status() -> AsrHandoffRequestStatus {
    get_cached_asr_handoff_status().unwrap_or_else(prepare_asr_handoff_request)
}

fn handoff_payload(stage: &str, helper: &HelperBridgeStatus, asr: &AsrHandoffRequestStatus) -> Value {
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
        "runtime_claim": "pipeline_handoff_metadata_only_no_runtime_payload"
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
                format!("{stage} request prepared as metadata-only pipeline handoff stub.")
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

fn translation_prerequisite() -> (AsrHandoffRequestStatus, HelperBridgeStatus, String, bool) {
    let asr = current_asr_status();
    let helper = get_helper_bridge_status();
    let payload_json = handoff_payload("translation_handoff", &helper, &asr).to_string();
    let ready = asr.dispatch_ok;
    (asr, helper, payload_json, ready)
}

fn tts_prerequisite() -> (AsrHandoffRequestStatus, HelperBridgeStatus, String, bool) {
    let asr = current_asr_status();
    let helper = get_helper_bridge_status();
    let payload_json = handoff_payload("tts_handoff", &helper, &asr).to_string();
    let ready = cached_translation_status()
        .map(|status| status.dispatch_ok)
        .unwrap_or(false);
    (asr, helper, payload_json, ready)
}

fn build_pipeline_snapshot(stages: Vec<PipelineHandoffRequestStatus>) -> LivePipelineSessionSnapshot {
    let stage_count = stages.len();
    let prepared_count = stages.iter().filter(|stage| stage.request_prepared).count();
    let dispatch_ok_count = stages.iter().filter(|stage| stage.dispatch_ok).count();
    let first_blocked = stages
        .iter()
        .find(|stage| !stage.dispatch_ok && !stage.request_prepared)
        .or_else(|| stages.iter().find(|stage| !stage.dispatch_ok));
    let progress_percent = if stage_count == 0 {
        0
    } else {
        (((prepared_count + dispatch_ok_count) * 50) / stage_count).min(100) as u8
    };
    let ok = stage_count > 0 && stages.iter().all(|stage| stage.dispatch_ok);
    let state = if ok {
        "complete_stub_dispatch".to_string()
    } else if prepared_count > 0 || dispatch_ok_count > 0 {
        "partial_stub_progress".to_string()
    } else {
        "blocked".to_string()
    };
    let active_stage = first_blocked
        .map(|stage| stage.stage.clone())
        .unwrap_or_else(|| "none".to_string());
    let active_blocker = first_blocked
        .map(|stage| stage.blocker.clone())
        .unwrap_or_default();
    let next_action = first_blocked
        .map(|stage| stage.next_action.clone())
        .unwrap_or_else(|| "inspect_pipeline_runtime_proof".to_string());
    let summary = format!(
        "{} stages, {} prepared, {} dispatch accepted. Active blocker: {}.",
        stage_count,
        prepared_count,
        dispatch_ok_count,
        if active_blocker.is_empty() { "none" } else { active_blocker.as_str() }
    );

    LivePipelineSessionSnapshot {
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
        stages,
        updated_unix_ms: unix_ms(),
    }
}

#[tauri::command]
pub fn prepare_translation_handoff_request() -> PipelineHandoffRequestStatus {
    let (asr, helper, payload_json, ready) = translation_prerequisite();
    let status = status_from_parts(
        "translation_handoff",
        "asr_handoff",
        ready,
        ready,
        None,
        payload_json,
        helper.generation_token,
        if asr.dispatch_ok { "" } else { "translation_handoff:missing_asr_transcript" },
        "dispatch_translation_handoff_request",
    );
    record_stage_status(&status);
    status
}

#[tauri::command]
pub fn dispatch_translation_handoff_request() -> PipelineHandoffRequestStatus {
    let (_asr, helper, payload_json, ready) = translation_prerequisite();
    let status = if !ready {
        status_from_parts(
            "translation_handoff",
            "asr_handoff",
            ready,
            false,
            None,
            payload_json,
            helper.generation_token,
            "translation_handoff:missing_asr_transcript",
            "complete_asr_handoff_first",
        )
    } else {
        let request = HelperBridgeRequest {
            task: "translation_handoff".to_string(),
            payload_json: Some(payload_json.clone()),
        };
        let dispatch = send_helper_bridge_request(request);
        status_from_parts(
            "translation_handoff",
            "asr_handoff",
            ready,
            true,
            Some(dispatch),
            payload_json,
            helper.generation_token,
            "",
            "implement_translation_runtime",
        )
    };
    record_stage_status(&status);
    status
}

#[tauri::command]
pub fn prepare_tts_handoff_request() -> PipelineHandoffRequestStatus {
    let (_asr, helper, payload_json, ready) = tts_prerequisite();
    let status = status_from_parts(
        "tts_handoff",
        "translation_handoff",
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
    let (_asr, helper, payload_json, ready) = tts_prerequisite();
    let status = if !ready {
        status_from_parts(
            "tts_handoff",
            "translation_handoff",
            ready,
            false,
            None,
            payload_json,
            helper.generation_token,
            "tts_handoff:missing_translated_text",
            "complete_translation_handoff_first",
        )
    } else {
        let request = HelperBridgeRequest {
            task: "tts_handoff".to_string(),
            payload_json: Some(payload_json.clone()),
        };
        let dispatch = send_helper_bridge_request(request);
        status_from_parts(
            "tts_handoff",
            "translation_handoff",
            ready,
            true,
            Some(dispatch),
            payload_json,
            helper.generation_token,
            "",
            "implement_tts_runtime",
        )
    };
    record_stage_status(&status);
    status
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
