use serde_json::{json, Value};
use std::io::BufReader;
use std::process::{Command, Stdio};

use crate::commands::diagnostic_trace::{
    trace_command_end, trace_command_error, trace_command_start,
};
use super::bridge_paths::{
    helper_stderr_log_path, slash_path, worker_python, worker_root, worker_script,
};
use super::helper_bridge_runtime::{
    action_result, apply_worker_response, apply_worker_status, read_worker_response, runtime,
    set_blocked, spawn_stderr_logger, status_from_runtime, stop_child, unix_ms,
    write_worker_request, HelperBridgeActionResult, HelperBridgeRequest, HelperBridgeStatus,
};

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

            let python = worker_python();
            let worker = worker_script();
            if !worker.is_file() {
                return set_blocked(&mut runtime, "Missing realtime worker script. Run setup or restore EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py.", "helper_bridge:worker_script_missing");
            }
            if !python.is_file() {
                return set_blocked(&mut runtime, "Missing worker virtual environment Python. Run npm run setup:worker before starting the helper bridge.", "helper_bridge:venv_python_missing");
            }

            runtime.state = "starting".to_string();
            runtime.message = "Starting Python helper worker.".to_string();
            runtime.updated_unix_ms = unix_ms();

            let mut child = match Command::new(&python)
                .arg(&worker)
                .current_dir(worker_root())
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
            {
                Ok(child) => child,
                Err(error) => {
                    return set_blocked(
                        &mut runtime,
                        &format!("Failed to spawn Python helper worker: {error}"),
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
            let mut stdout = BufReader::new(stdout);

            if let Err(error) = write_worker_request(&mut stdin, &json!({ "command": "ping" })) {
                let _ = child.kill();
                let _ = child.wait();
                return set_blocked(
                    &mut runtime,
                    &format!("Failed to send ping to helper worker: {error}"),
                    "helper_bridge:ping_write_failed",
                );
            }
            let ping = match read_worker_response(&mut stdout) {
                Ok(value) => value,
                Err(error) => {
                    let _ = child.kill();
                    let _ = child.wait();
                    return set_blocked(
                        &mut runtime,
                        &format!("Failed to read helper worker ping response: {error}"),
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

            let status =
                if write_worker_request(&mut stdin, &json!({ "command": "status" })).is_ok() {
                    read_worker_response(&mut stdout).ok()
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
                runtime.message = "Python helper worker is running and ping verified. Worker status was not available yet.".to_string();
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
            let response = runtime.stdout.as_mut().map(read_worker_response);
            match response {
                Some(Ok(value)) => {
                    let ok = apply_worker_response(&mut runtime, &value);
                    action_result(ok, &runtime)
                }
                Some(Err(error)) => {
                    runtime.state = "blocked".to_string();
                    runtime.message =
                        format!("Failed to read response from Python helper worker: {error}");
                    runtime.last_error = Some("helper_bridge:response_read_failed".to_string());
                    runtime.updated_unix_ms = unix_ms();
                    action_result(false, &runtime)
                }
                None => set_blocked(
                    &mut runtime,
                    "Helper bridge request failed because worker IO is unavailable.",
                    "helper_bridge:io_missing",
                ),
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
