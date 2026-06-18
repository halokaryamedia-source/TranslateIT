use serde::{Deserialize, Serialize};
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

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

#[derive(Debug, Clone)]
struct HelperBridgeRuntime {
    state: String,
    message: String,
    cuda_ready: bool,
    provider_ready: bool,
    degraded_mode: bool,
    active_task: Option<String>,
    generation_token: u64,
    last_error: Option<String>,
    updated_unix_ms: u128,
}

impl Default for HelperBridgeRuntime {
    fn default() -> Self {
        Self {
            state: "not_started".to_string(),
            message: "Helper bridge contract exists; runtime process bridge is not implemented yet.".to_string(),
            cuda_ready: false,
            provider_ready: false,
            degraded_mode: false,
            active_task: None,
            generation_token: 0,
            last_error: None,
            updated_unix_ms: unix_ms(),
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

fn runtime_claim() -> String {
    "bridge_lifecycle_only_process_not_spawned".to_string()
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
        updated_unix_ms: runtime.updated_unix_ms,
        runtime_claim: runtime_claim(),
    }
}

fn action_result(ok: bool, runtime: &HelperBridgeRuntime) -> HelperBridgeActionResult {
    HelperBridgeActionResult {
        ok,
        state: runtime.state.clone(),
        message: runtime.message.clone(),
        generation_token: runtime.generation_token,
        runtime_claim: runtime_claim(),
    }
}

#[tauri::command]
pub fn get_helper_bridge_status() -> HelperBridgeStatus {
    match runtime().lock() {
        Ok(runtime) => status_from_runtime(&runtime),
        Err(_) => HelperBridgeStatus {
            state: "error".to_string(),
            message: "Helper bridge status lock is poisoned.".to_string(),
            cuda_ready: false,
            provider_ready: false,
            degraded_mode: false,
            active_task: None,
            generation_token: 0,
            last_error: Some("helper_bridge:lock_poisoned".to_string()),
            updated_unix_ms: unix_ms(),
            runtime_claim: runtime_claim(),
        },
    }
}

#[tauri::command]
pub fn start_helper_bridge() -> HelperBridgeActionResult {
    match runtime().lock() {
        Ok(mut runtime) => {
            runtime.generation_token = runtime.generation_token.saturating_add(1);
            runtime.state = "blocked".to_string();
            runtime.message = "Helper bridge lifecycle started, but Python process spawn is not implemented yet.".to_string();
            runtime.cuda_ready = false;
            runtime.provider_ready = false;
            runtime.degraded_mode = false;
            runtime.active_task = None;
            runtime.last_error = Some("helper_bridge:process_spawn_not_implemented".to_string());
            runtime.updated_unix_ms = unix_ms();
            action_result(false, &runtime)
        }
        Err(_) => HelperBridgeActionResult {
            ok: false,
            state: "error".to_string(),
            message: "Helper bridge start failed because state lock is poisoned.".to_string(),
            generation_token: 0,
            runtime_claim: runtime_claim(),
        },
    }
}

#[tauri::command]
pub fn stop_helper_bridge() -> HelperBridgeActionResult {
    match runtime().lock() {
        Ok(mut runtime) => {
            runtime.generation_token = runtime.generation_token.saturating_add(1);
            runtime.state = "stopped".to_string();
            runtime.message = "Helper bridge stopped. No Python helper process was running from this bridge.".to_string();
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
            runtime_claim: runtime_claim(),
        },
    }
}

#[tauri::command]
pub fn cancel_helper_bridge_task() -> HelperBridgeActionResult {
    match runtime().lock() {
        Ok(mut runtime) => {
            runtime.generation_token = runtime.generation_token.saturating_add(1);
            runtime.state = "stopped".to_string();
            runtime.message = "Helper bridge active task was cancelled by generation token invalidation.".to_string();
            runtime.active_task = None;
            runtime.updated_unix_ms = unix_ms();
            action_result(true, &runtime)
        }
        Err(_) => HelperBridgeActionResult {
            ok: false,
            state: "error".to_string(),
            message: "Helper bridge cancel failed because state lock is poisoned.".to_string(),
            generation_token: 0,
            runtime_claim: runtime_claim(),
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
                runtime.message = "Helper bridge request rejected because task is empty.".to_string();
                runtime.last_error = Some("helper_bridge:empty_task".to_string());
                runtime.updated_unix_ms = unix_ms();
                return action_result(false, &runtime);
            }
            runtime.active_task = Some(trimmed_task.to_string());
            runtime.state = "blocked".to_string();
            runtime.message = "Helper bridge request schema is accepted, but Python request/response protocol is not implemented yet.".to_string();
            runtime.last_error = Some("helper_bridge:request_protocol_not_implemented".to_string());
            runtime.updated_unix_ms = unix_ms();
            action_result(false, &runtime)
        }
        Err(_) => HelperBridgeActionResult {
            ok: false,
            state: "error".to_string(),
            message: "Helper bridge request failed because state lock is poisoned.".to_string(),
            generation_token: 0,
            runtime_claim: runtime_claim(),
        },
    }
}
