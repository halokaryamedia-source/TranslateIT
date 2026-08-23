use serde::Serialize;
use serde_json::{json, Value};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStderr, ChildStdin, ChildStdout};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::sync::{Condvar, Mutex, OnceLock};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use crate::engine::logging::{write_jsonl_event, RuntimeLogEvent};

pub const WORKER_CONTROL_RESPONSE_DEADLINE_MS: u128 = 5_000;
pub const WORKER_STATUS_RESPONSE_DEADLINE_MS: u128 = 30_000;
pub const WORKER_PRELOAD_RESPONSE_DEADLINE_MS: u128 = 120_000;
pub const WORKER_INFERENCE_RESPONSE_DEADLINE_MS: u128 = 90_000;
// Standalone Text translation gets exactly one attempt (transport retry is reserved
// for MeetingOutbound lanes), so its host deadline must cover one full multi-chunk
// job: realtime_local_worker_base.handle_standalone_text_translate runs sequential
// per-chunk helper requests bounded by translation_envelope.MAX_STANDALONE_TRANSLATION_CHUNKS
// and stops on cooperative deadline expiry between chunks.
pub const STANDALONE_TRANSLATION_DEADLINE_MS: u128 = 180_000;
pub const WORKER_SYNTHESIS_RESPONSE_DEADLINE_MS: u128 = 45_000;
pub const WORKER_FALLBACK_RESPONSE_DEADLINE_MS: u128 = WORKER_STATUS_RESPONSE_DEADLINE_MS;

pub const HELPER_SCHEDULER_TOTAL_ADMISSION_CAP: u32 = 8;
pub const HELPER_SCHEDULER_MEETING_OUTBOUND_WAIT_MS: u64 = 120_000;
pub const HELPER_SCHEDULER_MEETING_INCOMING_WAIT_MS: u64 = 30_000;
pub const HELPER_SCHEDULER_TEXT_WAIT_MS: u64 = 15_000;
pub const HELPER_SCHEDULER_DIAGNOSTIC_WAIT_MS: u64 = 5_000;

pub fn worker_response_deadline_ms(task: &str) -> u128 {
    match task {
        "ping" => WORKER_CONTROL_RESPONSE_DEADLINE_MS,
        "status" => WORKER_STATUS_RESPONSE_DEADLINE_MS,
        "asr_preload" | "translation_preload" | "voice_actor_preflight" => {
            WORKER_PRELOAD_RESPONSE_DEADLINE_MS
        }
        "transcribe" | "translate" => WORKER_INFERENCE_RESPONSE_DEADLINE_MS,
        "voice_actor_synthesize" => WORKER_SYNTHESIS_RESPONSE_DEADLINE_MS,
        _ => WORKER_FALLBACK_RESPONSE_DEADLINE_MS,
    }
}

// Deadline selection that distinguishes standalone translate work from MeetingOutbound
// lanes using the scheduler priority already resolved for the request. Unknown/default
// tasks keep the existing per-task class.
pub fn worker_response_deadline_for_priority(task: &str, priority: HelperTaskPriority) -> u128 {
    if task == "translate" && priority != HelperTaskPriority::MeetingOutbound {
        return STANDALONE_TRANSLATION_DEADLINE_MS;
    }
    worker_response_deadline_ms(task)
}

#[derive(Debug, Clone, Serialize)]
pub struct HelperBridgeStatus {
    pub state: String,
    pub message: String,
    pub cuda_ready: bool,
    pub provider_ready: bool,
    pub functional_outbound_ready: bool,
    pub functional_outbound_verified_unix_ms: Option<u128>,
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
    pub stderr_logger: Option<thread::JoinHandle<()>>,
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
            stderr_logger: None,
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

    fn scheduler_wait_deadline_ms(self) -> u64 {
        match self {
            Self::MeetingOutbound => HELPER_SCHEDULER_MEETING_OUTBOUND_WAIT_MS,
            Self::MeetingIncoming => HELPER_SCHEDULER_MEETING_INCOMING_WAIT_MS,
            Self::Text => HELPER_SCHEDULER_TEXT_WAIT_MS,
            Self::Diagnostic => HELPER_SCHEDULER_DIAGNOSTIC_WAIT_MS,
        }
    }

    fn scheduler_admission_limit(self) -> u32 {
        match self {
            Self::MeetingOutbound => HELPER_SCHEDULER_TOTAL_ADMISSION_CAP,
            Self::MeetingIncoming => HELPER_SCHEDULER_TOTAL_ADMISSION_CAP.saturating_sub(1),
            Self::Text => HELPER_SCHEDULER_TOTAL_ADMISSION_CAP.saturating_sub(2),
            Self::Diagnostic => HELPER_SCHEDULER_TOTAL_ADMISSION_CAP.saturating_sub(3),
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
}

impl HelperTaskPermit {
    pub fn request_id(&self) -> &str {
        &self.request_id
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

fn scheduler_total_admitted(state: &HelperSchedulerState) -> u32 {
    let active = if state.active { 1_u32 } else { 0_u32 };
    active
        .saturating_add(state.waiting_meeting_outbound)
        .saturating_add(state.waiting_meeting_incoming)
        .saturating_add(state.waiting_text)
        .saturating_add(state.waiting_diagnostic)
}

fn scheduler_can_admit(state: &HelperSchedulerState, priority: HelperTaskPriority) -> bool {
    scheduler_total_admitted(state) < priority.scheduler_admission_limit()
}

fn scheduler_wait_deadline_error(priority: HelperTaskPriority, wait_deadline: Duration) -> String {
    format!(
        "helper_scheduler:wait_deadline_exceeded:{}:{}ms",
        priority.label(),
        wait_deadline.as_millis()
    )
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

fn acquire_helper_task_permit_with_wait_deadline(
    priority: HelperTaskPriority,
    wait_deadline: Duration,
) -> Result<HelperTaskPermit, String> {
    let (lock, wake) = scheduler();
    let mut state = lock
        .lock()
        .map_err(|_| "helper_scheduler:lock_poisoned".to_string())?;

    if !scheduler_can_admit(&state, priority) {
        return Err(format!(
            "helper_scheduler:admission_capacity_exceeded:{}:total={}:limit={}",
            priority.label(),
            scheduler_total_admitted(&state),
            priority.scheduler_admission_limit()
        ));
    }

    scheduler_waiting_increment(&mut state, priority);
    let wait_started = Instant::now();

    while !scheduler_can_enter(&state, priority) {
        let remaining = wait_deadline.saturating_sub(wait_started.elapsed());
        if remaining.is_zero() {
            scheduler_waiting_decrement(&mut state, priority);
            wake.notify_all();
            return Err(scheduler_wait_deadline_error(priority, wait_deadline));
        }

        let (next_state, wait_result) = match wake.wait_timeout(state, remaining) {
            Ok(value) => value,
            Err(poisoned) => {
                let (mut poisoned_state, _) = poisoned.into_inner();
                scheduler_waiting_decrement(&mut poisoned_state, priority);
                wake.notify_all();
                return Err("helper_scheduler:wait_lock_poisoned".to_string());
            }
        };
        state = next_state;

        if wait_result.timed_out() && !scheduler_can_enter(&state, priority) {
            scheduler_waiting_decrement(&mut state, priority);
            wake.notify_all();
            return Err(scheduler_wait_deadline_error(priority, wait_deadline));
        }
    }

    scheduler_waiting_decrement(&mut state, priority);
    state.active = true;
    state.next_request_sequence = state.next_request_sequence.saturating_add(1);
    Ok(HelperTaskPermit {
        request_id: format!("helper-{}", state.next_request_sequence),
    })
}

pub fn acquire_helper_task_permit(
    priority: HelperTaskPriority,
) -> Result<HelperTaskPermit, String> {
    acquire_helper_task_permit_with_wait_deadline(
        priority,
        Duration::from_millis(priority.scheduler_wait_deadline_ms()),
    )
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
        functional_outbound_ready: false,
        functional_outbound_verified_unix_ms: None,
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

fn write_helper_stderr_event(log_path: &Path, line: &str) -> std::io::Result<()> {
    if line.trim().is_empty() {
        return Ok(());
    }
    let log_dir = log_path.parent().ok_or_else(|| {
        std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "Helper stderr log path has no parent directory.",
        )
    })?;
    let file_name = log_path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| {
            std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "Helper stderr log file name is not valid UTF-8.",
            )
        })?;
    write_jsonl_event(
        log_dir,
        file_name,
        &RuntimeLogEvent::warning("helper_worker_stderr", line),
    )
}

pub fn spawn_stderr_logger(stderr: ChildStderr, log_path: PathBuf) -> thread::JoinHandle<()> {
    thread::spawn(move || {
        let mut reader = BufReader::new(stderr);
        let mut line = String::new();
        loop {
            line.clear();
            match reader.read_line(&mut line) {
                Ok(0) => break,
                Ok(_) => {
                    let _ = write_helper_stderr_event(&log_path, &line);
                }
                Err(error) => {
                    let _ = write_helper_stderr_event(
                        &log_path,
                        &format!("Helper stderr reader failed: {error}"),
                    );
                    break;
                }
            }
        }
    })
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

pub fn apply_worker_status(runtime: &mut HelperBridgeRuntime, status: &Value) {
    let worker_ok = worker_bool(status, "ok");
    let asr_ready = worker_nested_bool(status, "readiness", "asr");
    let outbound_translation_ready = worker_nested_bool(status, "readiness", "translation_id_en");
    let tts_ready = worker_nested_bool(status, "readiness", "voice_actor_tts");
    let cuda_degraded = worker_nested_bool(status, "readiness", "cuda_degraded");

    runtime.cuda_ready = !cuda_degraded;
    runtime.provider_ready = worker_ok && asr_ready && outbound_translation_ready && tts_ready;
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
    } else {
        let blocker = worker_text(value, "blocker").unwrap_or_default();
        let hard_voice_actor_failure = stage == "voice_actor_synthesize"
            && !matches!(
                blocker.as_str(),
                "voice_actor:empty_text" | "voice_actor:text_too_large"
            );
        let required_outbound_prepare_failed = !ok
            && (stage == "asr_preload"
                || stage == "voice_actor_preflight"
                || hard_voice_actor_failure
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
        object.insert("request_unix_ms".to_string(), json!(started));
        object.insert("deadline_unix_ms".to_string(), json!(deadline));
        object.insert("deadline_ms".to_string(), json!(deadline_ms));
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

pub fn stop_child(runtime: &mut HelperBridgeRuntime) {
    runtime.stdin.take();
    runtime.stdout.take();
    if let Some(mut child) = runtime.child.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
    if let Some(logger) = runtime.stderr_logger.take() {
        let _ = logger.join();
    }
}

#[cfg(test)]
mod readiness_contract_tests {
    use super::*;

    #[test]
    fn worker_status_uses_canonical_direction_readiness_and_rejects_legacy_aliases() {
        let mut runtime = HelperBridgeRuntime::default();
        apply_worker_status(
            &mut runtime,
            &json!({
                "ok": true,
                "readiness": {
                    "asr": true,
                    "translation_id_en": true,
                    "translation_en_id": false,
                    "translation_bidirectional": false,
                    "voice_actor_tts": true,
                    "cuda_degraded": false
                }
            }),
        );
        assert!(runtime.provider_ready);
        assert!(runtime.cuda_ready);
        assert!(!runtime.degraded_mode);

        let mut legacy_only = HelperBridgeRuntime::default();
        apply_worker_status(
            &mut legacy_only,
            &json!({
                "ok": true,
                "readiness": {
                    "asr": true,
                    "translation_realtime": true,
                    "translation_quality": true,
                    "voice_actor_tts": true,
                    "cuda_degraded": false
                }
            }),
        );
        assert!(!legacy_only.provider_ready);
    }
}

#[cfg(test)]
mod stderr_lifecycle_tests {
    use super::*;
    use std::fs;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Arc;

    fn test_log_path(label: &str) -> PathBuf {
        std::env::temp_dir()
            .join(format!(
                "translateit-a5-{}-{}-{label}",
                std::process::id(),
                unix_ms()
            ))
            .join("helper_bridge_stderr.jsonl")
    }

    #[test]
    fn helper_stderr_uses_redacted_rotating_jsonl_policy() {
        let log_path = test_log_path("redaction");
        let log_dir = log_path.parent().expect("stderr test log parent");
        fs::create_dir_all(log_dir).expect("create stderr test log dir");

        write_helper_stderr_event(
            &log_path,
            r"worker failed at C:\Users\Alice\private-model.bin alice@example.com token=supersecret",
        )
        .expect("write redacted stderr event");
        let content = fs::read_to_string(&log_path).expect("read redacted stderr log");
        assert!(!content.contains(r"C:\Users\Alice\private-model.bin"));
        assert!(!content.contains("alice@example.com"));
        assert!(!content.contains("supersecret"));
        assert!(content.contains("[redacted-path]"));
        assert!(content.contains("[redacted-email]"));
        assert!(content.contains("[redacted-secret]"));
        let event: Value = serde_json::from_str(
            content
                .lines()
                .next()
                .expect("one helper stderr JSONL event"),
        )
        .expect("valid helper stderr JSONL");
        assert_eq!(
            event.get("area").and_then(Value::as_str),
            Some("helper_worker_stderr")
        );

        fs::write(&log_path, vec![b'x'; 1_100_000]).expect("seed oversized stderr log");
        write_helper_stderr_event(&log_path, "worker stderr after rotation")
            .expect("rotate helper stderr log");
        assert!(log_dir
            .join("helper_bridge_stderr.previous.jsonl")
            .is_file());
        assert!(
            fs::metadata(&log_path)
                .expect("current stderr metadata")
                .len()
                < 10_000
        );

        let _ = fs::remove_dir_all(log_dir);
    }

    #[test]
    fn stop_child_joins_owned_stderr_logger() {
        let finished = Arc::new(AtomicBool::new(false));
        let finished_in_thread = Arc::clone(&finished);
        let mut runtime = HelperBridgeRuntime::default();
        runtime.stderr_logger = Some(thread::spawn(move || {
            thread::sleep(Duration::from_millis(20));
            finished_in_thread.store(true, Ordering::SeqCst);
        }));

        stop_child(&mut runtime);

        assert!(finished.load(Ordering::SeqCst));
        assert!(runtime.stderr_logger.is_none());
    }
}

#[cfg(test)]
mod scheduler_policy_tests {
    use super::*;

    static SCHEDULER_TEST_SERIAL: OnceLock<Mutex<()>> = OnceLock::new();

    fn scheduler_test_guard() -> std::sync::MutexGuard<'static, ()> {
        SCHEDULER_TEST_SERIAL
            .get_or_init(|| Mutex::new(()))
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn reset_scheduler() {
        let (lock, wake) = scheduler();
        let mut state = lock.lock().expect("scheduler test lock");
        *state = HelperSchedulerState::default();
        wake.notify_all();
    }

    #[test]
    fn scheduler_policy_preserves_priority_and_reserved_admission_headroom() {
        let _serial = scheduler_test_guard();
        assert!(
            HelperTaskPriority::MeetingOutbound.scheduler_wait_deadline_ms()
                > HelperTaskPriority::MeetingIncoming.scheduler_wait_deadline_ms()
        );
        assert!(
            HelperTaskPriority::MeetingIncoming.scheduler_wait_deadline_ms()
                > HelperTaskPriority::Text.scheduler_wait_deadline_ms()
        );
        assert!(
            HelperTaskPriority::Text.scheduler_wait_deadline_ms()
                > HelperTaskPriority::Diagnostic.scheduler_wait_deadline_ms()
        );

        let mut state = HelperSchedulerState::default();
        state.waiting_meeting_outbound = 1;
        assert!(scheduler_can_enter(
            &state,
            HelperTaskPriority::MeetingOutbound
        ));
        assert!(!scheduler_can_enter(
            &state,
            HelperTaskPriority::MeetingIncoming
        ));
        assert!(!scheduler_can_enter(&state, HelperTaskPriority::Text));
        assert!(!scheduler_can_enter(&state, HelperTaskPriority::Diagnostic));

        state.waiting_meeting_outbound = 0;
        state.waiting_meeting_incoming = 1;
        assert!(scheduler_can_enter(
            &state,
            HelperTaskPriority::MeetingIncoming
        ));
        assert!(!scheduler_can_enter(&state, HelperTaskPriority::Text));
        assert!(!scheduler_can_enter(&state, HelperTaskPriority::Diagnostic));

        state.waiting_meeting_incoming = 0;
        state.waiting_text = 1;
        assert!(scheduler_can_enter(&state, HelperTaskPriority::Text));
        assert!(!scheduler_can_enter(&state, HelperTaskPriority::Diagnostic));

        state = HelperSchedulerState::default();
        state.active = true;
        state.waiting_diagnostic = HelperTaskPriority::Diagnostic
            .scheduler_admission_limit()
            .saturating_sub(1);
        assert_eq!(
            scheduler_total_admitted(&state),
            HelperTaskPriority::Diagnostic.scheduler_admission_limit()
        );
        assert!(!scheduler_can_admit(&state, HelperTaskPriority::Diagnostic));
        assert!(scheduler_can_admit(&state, HelperTaskPriority::Text));
        assert!(scheduler_can_admit(
            &state,
            HelperTaskPriority::MeetingIncoming
        ));
        assert!(scheduler_can_admit(
            &state,
            HelperTaskPriority::MeetingOutbound
        ));
        assert_eq!(
            HelperTaskPriority::MeetingOutbound.scheduler_admission_limit(),
            HELPER_SCHEDULER_TOTAL_ADMISSION_CAP
        );
    }

    #[test]
    fn scheduler_capacity_rejection_does_not_add_waiting_callers() {
        let _serial = scheduler_test_guard();
        reset_scheduler();
        {
            let (lock, _) = scheduler();
            let mut state = lock.lock().expect("scheduler test lock");
            state.active = true;
            state.waiting_diagnostic = HelperTaskPriority::Diagnostic
                .scheduler_admission_limit()
                .saturating_sub(1);
        }

        let error = match acquire_helper_task_permit_with_wait_deadline(
            HelperTaskPriority::Diagnostic,
            Duration::from_millis(1),
        ) {
            Ok(_) => panic!("diagnostic request should be rejected at its admission limit"),
            Err(error) => error,
        };
        assert!(error.starts_with("helper_scheduler:admission_capacity_exceeded:diagnostic:"));

        let (lock, _) = scheduler();
        let state = lock.lock().expect("scheduler test lock");
        assert_eq!(
            scheduler_total_admitted(&state),
            HelperTaskPriority::Diagnostic.scheduler_admission_limit()
        );
        drop(state);
        reset_scheduler();
    }

    #[test]
    fn scheduler_wait_deadline_cleans_counter_and_releases_lower_priority_blocking() {
        let _serial = scheduler_test_guard();
        reset_scheduler();
        let active = acquire_helper_task_permit_with_wait_deadline(
            HelperTaskPriority::MeetingOutbound,
            Duration::from_millis(50),
        )
        .expect("outbound scheduler permit");

        let waiter = thread::spawn(|| {
            acquire_helper_task_permit_with_wait_deadline(
                HelperTaskPriority::Text,
                Duration::from_millis(25),
            )
        });
        let error = match waiter.join().expect("scheduler waiter thread") {
            Ok(_) => panic!("text request should time out while worker remains active"),
            Err(error) => error,
        };
        assert_eq!(error, "helper_scheduler:wait_deadline_exceeded:text:25ms");

        {
            let (lock, _) = scheduler();
            let state = lock.lock().expect("scheduler test lock");
            assert!(state.active);
            assert_eq!(state.waiting_text, 0);
            assert_eq!(state.waiting_meeting_outbound, 0);
            assert_eq!(state.waiting_meeting_incoming, 0);
            assert_eq!(state.waiting_diagnostic, 0);
        }

        drop(active);
        {
            let (lock, _) = scheduler();
            let state = lock.lock().expect("scheduler test lock");
            assert!(!state.active);
        }
        reset_scheduler();
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
        assert_eq!(worker_response_deadline_ms("voice_actor_synthesize"), 45_000);
        assert_eq!(worker_response_deadline_ms("unknown"), 30_000);
    }

    #[test]
    fn standalone_translation_deadline_applies_only_outside_meeting_outbound_priority() {
        assert_eq!(STANDALONE_TRANSLATION_DEADLINE_MS, 180_000);
        assert!(
            STANDALONE_TRANSLATION_DEADLINE_MS > WORKER_INFERENCE_RESPONSE_DEADLINE_MS,
            "standalone translate must get a strictly larger single-attempt budget"
        );
        assert_eq!(
            worker_response_deadline_for_priority(
                "translate",
                HelperTaskPriority::MeetingOutbound
            ),
            WORKER_INFERENCE_RESPONSE_DEADLINE_MS
        );
        assert_eq!(
            worker_response_deadline_for_priority(
                "translate",
                HelperTaskPriority::MeetingIncoming
            ),
            STANDALONE_TRANSLATION_DEADLINE_MS
        );
        assert_eq!(
            worker_response_deadline_for_priority("translate", HelperTaskPriority::Text),
            STANDALONE_TRANSLATION_DEADLINE_MS
        );
        assert_eq!(
            worker_response_deadline_for_priority("transcribe", HelperTaskPriority::Text),
            WORKER_INFERENCE_RESPONSE_DEADLINE_MS
        );
        assert_eq!(
            worker_response_deadline_for_priority("unknown", HelperTaskPriority::Diagnostic),
            WORKER_FALLBACK_RESPONSE_DEADLINE_MS
        );
    }

    #[test]
    fn request_metadata_uses_host_selected_deadline_as_authority() {
        let deadline_ms = worker_response_deadline_ms("voice_actor_synthesize");
        let payload = request_deadline_payload(
            &json!({"command": "voice_actor_synthesize"}),
            deadline_ms,
        );
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

        let overridden = request_deadline_payload(
            &json!({
                "command": "ping",
                "request_unix_ms": 10_u64,
                "deadline_unix_ms": 20_u64,
                "deadline_ms": 10_u64
            }),
            worker_response_deadline_ms("ping"),
        );
        let overridden_started = overridden
            .get("request_unix_ms")
            .and_then(Value::as_u64)
            .unwrap() as u128;
        let overridden_deadline = overridden
            .get("deadline_unix_ms")
            .and_then(Value::as_u64)
            .unwrap() as u128;
        assert_ne!(overridden_started, 10);
        assert_eq!(
            overridden_deadline.saturating_sub(overridden_started),
            worker_response_deadline_ms("ping")
        );
        assert_eq!(
            overridden.get("deadline_ms").and_then(Value::as_u64),
            Some(5_000)
        );
    }
}
