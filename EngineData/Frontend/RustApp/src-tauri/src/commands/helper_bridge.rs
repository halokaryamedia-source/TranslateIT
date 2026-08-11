use serde::Serialize;
use serde_json::{json, Value};
use std::io::BufReader;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};

use crate::commands::diagnostic_trace::{
    trace_command_end, trace_command_error, trace_command_start,
};
use crate::engine::runtime_state::{
    latest_runtime_session_state, runtime_generation_is_authoritative,
};

use super::bridge_paths::{
    helper_stderr_log_path, resolve_worker_python_command, slash_path,
    worker_python_unavailable_message, worker_root, worker_script,
};
use super::helper_bridge_runtime::{
    acquire_helper_task_permit, action_result, apply_worker_response, apply_worker_status,
    clear_active_request, read_worker_response_direct_with_deadline, runtime, set_blocked,
    spawn_stderr_logger, status_from_runtime, stop_child, unix_ms, write_worker_request,
    HelperBridgeActionResult, HelperBridgeRequest, HelperBridgeStatus, HelperTaskPriority,
    DEFAULT_WORKER_RESPONSE_DEADLINE_MS,
};

const MAX_HELPER_TEXT_CHARS: usize = 2_000;
const APPLICATION_MEETING_OWNER_ID: &str = "translateit_application_meeting";

static MEETING_OUTBOUND_PIPELINE_GENERATION: AtomicU64 = AtomicU64::new(0);

#[derive(Debug, Clone, Serialize)]
pub struct HelperBridgeWorkerResponse {
    pub ok: bool,
    pub state: String,
    pub task: String,
    pub request_id: String,
    pub scheduler_priority: String,
    pub message: String,
    pub generation_token: u64,
    pub runtime_claim: String,
    pub worker_response_json: String,
}

fn clean_helper_text(value: &str, max_chars: usize) -> String {
    value
        .trim()
        .chars()
        .filter(|character| {
            *character != '\0'
                && !('\u{0001}'..='\u{0008}').contains(character)
                && !('\u{000b}'..='\u{001f}').contains(character)
                && *character != '\u{007f}'
        })
        .take(max_chars)
        .collect::<String>()
        .trim()
        .to_string()
}

fn worker_text(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .map(|text| clean_helper_text(text, 500))
        .filter(|text| !text.is_empty())
}

fn worker_message(task: &str, response: &Value) -> String {
    worker_text(response, "note")
        .or_else(|| worker_text(response, "blocker"))
        .or_else(|| worker_text(response, "stage"))
        .unwrap_or_else(|| format!("Helper worker task {task} completed."))
}

fn helper_transport_failure(response: &HelperBridgeWorkerResponse) -> bool {
    if response.ok {
        return false;
    }
    let value = serde_json::from_str::<Value>(&response.worker_response_json)
        .unwrap_or_else(|_| json!({}));
    let blocker = worker_text(&value, "blocker").unwrap_or_default();
    blocker.starts_with("helper_bridge:")
        && (blocker.contains("_write_failed:") || blocker.contains("_read_failed:"))
}

fn live_outbound_generation_is_authoritative(generation: u64) -> bool {
    if !runtime_generation_is_authoritative(generation) {
        return false;
    }
    latest_runtime_session_state()
        .snapshot
        .map(|snapshot| {
            snapshot.owner_id == APPLICATION_MEETING_OWNER_ID
                && snapshot.generation == generation
                && snapshot.authority_active
                && snapshot.phase == "live"
        })
        .unwrap_or(false)
}

fn live_outbound_stage_retry_safe(task: &str) -> bool {
    matches!(task, "transcribe" | "translate")
}

fn meeting_generation(payload: &Value) -> Option<u64> {
    payload.get("meeting_generation").and_then(Value::as_u64)
}

fn meeting_session_id(payload: &Value) -> Option<String> {
    payload
        .get("meeting_session_id")
        .and_then(Value::as_str)
        .map(|value| clean_helper_text(value, 96))
        .filter(|value| !value.is_empty())
}

fn meeting_lane(payload: &Value) -> Option<String> {
    payload
        .get("meeting_lane")
        .and_then(Value::as_str)
        .map(|value| clean_helper_text(value, 32).to_ascii_lowercase())
        .filter(|value| matches!(value.as_str(), "you" | "incoming"))
}

fn meeting_start_prepare(payload: &Value) -> bool {
    payload
        .get("meeting_start_prepare")
        .and_then(Value::as_bool)
        .unwrap_or(false)
}

fn meeting_outbound_pipeline_active() -> bool {
    MEETING_OUTBOUND_PIPELINE_GENERATION.load(Ordering::Acquire) != 0
}

fn mark_meeting_outbound_pipeline(generation: u64) {
    if generation != 0 {
        MEETING_OUTBOUND_PIPELINE_GENERATION.store(generation, Ordering::Release);
    }
}

fn clear_meeting_outbound_pipeline(generation: u64) {
    let _ = MEETING_OUTBOUND_PIPELINE_GENERATION.compare_exchange(
        generation,
        0,
        Ordering::AcqRel,
        Ordering::Acquire,
    );
}

fn clear_any_meeting_outbound_pipeline() {
    MEETING_OUTBOUND_PIPELINE_GENERATION.store(0, Ordering::Release);
}

fn incoming_session_is_eligible(session_id: &str) -> bool {
    latest_runtime_session_state()
        .snapshot
        .map(|snapshot| {
            snapshot.owner_id == APPLICATION_MEETING_OWNER_ID
                && snapshot.session_id == session_id
                && snapshot.authority_active
                && snapshot.phase == "live"
        })
        .unwrap_or(false)
}

fn task_priority(task: &str, payload: &Value) -> HelperTaskPriority {
    if meeting_generation(payload).is_some() || meeting_start_prepare(payload) {
        HelperTaskPriority::MeetingOutbound
    } else if meeting_lane(payload).as_deref() == Some("incoming")
        && meeting_session_id(payload).is_some()
    {
        HelperTaskPriority::MeetingIncoming
    } else if task == "translate" {
        HelperTaskPriority::Text
    } else {
        HelperTaskPriority::Diagnostic
    }
}

fn inject_request_metadata(
    payload: &mut Value,
    task: &str,
    request_id: &str,
    priority: HelperTaskPriority,
) {
    if !payload.is_object() {
        *payload = json!({});
    }
    if let Some(object) = payload.as_object_mut() {
        object.insert("command".to_string(), json!(task));
        object.insert("request_id".to_string(), json!(request_id));
        object.insert("scheduler_priority".to_string(), json!(priority.label()));
    }
}

fn response_with_runtime(
    ok: bool,
    task: &str,
    request_id: &str,
    priority: HelperTaskPriority,
    message: String,
    worker_response: Value,
    runtime: &super::helper_bridge_runtime::HelperBridgeRuntime,
) -> HelperBridgeWorkerResponse {
    HelperBridgeWorkerResponse {
        ok,
        state: runtime.state.clone(),
        task: task.to_string(),
        request_id: request_id.to_string(),
        scheduler_priority: priority.label().to_string(),
        message,
        generation_token: runtime.generation_token,
        runtime_claim: status_from_runtime(runtime).runtime_claim,
        worker_response_json: worker_response.to_string(),
    }
}

fn standalone_blocked_response(
    task: &str,
    request_id: &str,
    priority: HelperTaskPriority,
    state: &str,
    blocker: &str,
    message: &str,
) -> HelperBridgeWorkerResponse {
    HelperBridgeWorkerResponse {
        ok: false,
        state: state.to_string(),
        task: task.to_string(),
        request_id: request_id.to_string(),
        scheduler_priority: priority.label().to_string(),
        message: message.to_string(),
        generation_token: 0,
        runtime_claim: "helper_scheduler_request_not_executed".to_string(),
        worker_response_json: json!({
            "ok": false,
            "stage": task,
            "request_id": request_id,
            "scheduler_priority": priority.label(),
            "blocker": blocker,
            "note": message,
        })
        .to_string(),
    }
}

fn incoming_deferred_response(task: &str, request_id: &str) -> HelperBridgeWorkerResponse {
    standalone_blocked_response(
        task,
        request_id,
        HelperTaskPriority::MeetingIncoming,
        "deferred",
        "helper_scheduler:incoming_deferred_for_outbound",
        "Optional incoming Meeting work yielded before execution because required outbound translation currently owns the helper pipeline.",
    )
}

fn blocked_response_from_runtime(
    task: &str,
    request_id: &str,
    priority: HelperTaskPriority,
    message: &str,
    runtime: &super::helper_bridge_runtime::HelperBridgeRuntime,
) -> HelperBridgeWorkerResponse {
    response_with_runtime(
        false,
        task,
        request_id,
        priority,
        message.to_string(),
        json!({
            "ok": false,
            "stage": task,
            "request_id": request_id,
            "scheduler_priority": priority.label(),
            "blocker": runtime
                .last_error
                .clone()
                .unwrap_or_else(|| "helper_bridge:not_ready".to_string()),
            "note": message,
        }),
        runtime,
    )
}

fn stale_meeting_request(
    task: &str,
    request_id: &str,
    priority: HelperTaskPriority,
    generation: Option<u64>,
    session_id: Option<&str>,
    lane: Option<&str>,
) -> Option<HelperBridgeWorkerResponse> {
    if generation
        .map(|value| !runtime_generation_is_authoritative(value))
        .unwrap_or(false)
    {
        return Some(standalone_blocked_response(
            task,
            request_id,
            priority,
            "stale_generation",
            "helper_scheduler:meeting_generation_not_authoritative",
            "Queued outbound Meeting work was discarded because its generation no longer owns output authority.",
        ));
    }

    if lane == Some("incoming")
        && session_id
            .map(|value| !incoming_session_is_eligible(value))
            .unwrap_or(true)
    {
        return Some(standalone_blocked_response(
            task,
            request_id,
            priority,
            "stale_session",
            "helper_scheduler:incoming_meeting_session_not_eligible",
            "Queued incoming Meeting work was discarded because its application Meeting session is no longer eligible for incoming promotion.",
        ));
    }
    None
}

fn recover_incoming_transport_failure_before_permit_release(
    session_id: Option<&str>,
    mut response: HelperBridgeWorkerResponse,
) -> HelperBridgeWorkerResponse {
    if !helper_transport_failure(&response) {
        return response;
    }
    let Some(session_id) = session_id.filter(|value| incoming_session_is_eligible(value)) else {
        return response;
    };

    // This runs while the failed MeetingIncoming request still owns the scheduler
    // permit. Restoring the one shared worker before that permit is released prevents
    // a concurrently waiting required outbound request from observing the worker as
    // stopped. The stale incoming event itself is never retried.
    let recovery = start_helper_bridge_internal(false);
    response.state = recovery.state.clone();
    response.generation_token = recovery.generation_token;
    if recovery.ok {
        response.runtime_claim =
            "meeting_incoming_transport_recovered_same_worker_event_not_retried".to_string();
        response.message = format!(
            "{} The same helper worker was restored before releasing incoming scheduler ownership; this stale incoming event was not retried.",
            response.message
        );
    } else {
        response.runtime_claim = "meeting_incoming_transport_recovery_failed".to_string();
        response.message = format!(
            "{} The helper worker could not be restored after the optional incoming transport failure: {}",
            response.message, recovery.message
        );
    }
    response
}

fn send_worker_task_inner(task: &str, mut payload: Value) -> HelperBridgeWorkerResponse {
    let priority = task_priority(task, &payload);
    let meeting_generation = meeting_generation(&payload);
    let meeting_session_id = meeting_session_id(&payload);
    let meeting_lane = meeting_lane(&payload);
    let permit = match acquire_helper_task_permit(priority) {
        Ok(permit) => permit,
        Err(error) => {
            return standalone_blocked_response(
                task,
                "scheduler-unavailable",
                priority,
                "error",
                &error,
                "Helper scheduler could not admit the request.",
            )
        }
    };
    let request_id = permit.request_id().to_string();

    // An incoming request may have entered the scheduler before outbound claimed the
    // pipeline. Re-check after permit acquisition so queued optional work cannot slip
    // between required outbound ASR -> translation -> TTS stages.
    if priority == HelperTaskPriority::MeetingIncoming && meeting_outbound_pipeline_active() {
        return incoming_deferred_response(task, &request_id);
    }

    if let Some(response) = stale_meeting_request(
        task,
        &request_id,
        priority,
        meeting_generation,
        meeting_session_id.as_deref(),
        meeting_lane.as_deref(),
    ) {
        return response;
    }

    inject_request_metadata(&mut payload, task, &request_id, priority);

    let (mut stdin, stdout, bridge_generation) = match runtime().lock() {
        Ok(mut runtime) => {
            if runtime.child.is_none() || runtime.stdin.is_none() || runtime.stdout.is_none() {
                runtime.state = "stopped".to_string();
                runtime.message = "Helper worker is not running. Start Helper first.".to_string();
                runtime.last_error = Some("helper_bridge:not_running".to_string());
                runtime.updated_unix_ms = unix_ms();
                return blocked_response_from_runtime(
                    task,
                    &request_id,
                    priority,
                    "Helper worker is not running. Start Helper first.",
                    &runtime,
                );
            }

            let stdin = runtime.stdin.take().expect("stdin checked above");
            let stdout = runtime.stdout.take().expect("stdout checked above");
            let bridge_generation = runtime.generation_token;
            runtime.active_task = Some(task.to_string());
            runtime.active_request_id = Some(request_id.clone());
            runtime.active_meeting_generation = meeting_generation;
            runtime.active_meeting_session_id = meeting_session_id.clone();
            runtime.active_meeting_lane = meeting_lane.clone();
            runtime.updated_unix_ms = unix_ms();
            (stdin, stdout, bridge_generation)
        }
        Err(_) => {
            return standalone_blocked_response(
                task,
                &request_id,
                priority,
                "error",
                "helper_bridge:lock_poisoned",
                "Helper bridge state lock is poisoned.",
            )
        }
    };

    if let Err(error) = write_worker_request(&mut stdin, &payload) {
        let response = match runtime().lock() {
            Ok(mut runtime) => {
                if runtime.generation_token == bridge_generation {
                    stop_child(&mut runtime);
                    runtime.generation_token = runtime.generation_token.saturating_add(1);
                    runtime.state = "stopped".to_string();
                    runtime.message = format!("Failed to write {task} request to Python helper worker: {error}");
                    runtime.last_error = Some(format!("helper_bridge:{task}_write_failed:{error}"));
                    clear_active_request(&mut runtime, &request_id);
                    runtime.provider_ready = false;
                    runtime.cuda_ready = false;
                    runtime.updated_unix_ms = unix_ms();
                }
                let message = runtime.message.clone();
                blocked_response_from_runtime(task, &request_id, priority, &message, &runtime)
            }
            Err(_) => standalone_blocked_response(
                task,
                &request_id,
                priority,
                "error",
                "helper_bridge:lock_poisoned_after_write_failure",
                "Helper request write failed and bridge state could not be recovered.",
            ),
        };
        return if priority == HelperTaskPriority::MeetingIncoming {
            recover_incoming_transport_failure_before_permit_release(
                meeting_session_id.as_deref(),
                response,
            )
        } else {
            response
        };
    }

    let (mut worker_response, stdout) =
        match read_worker_response_direct_with_deadline(stdout, DEFAULT_WORKER_RESPONSE_DEADLINE_MS) {
            Ok(value) => value,
            Err(error) => {
                let response = match runtime().lock() {
                    Ok(mut runtime) => {
                        if runtime.generation_token == bridge_generation {
                            stop_child(&mut runtime);
                            runtime.generation_token = runtime.generation_token.saturating_add(1);
                            runtime.state = "stopped".to_string();
                            runtime.message = format!(
                                "Failed to read {task} response from Python helper worker before deadline: {error}"
                            );
                            runtime.last_error = Some(format!(
                                "helper_bridge:{task}_read_failed:{error}"
                            ));
                            clear_active_request(&mut runtime, &request_id);
                            runtime.provider_ready = false;
                            runtime.cuda_ready = false;
                            runtime.updated_unix_ms = unix_ms();
                        }
                        let message = runtime.message.clone();
                        blocked_response_from_runtime(
                            task,
                            &request_id,
                            priority,
                            &message,
                            &runtime,
                        )
                    }
                    Err(_) => standalone_blocked_response(
                        task,
                        &request_id,
                        priority,
                        "error",
                        "helper_bridge:lock_poisoned_after_read_failure",
                        "Helper response failed and bridge state could not be recovered safely.",
                    ),
                };
                return if priority == HelperTaskPriority::MeetingIncoming {
                    recover_incoming_transport_failure_before_permit_release(
                        meeting_session_id.as_deref(),
                        response,
                    )
                } else {
                    response
                };
            }
        };

    if let Some(object) = worker_response.as_object_mut() {
        object.insert("request_id".to_string(), json!(request_id));
        object.insert("scheduler_priority".to_string(), json!(priority.label()));
    }

    match runtime().lock() {
        Ok(mut runtime) => {
            let bridge_still_owns_process =
                runtime.generation_token == bridge_generation && runtime.child.is_some();
            if !bridge_still_owns_process {
                clear_active_request(&mut runtime, &request_id);
                return blocked_response_from_runtime(
                    task,
                    &request_id,
                    priority,
                    "Helper result was discarded because the worker process was cancelled or replaced while the request was running.",
                    &runtime,
                );
            }

            runtime.stdin = Some(stdin);
            runtime.stdout = Some(stdout);

            if let Some(response) = stale_meeting_request(
                task,
                &request_id,
                priority,
                meeting_generation,
                meeting_session_id.as_deref(),
                meeting_lane.as_deref(),
            ) {
                clear_active_request(&mut runtime, &request_id);
                runtime.message = response.message.clone();
                runtime.updated_unix_ms = unix_ms();
                return response_with_runtime(
                    false,
                    task,
                    &request_id,
                    priority,
                    response.message,
                    serde_json::from_str(&response.worker_response_json).unwrap_or_else(|_| json!({})),
                    &runtime,
                );
            }

            let ok = apply_worker_response(&mut runtime, &worker_response);
            clear_active_request(&mut runtime, &request_id);
            runtime.updated_unix_ms = unix_ms();
            let message = worker_message(task, &worker_response);
            response_with_runtime(
                ok,
                task,
                &request_id,
                priority,
                message,
                worker_response,
                &runtime,
            )
        }
        Err(_) => standalone_blocked_response(
            task,
            &request_id,
            priority,
            "error",
            "helper_bridge:lock_poisoned_after_worker_response",
            "Worker response was received, but bridge state could not be updated safely.",
        ),
    }
}

fn recover_live_meeting_helper_transport(
    generation: u64,
    retain_outbound_pipeline: bool,
) -> HelperBridgeActionResult {
    if !live_outbound_generation_is_authoritative(generation) {
        return HelperBridgeActionResult {
            ok: false,
            state: "stale_generation".to_string(),
            message: "Live Meeting helper recovery was skipped because the outbound generation no longer owns Live authority."
                .to_string(),
            generation_token: get_helper_bridge_status().generation_token,
            runtime_claim: "meeting_live_helper_recovery_skipped_stale_generation".to_string(),
        };
    }

    let _permit = match acquire_helper_task_permit(HelperTaskPriority::MeetingOutbound) {
        Ok(permit) => permit,
        Err(error) => {
            return HelperBridgeActionResult {
                ok: false,
                state: "error".to_string(),
                message: format!(
                    "Live Meeting helper recovery could not acquire outbound scheduler priority: {error}"
                ),
                generation_token: get_helper_bridge_status().generation_token,
                runtime_claim: "meeting_live_helper_recovery_scheduler_unavailable".to_string(),
            }
        }
    };

    if !live_outbound_generation_is_authoritative(generation) {
        return HelperBridgeActionResult {
            ok: false,
            state: "stale_generation".to_string(),
            message: "Live Meeting helper recovery stopped before restart because the outbound generation was revoked while waiting for the scheduler."
                .to_string(),
            generation_token: get_helper_bridge_status().generation_token,
            runtime_claim: "meeting_live_helper_recovery_skipped_after_scheduler_wait".to_string(),
        };
    }

    let mut recovery = start_helper_bridge_internal(false);
    if recovery.ok && live_outbound_generation_is_authoritative(generation) {
        if retain_outbound_pipeline {
            mark_meeting_outbound_pipeline(generation);
        }
        recovery.message = "The same canonical helper worker was restarted after a Live Meeting transport failure."
            .to_string();
        recovery.runtime_claim = "meeting_live_helper_transport_recovered_same_worker".to_string();
        return recovery;
    }

    clear_meeting_outbound_pipeline(generation);
    if recovery.ok {
        recovery.ok = false;
        recovery.state = "stale_generation".to_string();
        recovery.message = "The helper worker restarted, but the Meeting generation was revoked before the failed stage could be retried."
            .to_string();
        recovery.runtime_claim = "meeting_live_helper_recovery_completed_after_generation_revoke".to_string();
    }
    recovery
}

fn send_worker_task(task: &str, payload: Value) -> HelperBridgeWorkerResponse {
    let priority = task_priority(task, &payload);
    let outbound_generation = if priority == HelperTaskPriority::MeetingOutbound
        && meeting_lane(&payload).as_deref() == Some("you")
    {
        meeting_generation(&payload)
    } else {
        None
    };
    let retry_payload = payload.clone();

    // Reject new optional incoming stages immediately while a required outbound
    // utterance owns the helper pipeline. The post-permit check in the inner path
    // also catches incoming work that was already queued before this claim existed.
    if priority == HelperTaskPriority::MeetingIncoming && meeting_outbound_pipeline_active() {
        return incoming_deferred_response(task, "incoming-deferred-before-scheduler");
    }

    if let Some(generation) = outbound_generation {
        mark_meeting_outbound_pipeline(generation);
    }

    let mut response = send_worker_task_inner(task, payload);

    if let Some(generation) = outbound_generation {
        if helper_transport_failure(&response)
            && live_outbound_generation_is_authoritative(generation)
        {
            let retry_current_stage = live_outbound_stage_retry_safe(task);
            let recovery = recover_live_meeting_helper_transport(
                generation,
                retry_current_stage,
            );
            if recovery.ok && live_outbound_generation_is_authoritative(generation) {
                if retry_current_stage {
                    // ASR and translation have no Meeting playback side effect, so the
                    // same finalized input may be attempted exactly once after a
                    // transport-only worker restart. The retry itself is not recursive.
                    response = send_worker_task_inner(task, retry_payload);
                } else {
                    // Synthesis can have uncertain child-process/file state after a
                    // transport failure. Restore the worker for the next utterance but
                    // do not synthesize the current phrase again automatically.
                    response.state = recovery.state;
                    response.generation_token = recovery.generation_token;
                    response.runtime_claim =
                        "meeting_live_helper_recovered_current_stage_not_retried".to_string();
                    response.message = format!(
                        "{} The helper worker was restored for subsequent Meeting utterances; this synthesis stage was not retried.",
                        response.message
                    );
                }
            }
        }

        if task == "synthesize"
            || !response.ok
            || !runtime_generation_is_authoritative(generation)
        {
            clear_meeting_outbound_pipeline(generation);
        }
    }

    response
}

pub fn send_helper_worker_task(task: &str, payload: Value) -> HelperBridgeWorkerResponse {
    send_worker_task(task, payload)
}

pub fn prepare_required_outbound_ai_runtime() -> Result<(), &'static str> {
    let asr = send_worker_task("asr_preload", json!({ "meeting_start_prepare": true }));
    if !asr.ok {
        return Err("speech recognition");
    }

    let translation = send_worker_task(
        "translation_preload",
        json!({
            "source_language": "id",
            "target_language": "en",
            "meeting_start_prepare": true,
        }),
    );
    if !translation.ok {
        return Err("Indonesian to English translation");
    }

    let tts = send_worker_task("tts_preflight", json!({ "meeting_start_prepare": true }));
    if !tts.ok {
        return Err("English voice output");
    }

    // Re-read capability status after the actual required runtimes have been
    // exercised. This re-establishes provider readiness after a previous failed
    // preparation only when the current worker can truthfully report the core path.
    let status = send_worker_task("status", json!({ "meeting_start_prepare": true }));
    if !status.ok {
        return Err("local translation runtime");
    }
    Ok(())
}

#[tauri::command]
pub fn get_helper_bridge_status() -> HelperBridgeStatus {
    let started = trace_command_start("get_helper_bridge_status", "reading helper bridge status");
    match runtime().lock() {
        Ok(mut runtime) => {
            if let Some(child) = runtime.child.as_mut() {
                if child.try_wait().ok().flatten().is_some() {
                    runtime.stdin.take();
                    runtime.stdout.take();
                    runtime.child.take();
                    runtime.state = "stopped".to_string();
                    runtime.message = "Helper worker process exited.".to_string();
                    runtime.cuda_ready = false;
                    runtime.provider_ready = false;
                    runtime.active_task = None;
                    runtime.active_request_id = None;
                    runtime.active_meeting_generation = None;
                    runtime.active_meeting_session_id = None;
                    runtime.active_meeting_lane = None;
                    runtime.updated_unix_ms = unix_ms();
                }
            }
            let result = status_from_runtime(&runtime);
            trace_command_end(
                "get_helper_bridge_status",
                started,
                format!("state={}", result.state),
            );
            result
        }
        Err(_) => {
            let result = HelperBridgeStatus {
                state: "error".to_string(),
                message: "Helper bridge status lock is poisoned.".to_string(),
                cuda_ready: false,
                provider_ready: false,
                degraded_mode: false,
                active_task: None,
                active_request_id: None,
                active_meeting_generation: None,
                active_meeting_session_id: None,
                active_meeting_lane: None,
                generation_token: 0,
                last_error: Some("helper_bridge:lock_poisoned".to_string()),
                stderr_log_path: None,
                updated_unix_ms: unix_ms(),
                runtime_claim: "bridge_state_error".to_string(),
            };
            trace_command_error(
                "get_helper_bridge_status",
                started,
                format!("state={}", result.state),
            );
            result
        }
    }
}

fn start_helper_bridge_internal(clear_outbound_pipeline: bool) -> HelperBridgeActionResult {
    if clear_outbound_pipeline {
        clear_any_meeting_outbound_pipeline();
    }
    match runtime().lock() {
        Ok(mut runtime) => {
            runtime.generation_token = runtime.generation_token.saturating_add(1);
            stop_child(&mut runtime);
            runtime.active_task = None;
            runtime.active_request_id = None;
            runtime.active_meeting_generation = None;
            runtime.active_meeting_session_id = None;
            runtime.active_meeting_lane = None;

            let worker = worker_script();
            if !worker.is_file() {
                return set_blocked(&mut runtime, "Missing realtime worker script. Restore EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py before starting the helper bridge.", "helper_bridge:worker_script_missing");
            }

            let Some(python) = resolve_worker_python_command() else {
                let message = worker_python_unavailable_message();
                return set_blocked(
                    &mut runtime,
                    &message,
                    "helper_bridge:python_runtime_missing",
                );
            };

            runtime.state = "starting".to_string();
            runtime.message = format!("Starting Python helper worker using {}.", python.source);
            runtime.updated_unix_ms = unix_ms();

            let mut command = Command::new(&python.program);
            command.args(&python.bootstrap_args);
            command.arg(&worker);
            command.current_dir(worker_root());
            command.stdin(Stdio::piped());
            command.stdout(Stdio::piped());
            command.stderr(Stdio::piped());

            let mut child = match command.spawn() {
                Ok(child) => child,
                Err(error) => {
                    return set_blocked(
                        &mut runtime,
                        &format!("Failed to spawn Python helper worker using {}: {error}", python.source),
                        "helper_bridge:spawn_failed",
                    )
                }
            };

            let stderr_log_path = helper_stderr_log_path(runtime.generation_token);
            if let Some(stderr) = child.stderr.take() {
                spawn_stderr_logger(stderr, stderr_log_path.clone());
                runtime.stderr_log_path = Some(slash_path(&stderr_log_path));
            }

            let mut stdin = match child.stdin.take() {
                Some(stdin) => stdin,
                None => {
                    let _ = child.kill();
                    let _ = child.wait();
                    return set_blocked(
                        &mut runtime,
                        "Python helper stdin was not available after spawn.",
                        "helper_bridge:stdin_missing",
                    );
                }
            };
            let stdout = match child.stdout.take() {
                Some(stdout) => stdout,
                None => {
                    let _ = child.kill();
                    let _ = child.wait();
                    return set_blocked(
                        &mut runtime,
                        "Python helper stdout was not available after spawn.",
                        "helper_bridge:stdout_missing",
                    );
                }
            };
            let stdout = BufReader::new(stdout);

            if let Err(error) = write_worker_request(&mut stdin, &json!({ "command": "ping" })) {
                let _ = child.kill();
                let _ = child.wait();
                return set_blocked(
                    &mut runtime,
                    &format!("Failed to send ping to helper worker: {error}"),
                    "helper_bridge:ping_write_failed",
                );
            }
            let (ping, mut stdout) = match read_worker_response_direct_with_deadline(
                stdout,
                DEFAULT_WORKER_RESPONSE_DEADLINE_MS,
            ) {
                Ok((value, stdout)) => (value, stdout),
                Err(error) => {
                    let _ = child.kill();
                    let _ = child.wait();
                    return set_blocked(
                        &mut runtime,
                        &format!("Failed to read helper worker ping response before deadline: {error}"),
                        "helper_bridge:ping_read_failed",
                    );
                }
            };
            if ping.get("ok").and_then(Value::as_bool) != Some(true) {
                let _ = child.kill();
                let _ = child.wait();
                return set_blocked(
                    &mut runtime,
                    "Helper worker ping returned a non-ready response.",
                    "helper_bridge:ping_not_ok",
                );
            }

            let status = if write_worker_request(&mut stdin, &json!({ "command": "status" })).is_ok() {
                match read_worker_response_direct_with_deadline(
                    stdout,
                    DEFAULT_WORKER_RESPONSE_DEADLINE_MS,
                ) {
                    Ok((value, next_stdout)) => {
                        stdout = next_stdout;
                        Some(value)
                    }
                    Err(error) => {
                        let _ = child.kill();
                        let _ = child.wait();
                        return set_blocked(
                            &mut runtime,
                            &format!("Failed to read helper worker status response before deadline: {error}"),
                            "helper_bridge:status_read_failed",
                        );
                    }
                }
            } else {
                None
            };

            runtime.child = Some(child);
            runtime.stdin = Some(stdin);
            runtime.stdout = Some(stdout);
            runtime.state = "ready".to_string();
            runtime.active_task = None;
            runtime.active_request_id = None;
            runtime.active_meeting_generation = None;
            runtime.active_meeting_session_id = None;
            runtime.active_meeting_lane = None;
            runtime.last_error = None;
            runtime.updated_unix_ms = unix_ms();
            if let Some(status) = status {
                apply_worker_status(&mut runtime, &status);
            } else {
                runtime.message = format!("Python helper worker is running via {} and ping verified. Worker capability status was not available yet.", python.source);
                runtime.cuda_ready = false;
                runtime.provider_ready = false;
                runtime.degraded_mode = false;
            }
            action_result(true, &runtime)
        }
        Err(_) => HelperBridgeActionResult {
            ok: false,
            state: "error".to_string(),
            message: "Helper bridge start failed because state lock is poisoned.".to_string(),
            generation_token: 0,
            runtime_claim: "bridge_state_error".to_string(),
        },
    }
}

#[tauri::command]
pub fn start_helper_bridge() -> HelperBridgeActionResult {
    start_helper_bridge_internal(true)
}

#[tauri::command]
pub fn stop_helper_bridge() -> HelperBridgeActionResult {
    clear_any_meeting_outbound_pipeline();
    match runtime().lock() {
        Ok(mut runtime) => {
            runtime.generation_token = runtime.generation_token.saturating_add(1);
            stop_child(&mut runtime);
            runtime.state = "stopped".to_string();
            runtime.message =
                "Helper bridge stopped and any in-flight worker process was terminated.".to_string();
            runtime.cuda_ready = false;
            runtime.provider_ready = false;
            runtime.degraded_mode = false;
            runtime.active_task = None;
            runtime.active_request_id = None;
            runtime.active_meeting_generation = None;
            runtime.active_meeting_session_id = None;
            runtime.active_meeting_lane = None;
            runtime.updated_unix_ms = unix_ms();
            action_result(true, &runtime)
        }
        Err(_) => HelperBridgeActionResult {
            ok: false,
            state: "error".to_string(),
            message: "Helper bridge stop failed because state lock is poisoned.".to_string(),
            generation_token: 0,
            runtime_claim: "bridge_state_error".to_string(),
        },
    }
}

pub fn cancel_helper_bridge_meeting_generation(generation: u64) -> HelperBridgeActionResult {
    clear_meeting_outbound_pipeline(generation);
    match runtime().lock() {
        Ok(mut runtime) => {
            if runtime.active_meeting_generation == Some(generation) {
                runtime.generation_token = runtime.generation_token.saturating_add(1);
                stop_child(&mut runtime);
                runtime.state = "stopped".to_string();
                runtime.message = format!(
                    "In-flight outbound Meeting generation {generation} helper inference was hard-cancelled by terminating the persistent worker process."
                );
                runtime.cuda_ready = false;
                runtime.provider_ready = false;
                runtime.degraded_mode = false;
                runtime.active_task = None;
                runtime.active_request_id = None;
                runtime.active_meeting_generation = None;
                runtime.active_meeting_session_id = None;
                runtime.active_meeting_lane = None;
                runtime.last_error = Some("helper_bridge:meeting_generation_hard_cancelled".to_string());
                runtime.updated_unix_ms = unix_ms();
                action_result(true, &runtime)
            } else {
                runtime.message = format!(
                    "No in-flight helper task belongs to outbound Meeting generation {generation}. Queued work for the revoked generation will be rejected before execution."
                );
                runtime.updated_unix_ms = unix_ms();
                action_result(true, &runtime)
            }
        }
        Err(_) => HelperBridgeActionResult {
            ok: false,
            state: "error".to_string(),
            message: "Meeting helper generation cancellation failed because state lock is poisoned.".to_string(),
            generation_token: 0,
            runtime_claim: "bridge_state_error".to_string(),
        },
    }
}

pub fn cancel_helper_bridge_meeting_session(session_id: &str) -> HelperBridgeActionResult {
    clear_any_meeting_outbound_pipeline();
    let session_id = session_id.trim();
    match runtime().lock() {
        Ok(mut runtime) => {
            if !session_id.is_empty()
                && runtime.active_meeting_session_id.as_deref() == Some(session_id)
            {
                runtime.generation_token = runtime.generation_token.saturating_add(1);
                stop_child(&mut runtime);
                runtime.state = "stopped".to_string();
                runtime.message = format!(
                    "In-flight helper inference for Meeting session {session_id} was hard-cancelled during full Meeting Stop."
                );
                runtime.cuda_ready = false;
                runtime.provider_ready = false;
                runtime.degraded_mode = false;
                runtime.active_task = None;
                runtime.active_request_id = None;
                runtime.active_meeting_generation = None;
                runtime.active_meeting_session_id = None;
                runtime.active_meeting_lane = None;
                runtime.last_error = Some("helper_bridge:meeting_session_hard_cancelled".to_string());
            } else {
                runtime.message = format!(
                    "No in-flight helper task belongs to Meeting session {session_id}. Queued incoming/outbound work will be rejected by session/generation guards."
                );
            }
            runtime.updated_unix_ms = unix_ms();
            action_result(true, &runtime)
        }
        Err(_) => HelperBridgeActionResult {
            ok: false,
            state: "error".to_string(),
            message: "Meeting helper session cancellation failed because state lock is poisoned.".to_string(),
            generation_token: 0,
            runtime_claim: "bridge_state_error".to_string(),
        },
    }
}

#[tauri::command]
pub fn cancel_helper_bridge_task() -> HelperBridgeActionResult {
    clear_any_meeting_outbound_pipeline();
    // Preserve the inherited general cancellation command for Diagnostics/legacy callers.
    // Canonical Meeting Stop uses scoped session cancellation.
    match runtime().lock() {
        Ok(mut runtime) => {
            if runtime.active_task.is_some() {
                runtime.generation_token = runtime.generation_token.saturating_add(1);
                stop_child(&mut runtime);
                runtime.state = "stopped".to_string();
                runtime.message =
                    "Active helper inference was hard-cancelled by terminating the persistent worker process. The next valid request must restart the worker."
                        .to_string();
                runtime.cuda_ready = false;
                runtime.provider_ready = false;
                runtime.degraded_mode = false;
                runtime.active_task = None;
                runtime.active_request_id = None;
                runtime.active_meeting_generation = None;
                runtime.active_meeting_session_id = None;
                runtime.active_meeting_lane = None;
                runtime.last_error = Some("helper_bridge:task_hard_cancelled".to_string());
            } else {
                runtime.message = "No helper inference is currently active; no process cancellation was required."
                    .to_string();
            }
            runtime.updated_unix_ms = unix_ms();
            action_result(true, &runtime)
        }
        Err(_) => HelperBridgeActionResult {
            ok: false,
            state: "error".to_string(),
            message: "Helper bridge cancel failed because state lock is poisoned.".to_string(),
            generation_token: 0,
            runtime_claim: "bridge_state_error".to_string(),
        },
    }
}

#[tauri::command]
pub fn send_helper_bridge_request(request: HelperBridgeRequest) -> HelperBridgeActionResult {
    let trimmed_task = request.task.trim();
    if trimmed_task.is_empty() {
        return HelperBridgeActionResult {
            ok: false,
            state: "blocked".to_string(),
            message: "Helper bridge request rejected because task is empty.".to_string(),
            generation_token: get_helper_bridge_status().generation_token,
            runtime_claim: "helper_scheduler_request_rejected".to_string(),
        };
    }

    let payload = request
        .payload_json
        .as_deref()
        .and_then(|raw| serde_json::from_str::<Value>(raw).ok())
        .unwrap_or_else(|| json!({}));
    let response = send_worker_task(trimmed_task, payload);
    HelperBridgeActionResult {
        ok: response.ok,
        state: response.state,
        message: response.message,
        generation_token: response.generation_token,
        runtime_claim: response.runtime_claim,
    }
}

#[tauri::command]
pub fn helper_bridge_worker_status() -> HelperBridgeWorkerResponse {
    send_worker_task("status", json!({}))
}

#[tauri::command]
pub fn helper_bridge_preload_asr() -> HelperBridgeWorkerResponse {
    send_worker_task("asr_preload", json!({}))
}

#[tauri::command]
pub fn helper_bridge_preload_translation(mode: Option<String>) -> HelperBridgeWorkerResponse {
    let mode = mode
        .as_deref()
        .map(|value| clean_helper_text(value, 64))
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "Realtime".to_string());
    send_worker_task("translation_preload", json!({ "mode": mode }))
}

#[tauri::command]
pub fn helper_bridge_tts_preflight() -> HelperBridgeWorkerResponse {
    send_worker_task("tts_preflight", json!({}))
}

#[tauri::command]
pub fn helper_bridge_pipeline_contract_smoke() -> HelperBridgeWorkerResponse {
    send_worker_task(
        "dev_pipeline_contract_smoke",
        json!({
            "transcript_text": "Hello from the Rust helper bridge pipeline smoke.",
            "translated_text": "Halo dari smoke test pipeline helper Rust.",
            "tts_text": "Halo dari smoke test pipeline helper Rust.",
        }),
    )
}

#[tauri::command]
pub fn helper_bridge_synthesize_text(
    text: String,
    output_path: Option<String>,
) -> HelperBridgeWorkerResponse {
    send_worker_task(
        "synthesize",
        json!({
            "text": clean_helper_text(&text, MAX_HELPER_TEXT_CHARS),
            "output_path": output_path
                .as_deref()
                .map(|value| clean_helper_text(value, 500))
                .filter(|value| !value.is_empty()),
        }),
    )
}