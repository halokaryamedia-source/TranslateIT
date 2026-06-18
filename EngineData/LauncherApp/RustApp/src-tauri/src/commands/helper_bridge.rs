use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, ChildStderr, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::{Mutex, OnceLock};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::engine::paths::ProjectPaths;

#[derive(Debug, Clone, Serialize)]
pub struct HelperBridgeStatus {
    pub state: String,
    pub message: String,
    pub cuda_ready: bool,
    pub provider_ready: bool,
    pub degraded_mode: bool,
    pub active_task: Option<String>,
    pub generation_token: u64,
    pub last_error: Option<String>,
    pub stderr_log_path: Option<String>,
    pub updated_unix_ms: u128,
    pub runtime_claim: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct HelperBridgeActionResult {
    pub ok: bool,
    pub state: String,
    pub message: String,
    pub generation_token: u64,
    pub runtime_claim: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct HelperBridgeRequest {
    pub task: String,
    pub payload_json: Option<String>,
}

struct HelperBridgeRuntime {
    state: String,
    message: String,
    cuda_ready: bool,
    provider_ready: bool,
    degraded_mode: bool,
    active_task: Option<String>,
    generation_token: u64,
    last_error: Option<String>,
    stderr_log_path: Option<String>,
    updated_unix_ms: u128,
    child: Option<Child>,
    stdin: Option<ChildStdin>,
    stdout: Option<BufReader<ChildStdout>>,
}

impl Default for HelperBridgeRuntime {
    fn default() -> Self {
        Self {
            state: "not_started".to_string(),
            message: "Helper bridge contract exists; runtime process bridge is not started yet."
                .to_string(),
            cuda_ready: false,
            provider_ready: false,
            degraded_mode: false,
            active_task: None,
            generation_token: 0,
            last_error: None,
            stderr_log_path: None,
            updated_unix_ms: unix_ms(),
            child: None,
            stdin: None,
            stdout: None,
        }
    }
}

static HELPER_BRIDGE_RUNTIME: OnceLock<Mutex<HelperBridgeRuntime>> = OnceLock::new();

fn runtime() -> &'static Mutex<HelperBridgeRuntime> {
    HELPER_BRIDGE_RUNTIME.get_or_init(|| Mutex::new(HelperBridgeRuntime::default()))
}

fn unix_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

fn runtime_claim(runtime: &HelperBridgeRuntime) -> String {
    if runtime.child.is_some() && runtime.state == "ready" {
        "helper_process_ready_ping_verified".to_string()
    } else {
        "bridge_lifecycle_visible_process_not_ready".to_string()
    }
}

fn status_from_runtime(runtime: &HelperBridgeRuntime) -> HelperBridgeStatus {
    HelperBridgeStatus {
        state: runtime.state.clone(),
        message: runtime.message.clone(),
        cuda_ready: runtime.cuda_ready,
        provider_ready: runtime.provider_ready,
        degraded_mode: runtime.degraded_mode,
        active_task: runtime.active_task.clone(),
        generation_token: runtime.generation_token,
        last_error: runtime.last_error.clone(),
        stderr_log_path: runtime.stderr_log_path.clone(),
        updated_unix_ms: runtime.updated_unix_ms,
        runtime_claim: runtime_claim(runtime),
    }
}

fn action_result(ok: bool, runtime: &HelperBridgeRuntime) -> HelperBridgeActionResult {
    HelperBridgeActionResult {
        ok,
        state: runtime.state.clone(),
        message: runtime.message.clone(),
        generation_token: runtime.generation_token,
        runtime_claim: runtime_claim(runtime),
    }
}

fn project_root() -> PathBuf {
    PathBuf::from(ProjectPaths::discover().project_root)
}

fn worker_root() -> PathBuf {
    project_root()
        .join("EngineData")
        .join("Backend")
        .join("LocalWorker")
        .join("WorkerRuntime")
}

fn worker_script() -> PathBuf {
    worker_root().join("realtime_local_worker.py")
}

fn worker_python() -> PathBuf {
    if cfg!(windows) {
        worker_root()
            .join(".venv")
            .join("Scripts")
            .join("python.exe")
    } else {
        worker_root().join(".venv").join("bin").join("python")
    }
}

fn helper_bridge_log_dir() -> PathBuf {
    PathBuf::from(ProjectPaths::discover().user_cache_dir)
        .join("HelperBridge")
        .join("logs")
}

fn helper_stderr_log_path(generation_token: u64) -> PathBuf {
    helper_bridge_log_dir().join(format!("helper_bridge_stderr_{generation_token}.log"))
}

fn slash_path(path: &PathBuf) -> String {
    path.to_string_lossy().replace('\\', "/")
}

fn spawn_stderr_logger(stderr: ChildStderr, log_path: PathBuf) {
    thread::spawn(move || {
        if let Some(parent) = log_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_path) else {
            return;
        };
        let mut reader = BufReader::new(stderr);
        let mut line = String::new();
        loop {
            line.clear();
            match reader.read_line(&mut line) {
                Ok(0) => break,
                Ok(_) => {
                    let _ = file.write_all(line.as_bytes());
                    let _ = file.flush();
                }
                Err(_) => break,
            }
        }
    });
}

fn set_blocked(
    runtime: &mut HelperBridgeRuntime,
    message: &str,
    error: &str,
) -> HelperBridgeActionResult {
    runtime.state = "blocked".to_string();
    runtime.message = message.to_string();
    runtime.cuda_ready = false;
    runtime.provider_ready = false;
    runtime.degraded_mode = false;
    runtime.active_task = None;
    runtime.last_error = Some(error.to_string());
    runtime.updated_unix_ms = unix_ms();
    action_result(false, runtime)
}

fn worker_bool(value: &Value, key: &str) -> bool {
    value.get(key).and_then(Value::as_bool).unwrap_or(false)
}

fn worker_text(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .filter(|text| !text.is_empty())
        .map(str::to_string)
}

fn apply_worker_status(runtime: &mut HelperBridgeRuntime, status: &Value) {
    let worker_ok = worker_bool(status, "ok");
    let cuda_ready = worker_bool(status, "torch_cuda_available");
    let tts_ready = worker_bool(status, "tts_default_ready");
    let asr_ready =
        worker_bool(status, "asr_model_ready") || worker_bool(status, "asr_backup_model_ready");
    let translation_ready = worker_bool(status, "translation_model_ready")
        || worker_bool(status, "quality_translation_model_ready");
    runtime.cuda_ready = cuda_ready;
    runtime.provider_ready = worker_ok && asr_ready && translation_ready && tts_ready;
    runtime.degraded_mode = worker_ok && !cuda_ready;
    runtime.last_error = worker_text(status, "blocker");
    runtime.message = if runtime.provider_ready {
        "Python helper worker is running. Worker status reports ASR, translation, and TTS provider readiness.".to_string()
    } else if let Some(blocker) = &runtime.last_error {
        format!("Python helper worker is running, but provider readiness is blocked: {blocker}")
    } else {
        "Python helper worker is running, but provider readiness is incomplete.".to_string()
    };
}

fn apply_worker_response(runtime: &mut HelperBridgeRuntime, value: &Value) -> bool {
    let ok = worker_bool(value, "ok");
    runtime.state = if ok {
        "ready".to_string()
    } else {
        "blocked".to_string()
    };
    if value.get("stage").and_then(Value::as_str) == Some("local_realtime_worker_preflight") {
        apply_worker_status(runtime, value);
    } else {
        runtime.cuda_ready = worker_bool(value, "torch_cuda_available") || runtime.cuda_ready;
        runtime.provider_ready = ok;
        runtime.degraded_mode = value.get("device").and_then(Value::as_str) == Some("cpu")
            || value
                .get("device_note")
                .and_then(Value::as_str)
                .map(|note| note.contains("fallback") || note.contains("cpu"))
                .unwrap_or(false);
        runtime.last_error = worker_text(value, "blocker");
        runtime.message = worker_text(value, "note")
            .or_else(|| worker_text(value, "stage"))
            .unwrap_or_else(|| "Helper request completed.".to_string());
    }
    runtime.updated_unix_ms = unix_ms();
    ok
}

fn write_worker_request(stdin: &mut ChildStdin, payload: &Value) -> Result<(), String> {
    let body = serde_json::to_string(payload).map_err(|error| error.to_string())?;
    stdin
        .write_all(body.as_bytes())
        .map_err(|error| error.to_string())?;
    stdin.write_all(b"\n").map_err(|error| error.to_string())?;
    stdin.flush().map_err(|error| error.to_string())
}

fn read_worker_response(stdout: &mut BufReader<ChildStdout>) -> Result<Value, String> {
    let mut line = String::new();
    let size = stdout
        .read_line(&mut line)
        .map_err(|error| error.to_string())?;
    if size == 0 {
        return Err("worker:stdout_closed".to_string());
    }
    serde_json::from_str::<Value>(&line).map_err(|error| error.to_string())
}

fn stop_child(runtime: &mut HelperBridgeRuntime) {
    runtime.stdin.take();
    runtime.stdout.take();
    if let Some(mut child) = runtime.child.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
}

#[tauri::command]
pub fn get_helper_bridge_status() -> HelperBridgeStatus {
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
            status_from_runtime(&runtime)
        }
        Err(_) => HelperBridgeStatus {
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
        },
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
