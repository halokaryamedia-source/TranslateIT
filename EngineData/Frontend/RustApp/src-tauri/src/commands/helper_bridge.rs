use serde::Serialize;
use serde_json::{json, Value};
use std::io::BufReader;
use std::process::{Command, Stdio};

use crate::commands::diagnostic_trace::{
    trace_command_end, trace_command_error, trace_command_start,
};
use super::bridge_paths::{
    helper_stderr_log_path, slash_path, worker_python_candidates,
    worker_python_command_available, worker_root, worker_script,
};
use super::helper_bridge_runtime::{
    action_result, apply_worker_response, apply_worker_status,
    read_worker_response_direct_with_deadline, read_worker_response_with_deadline, runtime,
    set_blocked, spawn_stderr_logger, status_from_runtime, stop_child, unix_ms,
    write_worker_request, HelperBridgeActionResult, HelperBridgeRequest, HelperBridgeStatus,
    DEFAULT_WORKER_RESPONSE_DEADLINE_MS,
};

const MAX_HELPER_TEXT_CHARS: usize = 2_000;

#[derive(Debug, Clone, Serialize)]
pub struct HelperBridgeWorkerResponse {
    pub ok: bool,
    pub state: String,
    pub task: String,
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

fn worker_response_result(
    ok: bool,
    task: &str,
    message: String,
    worker_response: Value,
    runtime: &super::helper_bridge_runtime::HelperBridgeRuntime,
) -> HelperBridgeWorkerResponse {
    HelperBridgeWorkerResponse {
        ok,
        state: runtime.state.clone(),
        task: task.to_string(),
        message,
        generation_token: runtime.generation_token,
        runtime_claim: status_from_runtime(runtime).runtime_claim,
        worker_response_json: worker_response.to_string(),
    }
}

fn blocked_worker_response(
    task: &str,
    runtime: &super::helper_bridge_runtime::HelperBridgeRuntime,
    message: &str,
) -> HelperBridgeWorkerResponse {
    HelperBridgeWorkerResponse {
        ok: false,
        state: runtime.state.clone(),
        task: task.to_string(),
        message: message.to_string(),
        generation_token: runtime.generation_token,
        runtime_claim: status_from_runtime(runtime).runtime_claim,
        worker_response_json: json!({
            "ok": false,
            "stage": task,
            "blocker": runtime.last_error.clone().unwrap_or_else(|| "helper_bridge:not_ready".to_string()),
            "note": message
        })
        .to_string(),
    }
}

fn send_worker_task(task: &str, mut payload: Value) -> HelperBridgeWorkerResponse {
    match runtime().lock() {
        Ok(mut runtime) => {
            if runtime.stdin.is_none() || runtime.stdout.is_none() || runtime.child.is_none() {
                runtime.state = "blocked".to_string();
                runtime.message = "Helper worker is not running. Start Helper first.".to_string();
                runtime.last_error = Some("helper_bridge:not_running".to_string());
                runtime.updated_unix_ms = unix_ms();
                return blocked_worker_response(task, &runtime, "Helper worker is not running. Start Helper first.");
            }

            if let Some(object) = payload.as_object_mut() {
                object.insert("command".to_string(), json!(task));
            } else {
                payload = json!({ "command": task });
            }

            runtime.active_task = Some(task.to_string());
            runtime.updated_unix_ms = unix_ms();

            let write_result = runtime
                .stdin
                .as_mut()
                .map(|stdin| write_worker_request(stdin, &payload));
            if !matches!(write_result, Some(Ok(()))) {
                runtime.state = "blocked".to_string();
                runtime.message = format!("Failed to write {task} request to Python helper worker.");
                runtime.last_error = Some(format!("helper_bridge:{task}_write_failed"));
                runtime.active_task = None;
                runtime.updated_unix_ms = unix_ms();
                return blocked_worker_response(task, &runtime, &format!("Failed to write {task} request to Python helper worker."));
            }

            let response = match read_worker_response_with_deadline(&mut runtime) {
                Ok(value) => value,
                Err(error) => {
                    runtime.state = "blocked".to_string();
                    runtime.message = format!("Failed to read {task} response from Python helper worker before deadline: {error}");
                    runtime.last_error = Some(format!("helper_bridge:{task}_read_failed:{error}"));
                    runtime.active_task = None;
                    runtime.updated_unix_ms = unix_ms();
                    return blocked_worker_response(task, &runtime, &format!("Failed to read {task} response from Python helper worker before deadline: {error}"));
                }
            };

            let ok = apply_worker_response(&mut runtime, &response);
            runtime.active_task = None;
            runtime.updated_unix_ms = unix_ms();
            let message = worker_message(task, &response);
            worker_response_result(ok, task, message, response, &runtime)
        }
        Err(_) => HelperBridgeWorkerResponse {
            ok: false,
            state: "error".to_string(),
            task: task.to_string(),
            message: "Helper bridge state lock is poisoned.".to_string(),
            generation_token: 0,
            runtime_claim: "bridge_state_error".to_string(),
            worker_response_json: json!({
                "ok": false,
                "stage": task,
                "blocker": "helper_bridge:lock_poisoned"
            })
            .to_string(),
        },
    }
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
                    return set_blocked(
                        &mut runtime,
                        "Python helper stdin was not available after spawn.",
                        "helper_bridge:stdin_missing",
                    )
                }
            };
            let stdout = match child.stdout.take() {
                Some(stdout) => stdout,
                None => {
                    return set_blocked(
                        &mut runtime,
                        "Python helper stdout was not available after spawn.",
                        "helper_bridge:stdout_missing",
                    )
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
            runtime.last_error = None;
            runtime.updated_unix_ms = unix_ms();
            if let Some(status) = status {
                apply_worker_status(&mut runtime, &status);
            } else {
                runtime.message = format!("Python helper worker is running via {} and ping verified. Worker status was not available yet.", python.source);
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
                "Helper bridge stopped and any active worker process was terminated.".to_string();
            runtime.cuda_ready = false;
            runtime.provider_ready = false;
            runtime.degraded_mode = false;
            runtime.active_task = None;
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

#[tauri::command]
pub fn cancel_helper_bridge_task() -> HelperBridgeActionResult {
    match runtime().lock() {
        Ok(mut runtime) => {
            runtime.generation_token = runtime.generation_token.saturating_add(1);
            runtime.active_task = None;
            runtime.updated_unix_ms = unix_ms();
            runtime.message =
                "Helper bridge active task was cancelled by generation token invalidation."
                    .to_string();
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
    match runtime().lock() {
        Ok(mut runtime) => {
            let trimmed_task = request.task.trim();
            if trimmed_task.is_empty() {
                runtime.state = "blocked".to_string();
                runtime.message =
                    "Helper bridge request rejected because task is empty.".to_string();
                runtime.last_error = Some("helper_bridge:empty_task".to_string());
                runtime.updated_unix_ms = unix_ms();
                return action_result(false, &runtime);
            }
            if runtime.stdin.is_none() || runtime.stdout.is_none() || runtime.child.is_none() {
                return set_blocked(&mut runtime, "Helper bridge request rejected because the Python worker is not running. Use Start Helper first.", "helper_bridge:not_running");
            }

            runtime.active_task = Some(trimmed_task.to_string());
            runtime.updated_unix_ms = unix_ms();
            let mut payload = request
                .payload_json
                .as_deref()
                .and_then(|raw| serde_json::from_str::<Value>(raw).ok())
                .unwrap_or_else(|| json!({}));
            if let Some(object) = payload.as_object_mut() {
                object.insert("command".to_string(), json!(trimmed_task));
            } else {
                payload = json!({ "command": trimmed_task });
            }

            let write_result = runtime
                .stdin
                .as_mut()
                .map(|stdin| write_worker_request(stdin, &payload));
            if !matches!(write_result, Some(Ok(()))) {
                runtime.state = "blocked".to_string();
                runtime.message = "Failed to write request to Python helper worker.".to_string();
                runtime.last_error = Some("helper_bridge:request_write_failed".to_string());
                runtime.updated_unix_ms = unix_ms();
                return action_result(false, &runtime);
            }
            match read_worker_response_with_deadline(&mut runtime) {
                Ok(value) => {
                    let ok = apply_worker_response(&mut runtime, &value);
                    action_result(ok, &runtime)
                }
                Err(error) => {
                    runtime.state = "blocked".to_string();
                    runtime.message =
                        format!("Failed to read response from Python helper worker before deadline: {error}");
                    runtime.last_error = Some("helper_bridge:response_read_failed".to_string());
                    runtime.updated_unix_ms = unix_ms();
                    action_result(false, &runtime)
                }
            }
        }
        Err(_) => HelperBridgeActionResult {
            ok: false,
            state: "error".to_string(),
            message: "Helper bridge request failed because state lock is poisoned.".to_string(),
            generation_token: 0,
            runtime_claim: "bridge_state_error".to_string(),
        },
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
            "translated_text": "Halo dari smoke pipeline helper bridge Rust."
        }),
    )
}

#[tauri::command]
pub fn helper_bridge_synthesize_text(
    text: String,
    output_path: Option<String>,
) -> HelperBridgeWorkerResponse {
    let text = clean_helper_text(&text, MAX_HELPER_TEXT_CHARS);
    if text.is_empty() {
        return HelperBridgeWorkerResponse {
            ok: false,
            state: "invalid_request".to_string(),
            task: "synthesize".to_string(),
            message: "Synthesize request rejected because text is empty.".to_string(),
            generation_token: get_helper_bridge_status().generation_token,
            runtime_claim: "invalid_request".to_string(),
            worker_response_json: json!({
                "ok": false,
                "stage": "synthesize",
                "blocker": "tts:empty_text"
            })
            .to_string(),
        };
    }

    let mut payload = json!({ "text": text });
    if let Some(output_path) = output_path
        .as_deref()
        .map(|value| clean_helper_text(value, 500))
        .filter(|value| !value.is_empty())
    {
        if let Some(object) = payload.as_object_mut() {
            object.insert("output_path".to_string(), json!(output_path));
        }
    }

    send_worker_task("synthesize", payload)
}
