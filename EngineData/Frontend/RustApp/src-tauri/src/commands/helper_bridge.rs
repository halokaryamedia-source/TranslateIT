use serde::Serialize;
use serde_json::{json, Value};
use std::io::BufReader;
use std::process::{Command, Stdio};

use crate::commands::diagnostic_trace::{
    trace_command_end, trace_command_error, trace_command_start,
};
use crate::engine::runtime_state::runtime_generation_is_authoritative;

use super::bridge_paths::{
    helper_stderr_log_path, slash_path, worker_python_candidates,
    worker_python_command_available, worker_root, worker_script,
};
use super::helper_bridge_runtime::{
    acquire_helper_task_permit, action_result, apply_worker_response, apply_worker_status,
    clear_active_request, read_worker_response_direct_with_deadline, runtime, set_blocked,
    spawn_stderr_logger, status_from_runtime, stop_child, unix_ms, write_worker_request,
    HelperBridgeActionResult, HelperBridgeRequest, HelperBridgeStatus, HelperTaskPriority,
    DEFAULT_WORKER_RESPONSE_DEADLINE_MS,
};

const MAX_HELPER_TEXT_CHARS: usize = 2_000;

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

fn meeting_generation(payload: &Value) -> Option<u64> {
    payload.get("meeting_generation").and_then(Value::as_u64)
}

fn task_priority(task: &str, payload: &Value) -> HelperTaskPriority {
    if meeting_generation(payload).is_some() {
        HelperTaskPriority::Meeting
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

fn send_worker_task(task: &str, mut payload: Value) -> HelperBridgeWorkerResponse {
    let priority = task_priority(task, &payload);
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
    let meeting_generation = meeting_generation(&payload);

    if meeting_generation
        .map(|generation| !runtime_generation_is_authoritative(generation))
        .unwrap_or(false)
    {
        return standalone_blocked_response(
            task,
            &request_id,
            priority,
            "stale_generation",
            "helper_scheduler:meeting_generation_not_authoritative",
            "Queued Meeting work was discarded before worker execution because its generation no longer owns output authority.",
        );
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
        return match runtime().lock() {
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
                blocked_response_from_runtime(task, &request_id, priority, &runtime.message.clone(), &runtime)
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
    }

    let (mut worker_response, stdout) =
        match read_worker_response_direct_with_deadline(stdout, DEFAULT_WORKER_RESPONSE_DEADLINE_MS) {
            Ok(value) => value,
            Err(error) => {
                return match runtime().lock() {
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
                        blocked_response_from_runtime(
                            task,
                            &request_id,
                            priority,
                            &runtime.message.clone(),
                            &runtime,
                        )
                    }
                    Err(_) => standalone_blocked_response(
                        task,
                        &request_id,
                        priority,
                        "error",
                        "helper_bridge:lock_poisoned_after_read_failure",
                        "Helper response failed and bridge state could not be recovered.",
                    ),
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

            if meeting_generation
                .map(|generation| !runtime_generation_is_authoritative(generation))
                .unwrap_or(false)
            {
                clear_active_request(&mut runtime, &request_id);
                runtime.message =
                    "Meeting worker result was discarded because its generation is no longer authoritative."
                        .to_string();
                runtime.updated_unix_ms = unix_ms();
                return response_with_runtime(
                    false,
                    task,
                    &request_id,
                    priority,
                    runtime.message.clone(),
                    json!({
                        "ok": false,
                        "stage": task,
                        "request_id": request_id,
                        "scheduler_priority": priority.label(),
                        "blocker": "helper_scheduler:meeting_generation_not_authoritative",
                        "note": runtime.message,
                    }),
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

pub fn send_helper_worker_task(task: &str, payload: Value) -> HelperBridgeWorkerResponse {
    send_worker_task(task, payload)
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

#[tauri::command]
pub fn start_helper_bridge() -> HelperBridgeActionResult {
    match runtime().lock() {
        Ok(mut runtime) => {
            runtime.generation_token = runtime.generation_token.saturating_add(1);
            stop_child(&mut runtime);
            runtime.active_task = None;
            runtime.active_request_id = None;
            runtime.active_meeting_generation = None;

            let worker = worker_script();
            if !worker.is_file() {
                return set_blocked(&mut runtime, "Missing realtime worker script. Restore EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py before starting the helper bridge.", "helper_bridge:worker_script_missing");
            }

            let python = worker_python_candidates()
                .into_iter()
                .find(worker_python_command_available);
            let Some(python) = python else {
                return set_blocked(&mut runtime, "No usable Python runtime was found for the helper worker. Set TRANSLATEIT_WORKER_PYTHON, create the WorkerRuntime .venv, or install Python on PATH.", "helper_bridge:python_runtime_missing");
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
pub fn stop_helper_bridge() -> HelperBridgeActionResult {
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
    match runtime().lock() {
        Ok(mut runtime) => {
            if runtime.active_meeting_generation == Some(generation) {
                runtime.generation_token = runtime.generation_token.saturating_add(1);
                stop_child(&mut runtime);
                runtime.state = "stopped".to_string();
                runtime.message = format!(
                    "In-flight Meeting generation {generation} helper inference was hard-cancelled by terminating the persistent worker process."
                );
                runtime.cuda_ready = false;
                runtime.provider_ready = false;
                runtime.degraded_mode = false;
                runtime.active_task = None;
                runtime.active_request_id = None;
                runtime.active_meeting_generation = None;
                runtime.last_error = Some("helper_bridge:meeting_generation_hard_cancelled".to_string());
                runtime.updated_unix_ms = unix_ms();
                action_result(true, &runtime)
            } else {
                runtime.message = format!(
                    "No in-flight helper task belongs to Meeting generation {generation}. Queued work for the revoked generation will be rejected before execution."
                );
                runtime.updated_unix_ms = unix_ms();
                action_result(true, &runtime)
            }
        }
        Err(_) => HelperBridgeActionResult {
            ok: false,
            state: "error".to_string(),
            message: "Meeting helper cancellation failed because state lock is poisoned.".to_string(),
            generation_token: 0,
            runtime_claim: "bridge_state_error".to_string(),
        },
    }
}

#[tauri::command]
pub fn cancel_helper_bridge_task() -> HelperBridgeActionResult {
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
