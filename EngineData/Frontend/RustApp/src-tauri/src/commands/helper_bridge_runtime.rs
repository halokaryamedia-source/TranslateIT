use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, ChildStderr, ChildStdin, ChildStdout};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::sync::{Condvar, Mutex, OnceLock};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

pub const WORKER_CONTROL_RESPONSE_DEADLINE_MS: u128 = 5_000;
pub const WORKER_STATUS_RESPONSE_DEADLINE_MS: u128 = 30_000;
pub const WORKER_PRELOAD_RESPONSE_DEADLINE_MS: u128 = 120_000;
pub const WORKER_INFERENCE_RESPONSE_DEADLINE_MS: u128 = 90_000;
pub const WORKER_SYNTHESIS_RESPONSE_DEADLINE_MS: u128 = 45_000;
pub const WORKER_FALLBACK_RESPONSE_DEADLINE_MS: u128 = WORKER_STATUS_RESPONSE_DEADLINE_MS;

pub fn worker_response_deadline_ms(task: &str) -> u128 {
    match task {
        "ping" => WORKER_CONTROL_RESPONSE_DEADLINE_MS,
        "status" | "tts_preflight" => WORKER_STATUS_RESPONSE_DEADLINE_MS,
        "asr_preload" | "translation_preload" => WORKER_PRELOAD_RESPONSE_DEADLINE_MS,
        "transcribe" | "translate" => WORKER_INFERENCE_RESPONSE_DEADLINE_MS,
        "synthesize" => WORKER_SYNTHESIS_RESPONSE_DEADLINE_MS,
        _ => WORKER_FALLBACK_RESPONSE_DEADLINE_MS,
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct HelperBridgeStatus {
    pub state: String,
    pub message: String,
    pub cuda_ready: bool,
    pub provider_ready: bool,
    pub degraded_mode: bool,
    pub active_task: Option<String>,
    pub active_request_id: Option<String>,
    pub active_meeting_generation: Option<u64>,
    pub active_meeting_session_id: Option<String>,
    pub active_meeting_lane: Option<String>,
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

pub struct HelperBridgeRuntime {
    pub state: String,
    pub message: String,
    pub cuda_ready: bool,
    pub provider_ready: bool,
    pub degraded_mode: bool,
    pub active_task: Option<String>,
    pub active_request_id: Option<String>,
    pub active_meeting_generation: Option<u64>,
    pub active_meeting_session_id: Option<String>,
    pub active_meeting_lane: Option<String>,
    pub generation_token: u64,
    pub last_error: Option<String>,
    pub stderr_log_path: Option<String>,
    pub updated_unix_ms: u128,
    pub child: Option<Child>,
    pub stdin: Option<ChildStdin>,
    pub stdout: Option<BufReader<ChildStdout>>,
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
            active_request_id: None,
            active_meeting_generation: None,
            active_meeting_session_id: None,
            active_meeting_lane: None,
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

pub fn runtime() -> &'static Mutex<HelperBridgeRuntime> {
    HELPER_BRIDGE_RUNTIME.get_or_init(|| Mutex::new(HelperBridgeRuntime::default()))
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HelperTaskPriority {
    MeetingOutbound,
    MeetingIncoming,
    Text,
    Diagnostic,
}

impl HelperTaskPriority {
    pub fn label(self) -> &'static str {
        match self {
            Self::MeetingOutbound => "meeting_outbound",
            Self::MeetingIncoming => "meeting_incoming",
            Self::Text => "text",
            Self::Diagnostic => "diagnostic",
        }
    }
}

#[derive(Debug, Default)]
struct HelperSchedulerState {
    active: bool,
    waiting_meeting_outbound: u32,
    waiting_meeting_incoming: u32,
    waiting_text: u32,
    waiting_diagnostic: u32,
    next_request_sequence: u64,
}

static HELPER_SCHEDULER: OnceLock<(Mutex<HelperSchedulerState>, Condvar)> = OnceLock::new();

fn scheduler() -> &'static (Mutex<HelperSchedulerState>, Condvar) {
    HELPER_SCHEDULER.get_or_init(|| (Mutex::new(HelperSchedulerState::default()), Condvar::new()))
}

pub struct HelperTaskPermit {
    request_id: String,
    priority: HelperTaskPriority,
}

impl HelperTaskPermit {
    pub fn request_id(&self) -> &str {
        &self.request_id
    }

    pub fn priority(&self) -> HelperTaskPriority {
        self.priority
    }
}

impl Drop for HelperTaskPermit {
    fn drop(&mut self) {
        let (lock, wake) = scheduler();
        if let Ok(mut state) = lock.lock() {
            state.active = false;
            wake.notify_all();
        }
    }
}

fn scheduler_waiting_increment(state: &mut HelperSchedulerState, priority: HelperTaskPriority) {
    match priority {
        HelperTaskPriority::MeetingOutbound => {
            state.waiting_meeting_outbound = state.waiting_meeting_outbound.saturating_add(1)
        }
        HelperTaskPriority::MeetingIncoming => {
            state.waiting_meeting_incoming = state.waiting_meeting_incoming.saturating_add(1)
        }
        HelperTaskPriority::Text => state.waiting_text = state.waiting_text.saturating_add(1),
        HelperTaskPriority::Diagnostic => {
            state.waiting_diagnostic = state.waiting_diagnostic.saturating_add(1)
        }
    }
}

fn scheduler_waiting_decrement(state: &mut HelperSchedulerState, priority: HelperTaskPriority) {
    match priority {
        HelperTaskPriority::MeetingOutbound => {
            state.waiting_meeting_outbound = state.waiting_meeting_outbound.saturating_sub(1)
        }
        HelperTaskPriority::MeetingIncoming => {
            state.waiting_meeting_incoming = state.waiting_meeting_incoming.saturating_sub(1)
        }
        HelperTaskPriority::Text => state.waiting_text = state.waiting_text.saturating_sub(1),
        HelperTaskPriority::Diagnostic => {
            state.waiting_diagnostic = state.waiting_diagnostic.saturating_sub(1)
        }
    }
}

fn scheduler_can_enter(state: &HelperSchedulerState, priority: HelperTaskPriority) -> bool {
    if state.active {
        return false;
    }
    match priority {
        HelperTaskPriority::MeetingOutbound => true,
        HelperTaskPriority::MeetingIncoming => state.waiting_meeting_outbound == 0,
        HelperTaskPriority::Text => {
            state.waiting_meeting_outbound == 0 && state.waiting_meeting_incoming == 0
        }
        HelperTaskPriority::Diagnostic => {
            state.waiting_meeting_outbound == 0
                && state.waiting_meeting_incoming == 0
                && state.waiting_text == 0
        }
    }
}

pub fn acquire_helper_task_permit(
    priority: HelperTaskPriority,
) -> Result<HelperTaskPermit, String> {
    let (lock, wake) = scheduler();
    let mut state = lock
        .lock()
        .map_err(|_| "helper_scheduler:lock_poisoned".to_string())?;
    scheduler_waiting_increment(&mut state, priority);

    while !scheduler_can_enter(&state, priority) {
        state = wake
            .wait(state)
            .map_err(|_| "helper_scheduler:wait_lock_poisoned".to_string())?;
    }

    scheduler_waiting_decrement(&mut state, priority);
    state.active = true;
    state.next_request_sequence = state.next_request_sequence.saturating_add(1);
    Ok(HelperTaskPermit {
        request_id: format!("helper-{}", state.next_request_sequence),
        priority,
    })
}

pub fn unix_ms() -> u128 {
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

pub fn status_from_runtime(runtime: &HelperBridgeRuntime) -> HelperBridgeStatus {
    HelperBridgeStatus {
        state: runtime.state.clone(),
        message: runtime.message.clone(),
        cuda_ready: runtime.cuda_ready,
        provider_ready: runtime.provider_ready,
        degraded_mode: runtime.degraded_mode,
        active_task: runtime.active_task.clone(),
        active_request_id: runtime.active_request_id.clone(),
        active_meeting_generation: runtime.active_meeting_generation,
        active_meeting_session_id: runtime.active_meeting_session_id.clone(),
        active_meeting_lane: runtime.active_meeting_lane.clone(),
        generation_token: runtime.generation_token,
        last_error: runtime.last_error.clone(),
        stderr_log_path: runtime.stderr_log_path.clone(),
        updated_unix_ms: runtime.updated_unix_ms,
        runtime_claim: runtime_claim(runtime),
    }
}

pub fn action_result(ok: bool, runtime: &HelperBridgeRuntime) -> HelperBridgeActionResult {
    HelperBridgeActionResult {
        ok,
        state: runtime.state.clone(),
        message: runtime.message.clone(),
        generation_token: runtime.generation_token,
        runtime_claim: runtime_claim(runtime),
    }
}

pub fn spawn_stderr_logger(stderr: ChildStderr, log_path: PathBuf) {
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

pub fn clear_active_request(runtime: &mut HelperBridgeRuntime, request_id: &str) {
    if runtime.active_request_id.as_deref() == Some(request_id) {
        runtime.active_task = None;
        runtime.active_request_id = None;
        runtime.active_meeting_generation = None;
        runtime.active_meeting_session_id = None;
        runtime.active_meeting_lane = None;
    }
}

pub fn set_blocked(
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
    runtime.active_request_id = None;
    runtime.active_meeting_generation = None;
    runtime.active_meeting_session_id = None;
    runtime.active_meeting_lane = None;
    runtime.last_error = Some(error.to_string());
    runtime.updated_unix_ms = unix_ms();
    action_result(false, runtime)
}

pub fn worker_bool(value: &Value, key: &str) -> bool {
    value.get(key).and_then(Value::as_bool).unwrap_or(false)
}

fn worker_nested_bool(value: &Value, section: &str, key: &str) -> bool {
    value
        .get(section)
        .and_then(|section| section.get(key))
        .and_then(Value::as_bool)
        .unwrap_or(false)
}

pub fn worker_text(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .filter(|text| !text.is_empty())
        .map(str::to_string)
}

fn is_contract_only_response(value: &Value) -> bool {
    let stage = value
        .get("stage")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let runtime_claim = value
        .get("runtime_claim")
        .and_then(Value::as_str)
        .unwrap_or_default();
    stage == "dev_pipeline_contract_smoke"
        || stage == "translation_handoff"
        || stage == "tts_handoff"
        || runtime_claim.contains("no_model_runtime_claim")
        || runtime_claim.contains("no_decoder_runtime_claim")
        || runtime_claim.contains("no_runtime_claim")
}

pub fn apply_worker_status(runtime: &mut HelperBridgeRuntime, status: &Value) {
    let worker_ok = worker_bool(status, "ok");
    let asr_ready = worker_nested_bool(status, "readiness", "asr");
    let realtime_translation_ready =
        worker_nested_bool(status, "readiness", "translation_realtime");
    let tts_ready = worker_nested_bool(status, "readiness", "tts");
    let cuda_degraded = worker_nested_bool(status, "readiness", "cuda_degraded");

    runtime.cuda_ready = !cuda_degraded;
    runtime.provider_ready = worker_ok && asr_ready && realtime_translation_ready && tts_ready;
    runtime.degraded_mode = worker_ok && cuda_degraded;
    runtime.last_error = worker_text(status, "blocker").filter(|value| !value.is_empty());
    runtime.message = if runtime.provider_ready {
        "Python helper process is running and current worker status reports the required outbound AI capabilities available."
            .to_string()
    } else if let Some(blocker) = &runtime.last_error {
        format!(
            "Python helper process is running, but one or more required outbound AI capabilities are unavailable: {blocker}"
        )
    } else {
        "Python helper process is running. Capability status is incomplete; inspect the worker capability response instead of inferring readiness from process state."
            .to_string()
    };
}

pub fn apply_worker_response(runtime: &mut HelperBridgeRuntime, value: &Value) -> bool {
    let ok = worker_bool(value, "ok");
    let stage = value
        .get("stage")
        .and_then(Value::as_str)
        .unwrap_or_default();

    if stage == "local_realtime_worker_preflight" {
        apply_worker_status(runtime, value);
    } else if is_contract_only_response(value) {
        runtime.last_error = worker_text(value, "blocker").filter(|blocker| !blocker.is_empty());
        runtime.message = worker_text(value, "note")
            .or_else(|| worker_text(value, "stage"))
            .unwrap_or_else(|| "Helper contract request completed.".to_string());
    } else {
        let required_outbound_prepare_failed = !ok
            && (stage == "asr_preload"
                || stage == "tts_preflight"
                || (stage == "translation_preload"
                    && value.get("direction_pair").and_then(Value::as_str) == Some("id->en")));
        if required_outbound_prepare_failed {
            // A required Start-preparation stage has proved the current outbound
            // provider unusable. Keep readiness fail-closed until a later status or
            // successful preparation re-establishes it.
            runtime.provider_ready = false;
        }

        let request_degraded = value.get("device").and_then(Value::as_str) == Some("cpu")
            || value
                .get("device_note")
                .and_then(Value::as_str)
                .map(|note| note.contains("fallback") || note.contains("cpu"))
                .unwrap_or(false);
        if request_degraded {
            runtime.degraded_mode = true;
        }
        runtime.last_error = if ok {
            None
        } else {
            worker_text(value, "blocker").filter(|blocker| !blocker.is_empty())
        };
        runtime.message = worker_text(value, "note")
            .or_else(|| worker_text(value, "stage"))
            .unwrap_or_else(|| {
                if ok {
                    "Helper request completed.".to_string()
                } else {
                    "Helper request failed; worker process remains available unless the bridge reports an I/O/lifecycle failure."
                        .to_string()
                }
            });
    }

    if runtime.child.is_some() {
        runtime.state = "ready".to_string();
    }
    runtime.updated_unix_ms = unix_ms();
    ok
}

pub fn request_deadline_payload(payload: &Value, deadline_ms: u128) -> Value {
    let started = unix_ms();
    let deadline = started.saturating_add(deadline_ms);
    let mut payload = payload.clone();
    if let Some(object) = payload.as_object_mut() {
        object
            .entry("request_unix_ms".to_string())
            .or_insert(json!(started));
        object
            .entry("deadline_unix_ms".to_string())
            .or_insert(json!(deadline));
        object
            .entry("deadline_ms".to_string())
            .or_insert(json!(deadline_ms));
    }
    payload
}

pub fn write_worker_request_with_deadline(
    stdin: &mut ChildStdin,
    payload: &Value,
    deadline_ms: u128,
) -> Result<(), String> {
    let payload = request_deadline_payload(payload, deadline_ms);
    let body = serde_json::to_string(&payload).map_err(|error| error.to_string())?;
    stdin
        .write_all(body.as_bytes())
        .map_err(|error| error.to_string())?;
    stdin.write_all(b"\n").map_err(|error| error.to_string())?;
    stdin.flush().map_err(|error| error.to_string())
}

pub fn write_worker_request(stdin: &mut ChildStdin, payload: &Value) -> Result<(), String> {
    let task = payload
        .get("command")
        .and_then(Value::as_str)
        .unwrap_or_default();
    write_worker_request_with_deadline(stdin, payload, worker_response_deadline_ms(task))
}

pub fn read_worker_response(stdout: &mut BufReader<ChildStdout>) -> Result<Value, String> {
    let mut line = String::new();
    let size = stdout
        .read_line(&mut line)
        .map_err(|error| format!("worker:read_failed:{error}"))?;
    if size == 0 {
        return Err("worker:stdout_closed".to_string());
    }
    serde_json::from_str::<Value>(&line)
        .map_err(|error| format!("worker:invalid_json_response:{error}"))
}

pub fn read_worker_response_direct_with_deadline(
    mut stdout: BufReader<ChildStdout>,
    deadline_ms: u128,
) -> Result<(Value, BufReader<ChildStdout>), String> {
    let (sender, receiver) = mpsc::channel();
    thread::spawn(move || {
        let result = read_worker_response(&mut stdout);
        let _ = sender.send((result, stdout));
    });

    let timeout = Duration::from_millis(deadline_ms.min(u64::MAX as u128) as u64);
    match receiver.recv_timeout(timeout) {
        Ok((Ok(value), stdout)) => Ok((value, stdout)),
        Ok((Err(error), _stdout)) => Err(error),
        Err(RecvTimeoutError::Timeout) => {
            Err(format!("worker:response_deadline_exceeded:{deadline_ms}ms"))
        }
        Err(RecvTimeoutError::Disconnected) => {
            Err("worker:response_reader_disconnected".to_string())
        }
    }
}

pub fn read_worker_response_with_deadline(
    runtime: &mut HelperBridgeRuntime,
) -> Result<Value, String> {
    let Some(stdout) = runtime.stdout.take() else {
        return Err("worker:stdout_missing".to_string());
    };
    match read_worker_response_direct_with_deadline(stdout, WORKER_FALLBACK_RESPONSE_DEADLINE_MS) {
        Ok((value, stdout)) => {
            runtime.stdout = Some(stdout);
            Ok(value)
        }
        Err(error) => {
            runtime.stdout = None;
            runtime.state = "blocked".to_string();
            runtime.message =
                format!("Helper worker response failed or exceeded deadline: {error}");
            runtime.last_error = Some(error.clone());
            runtime.active_task = None;
            runtime.active_request_id = None;
            runtime.active_meeting_generation = None;
            runtime.active_meeting_session_id = None;
            runtime.active_meeting_lane = None;
            runtime.updated_unix_ms = unix_ms();
            stop_child(runtime);
            Err(error)
        }
    }
}

pub fn stop_child(runtime: &mut HelperBridgeRuntime) {
    runtime.stdin.take();
    runtime.stdout.take();
    if let Some(mut child) = runtime.child.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
}

#[cfg(test)]
mod deadline_policy_tests {
    use super::*;

    #[test]
    fn worker_deadlines_follow_bounded_task_cost_classes() {
        assert_eq!(worker_response_deadline_ms("ping"), 5_000);
        assert_eq!(worker_response_deadline_ms("status"), 30_000);
        assert_eq!(worker_response_deadline_ms("tts_preflight"), 30_000);
        assert_eq!(worker_response_deadline_ms("asr_preload"), 120_000);
        assert_eq!(worker_response_deadline_ms("translation_preload"), 120_000);
        assert_eq!(worker_response_deadline_ms("transcribe"), 90_000);
        assert_eq!(worker_response_deadline_ms("translate"), 90_000);
        assert_eq!(worker_response_deadline_ms("synthesize"), 45_000);
        assert_eq!(worker_response_deadline_ms("unknown"), 30_000);
    }

    #[test]
    fn request_metadata_uses_selected_deadline_without_overwriting_caller_metadata() {
        let deadline_ms = worker_response_deadline_ms("synthesize");
        let payload = request_deadline_payload(&json!({"command": "synthesize"}), deadline_ms);
        let started = payload
            .get("request_unix_ms")
            .and_then(Value::as_u64)
            .unwrap() as u128;
        let deadline = payload
            .get("deadline_unix_ms")
            .and_then(Value::as_u64)
            .unwrap() as u128;
        assert_eq!(
            payload.get("deadline_ms").and_then(Value::as_u64),
            Some(45_000)
        );
        assert_eq!(deadline.saturating_sub(started), deadline_ms);

        let preserved = request_deadline_payload(
            &json!({
                "command": "ping",
                "request_unix_ms": 10_u64,
                "deadline_unix_ms": 20_u64,
                "deadline_ms": 10_u64
            }),
            worker_response_deadline_ms("ping"),
        );
        assert_eq!(
            preserved.get("request_unix_ms").and_then(Value::as_u64),
            Some(10)
        );
        assert_eq!(
            preserved.get("deadline_unix_ms").and_then(Value::as_u64),
            Some(20)
        );
        assert_eq!(
            preserved.get("deadline_ms").and_then(Value::as_u64),
            Some(10)
        );
    }
}
