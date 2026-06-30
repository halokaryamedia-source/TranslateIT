use serde::Serialize;
use serde_json::{json, Value};
use std::sync::{Mutex, OnceLock};

use super::helper_bridge::{get_helper_bridge_status, send_helper_worker_task, HelperBridgeWorkerResponse};
use super::helper_bridge_runtime::unix_ms;
use super::runtime_capture::get_capture_transcript_boundary_status;

static LAST_ASR_AUDIO_PAYLOAD_STATUS: OnceLock<Mutex<Option<AsrAudioPayloadRequestStatus>>> = OnceLock::new();

#[derive(Debug, Clone, Serialize)]
pub struct AsrAudioPayloadRequestStatus {
    pub ok: bool,
    pub state: String,
    pub schema_prepared: bool,
    pub boundary_ready: bool,
    pub audio_write_attempted: bool,
    pub audio_payload_ready: bool,
    pub request_prepared: bool,
    pub dispatch_attempted: bool,
    pub dispatch_ok: bool,
    pub task: String,
    pub message: String,
    pub blocker: String,
    pub next_action: String,
    pub audio_path: Option<String>,
    pub sample_rate_hz: u32,
    pub channels: u16,
    pub pcm_format: String,
    pub frame_count: usize,
    pub duration_ms: u32,
    pub audio_base64_present: bool,
    pub generation_token: u64,
    pub runtime_claim: String,
    pub payload_json: String,
    pub evidence_json: String,
    pub worker_response_json: String,
    pub worker_stage: String,
    pub worker_blocker: String,
    pub worker_note: String,
    pub transcript_text_present: bool,
    pub transcript_char_count: usize,
    pub updated_unix_ms: u128,
}

fn asr_payload_cache() -> &'static Mutex<Option<AsrAudioPayloadRequestStatus>> {
    LAST_ASR_AUDIO_PAYLOAD_STATUS.get_or_init(|| Mutex::new(None))
}

fn store_asr_payload_status(status: &AsrAudioPayloadRequestStatus) {
    if let Ok(mut cached) = asr_payload_cache().lock() {
        *cached = Some(status.clone());
    }
}

fn no_cached_asr_payload_status() -> AsrAudioPayloadRequestStatus {
    AsrAudioPayloadRequestStatus {
        ok: false,
        state: "not_checked".to_string(),
        schema_prepared: false,
        boundary_ready: false,
        audio_write_attempted: false,
        audio_payload_ready: false,
        request_prepared: false,
        dispatch_attempted: false,
        dispatch_ok: false,
        task: "asr_decode".to_string(),
        message: "No ASR audio payload status has been prepared or dispatched in this app session yet.".to_string(),
        blocker: "asr_audio_payload:no_cached_status".to_string(),
        next_action: "prepare_asr_audio_payload_request".to_string(),
        audio_path: None,
        sample_rate_hz: crate::engine::audio::TARGET_SAMPLE_RATE_HZ,
        channels: crate::engine::audio::TARGET_CHANNELS,
        pcm_format: "pcm16_wav".to_string(),
        frame_count: 0,
        duration_ms: 0,
        audio_base64_present: false,
        generation_token: 0,
        runtime_claim: "asr_audio_payload_no_cached_runtime_claim".to_string(),
        payload_json: "{}".to_string(),
        evidence_json: json!({
            "schema": "translateit.asr_audio_payload_boundary.v1",
            "cached": false,
            "runtime_claim": "asr_audio_payload_no_cached_runtime_claim"
        }).to_string(),
        worker_response_json: "{}".to_string(),
        worker_stage: String::new(),
        worker_blocker: "asr_audio_payload:no_cached_status".to_string(),
        worker_note: "No ASR audio payload status has been prepared or dispatched in this app session yet.".to_string(),
        transcript_text_present: false,
        transcript_char_count: 0,
        updated_unix_ms: unix_ms(),
    }
}

fn asr_payload_json(
    generation_token: u64,
    source_language: &str,
    audio_path: &Option<String>,
    sample_rate_hz: u32,
    channels: u16,
    frame_count: usize,
    duration_ms: u32,
    boundary_ready: bool,
    audio_payload_ready: bool,
) -> Value {
    json!({
        "command": "asr_decode",
        "generation_token": generation_token,
        "language": source_language,
        "source_language": source_language,
        "audio_path": audio_path,
        "audio_base64": null,
        "audio_base64_present": false,
        "sample_rate_hz": sample_rate_hz,
        "channels": channels,
        "pcm_format": "pcm16_wav",
        "frame_count": frame_count,
        "duration_ms": duration_ms,
        "boundary_ready": boundary_ready,
        "audio_payload_ready": audio_payload_ready,
        "source": "live_segment_writer_latest_target_segment_wav",
        "runtime_claim": if audio_payload_ready {
            "asr_decode_audio_file_payload_ready_no_transcript_runtime_claim"
        } else {
            "asr_decode_payload_schema_no_audio_runtime_claim"
        }
    })
}

fn value_text(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|text| !text.is_empty())
        .map(str::to_string)
}

fn parse_json_or_raw(raw: &str) -> Value {
    serde_json::from_str::<Value>(raw).unwrap_or_else(|_| json!({ "raw": raw }))
}

fn text_char_count(value: &Option<String>) -> usize {
    value.as_deref().map(|text| text.chars().count()).unwrap_or(0)
}

fn build_asr_audio_payload_status(write_audio: bool) -> AsrAudioPayloadRequestStatus {
    let boundary = get_capture_transcript_boundary_status();
    let helper = get_helper_bridge_status();
    let settings = crate::engine::load_settings();
    let source_language = settings.source_language.clone();
    let write_report = if write_audio && boundary.transcript_handoff_ready {
        Some(crate::engine::audio::live_segment_writer::write_latest_live_target_segment_wav())
    } else {
        None
    };

    let audio_write_attempted = write_report.is_some();
    let audio_path = write_report.as_ref().and_then(|report| report.audio_path.clone());
    let sample_rate_hz = write_report
        .as_ref()
        .map(|report| report.sample_rate_hz)
        .unwrap_or(crate::engine::audio::TARGET_SAMPLE_RATE_HZ);
    let channels = write_report
        .as_ref()
        .map(|report| report.channels)
        .unwrap_or(crate::engine::audio::TARGET_CHANNELS);
    let frame_count = write_report
        .as_ref()
        .map(|report| report.sample_count)
        .unwrap_or(0);
    let duration_ms = write_report
        .as_ref()
        .map(|report| report.duration_ms)
        .unwrap_or(boundary.buffered_duration_ms);
    let audio_payload_ready = write_report.as_ref().map(|report| report.ok).unwrap_or(false)
        && audio_path.is_some();
    let request_prepared = boundary.transcript_handoff_ready && audio_payload_ready;

    let blocker = if !boundary.transcript_handoff_ready {
        boundary.blocker.clone()
    } else if write_audio && !audio_payload_ready {
        write_report
            .as_ref()
            .map(|report| report.blocker.clone())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "asr_audio_payload:writer_not_ready".to_string())
    } else if !write_audio {
        "asr_audio_payload:write_not_attempted".to_string()
    } else {
        String::new()
    };

    let next_action = if request_prepared {
        "dispatch_asr_decode_request".to_string()
    } else if !boundary.transcript_handoff_ready {
        boundary.next_action.clone()
    } else if !write_audio {
        "dispatch_asr_decode_request".to_string()
    } else {
        "inspect_live_segment_writer".to_string()
    };

    let state = if request_prepared {
        "request_ready"
    } else if boundary.transcript_handoff_ready {
        "schema_ready"
    } else {
        "blocked"
    }
    .to_string();

    let message = if request_prepared {
        "ASR decode request is prepared with cached PCM16 WAV payload. This is a worker handoff request, not transcript proof yet.".to_string()
    } else if boundary.transcript_handoff_ready && !write_audio {
        "ASR audio payload schema is prepared. Dispatch will write the latest target segment WAV before worker handoff.".to_string()
    } else if audio_write_attempted {
        format!("ASR audio payload write was attempted but blocked: {blocker}")
    } else {
        format!("ASR audio payload request is blocked before WAV payload creation: {blocker}")
    };

    let payload = asr_payload_json(
        helper.generation_token,
        &source_language,
        &audio_path,
        sample_rate_hz,
        channels,
        frame_count,
        duration_ms,
        boundary.transcript_handoff_ready,
        audio_payload_ready,
    );
    let evidence = json!({
        "schema": "translateit.asr_audio_payload_boundary.v1",
        "cached": true,
        "boundary_ready": boundary.transcript_handoff_ready,
        "capture_dispatch_attempted": boundary.capture_dispatch_attempted,
        "capture_dispatch_ok": boundary.capture_dispatch_ok,
        "existing_capture_active": boundary.existing_capture_active,
        "ready_for_vad": boundary.ready_for_vad,
        "ready_for_target_asr_frame": boundary.ready_for_target_asr_frame,
        "frames_received": boundary.frames_received,
        "buffered_duration_ms": boundary.buffered_duration_ms,
        "audio_write_attempted": audio_write_attempted,
        "audio_write_ok": audio_payload_ready,
        "audio_path": audio_path.clone(),
        "sample_rate_hz": sample_rate_hz,
        "channels": channels,
        "pcm_format": "pcm16_wav",
        "frame_count": frame_count,
        "duration_ms": duration_ms,
        "worker_task": "asr_decode",
        "runtime_claim": "asr_audio_payload_boundary_source_side_not_transcript_proof"
    });

    AsrAudioPayloadRequestStatus {
        ok: request_prepared,
        state,
        schema_prepared: true,
        boundary_ready: boundary.transcript_handoff_ready,
        audio_write_attempted,
        audio_payload_ready,
        request_prepared,
        dispatch_attempted: false,
        dispatch_ok: false,
        task: "asr_decode".to_string(),
        message,
        blocker,
        next_action,
        audio_path,
        sample_rate_hz,
        channels,
        pcm_format: "pcm16_wav".to_string(),
        frame_count,
        duration_ms,
        audio_base64_present: false,
        generation_token: helper.generation_token,
        runtime_claim: "asr_audio_payload_boundary_source_side_not_transcript_proof".to_string(),
        payload_json: payload.to_string(),
        evidence_json: evidence.to_string(),
        worker_response_json: "{}".to_string(),
        worker_stage: String::new(),
        worker_blocker: blocker.clone(),
        worker_note: String::new(),
        transcript_text_present: false,
        transcript_char_count: 0,
        updated_unix_ms: unix_ms(),
    }
}

fn apply_asr_decode_worker_response(status: &mut AsrAudioPayloadRequestStatus, response: HelperBridgeWorkerResponse) {
    let worker_response = parse_json_or_raw(&response.worker_response_json);
    let payload_evidence = parse_json_or_raw(&status.evidence_json);
    let worker_stage = value_text(&worker_response, "stage").unwrap_or_else(|| response.task.clone());
    let worker_blocker = value_text(&worker_response, "blocker");
    let worker_note = value_text(&worker_response, "note");
    let transcript_text = value_text(&worker_response, "transcript_text");
    let transcript_char_count = text_char_count(&transcript_text);
    status.dispatch_attempted = true;
    status.dispatch_ok = response.ok;
    status.ok = response.ok;
    status.state = if response.ok { "worker_accepted" } else { "worker_blocked" }.to_string();
    status.message = format!(
        "ASR decode worker response returned: {} This is worker response evidence, not transcript or Windows runtime proof.",
        worker_note.clone().unwrap_or(response.message)
    );
    status.blocker = if response.ok {
        String::new()
    } else {
        worker_blocker.clone().unwrap_or_else(|| "asr_decode:worker_blocked".to_string())
    };
    status.next_action = if response.ok && transcript_text.is_some() {
        "promote_asr_transcript_after_runtime_validation".to_string()
    } else if response.ok {
        "inspect_worker_asr_decode_response".to_string()
    } else {
        "inspect_worker_asr_decode_blocker".to_string()
    };
    status.generation_token = response.generation_token;
    status.runtime_claim = "asr_decode_worker_response_captured_no_windows_runtime_proof".to_string();
    status.worker_response_json = response.worker_response_json;
    status.worker_stage = worker_stage.clone();
    status.worker_blocker = worker_blocker.clone().unwrap_or_default();
    status.worker_note = worker_note.clone().unwrap_or_default();
    status.transcript_text_present = transcript_text.is_some();
    status.transcript_char_count = transcript_char_count;
    status.evidence_json = json!({
        "schema": "translateit.asr_audio_payload_boundary.v1",
        "cached": true,
        "payload_evidence": payload_evidence,
        "worker_response": worker_response,
        "worker_response_captured": true,
        "worker_stage": worker_stage,
        "worker_blocker": worker_blocker,
        "worker_note": worker_note,
        "transcript_text_present": status.transcript_text_present,
        "transcript_char_count": status.transcript_char_count,
        "runtime_claim": "asr_decode_worker_response_captured_no_windows_runtime_proof"
    }).to_string();
    status.updated_unix_ms = unix_ms();
}

#[tauri::command]
pub fn get_latest_asr_audio_payload_status() -> AsrAudioPayloadRequestStatus {
    asr_payload_cache()
        .lock()
        .ok()
        .and_then(|cached| cached.clone())
        .unwrap_or_else(no_cached_asr_payload_status)
}

#[tauri::command]
pub fn prepare_asr_audio_payload_request() -> AsrAudioPayloadRequestStatus {
    let status = build_asr_audio_payload_status(false);
    store_asr_payload_status(&status);
    status
}

#[tauri::command]
pub fn dispatch_asr_decode_request() -> AsrAudioPayloadRequestStatus {
    let mut status = build_asr_audio_payload_status(true);
    if !status.request_prepared {
        store_asr_payload_status(&status);
        return status;
    }
    let payload = parse_json_or_raw(&status.payload_json);
    let response = send_helper_worker_task("asr_decode", payload);
    apply_asr_decode_worker_response(&mut status, response);
    store_asr_payload_status(&status);
    status
}
