use serde_json::{json, Value};

use crate::commands::diagnostic_trace::{
    trace_command_end, trace_command_error, trace_command_start,
};
use crate::engine;
use crate::engine::runtime_settings::load_settings;
use crate::engine::state::{CommandResult, LifecycleState};

use super::helper_bridge_runtime::{
    apply_worker_response, read_worker_response_with_deadline, runtime, unix_ms, write_worker_request,
};

fn compact_worker_text(value: Option<&Value>) -> String {
    value
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim()
        .chars()
        .take(500)
        .collect::<String>()
}

fn bridge_blocker(response: &Value) -> String {
    let blocker = compact_worker_text(response.get("blocker"));
    let note = compact_worker_text(response.get("note"));
    let model = compact_worker_text(response.get("model_id"));
    let device = compact_worker_text(response.get("device"));
    let fallback = compact_worker_text(response.get("translation_fallback_reason"));
    let mut parts = Vec::new();
    if !blocker.is_empty() {
        parts.push(format!("blocker={blocker}"));
    }
    if !note.is_empty() {
        parts.push(format!("note={note}"));
    }
    if !model.is_empty() {
        parts.push(format!("model={model}"));
    }
    if !device.is_empty() {
        parts.push(format!("device={device}"));
    }
    if !fallback.is_empty() {
        parts.push(format!("fallback={fallback}"));
    }
    if parts.is_empty() {
        "helper bridge returned no translated text".to_string()
    } else {
        parts.join("; ")
    }
}

fn translate_with_running_helper_bridge(source: &str) -> Option<CommandResult> {
    let settings = load_settings();
    let payload = json!({
        "command": "translate",
        "text": source,
        "source_language": settings.source_language,
        "target_language": settings.target_language,
        "mode": settings.runtime_profile,
        "max_new_tokens": 96,
    });

    let mut runtime = match runtime().lock() {
        Ok(runtime) => runtime,
        Err(_) => {
            return Some(CommandResult::blocked(
                LifecycleState::Error,
                "Helper bridge translation blocked because the helper state lock is poisoned.",
            ));
        }
    };

    if runtime.child.is_none() || runtime.stdin.is_none() || runtime.stdout.is_none() {
        return None;
    }

    runtime.active_task = Some("translate".to_string());
    runtime.updated_unix_ms = unix_ms();

    let write_result = runtime
        .stdin
        .as_mut()
        .map(|stdin| write_worker_request(stdin, &payload));
    if !matches!(write_result, Some(Ok(()))) {
        runtime.state = "blocked".to_string();
        runtime.message = "Failed to write translate request to running Python helper worker.".to_string();
        runtime.last_error = Some("helper_bridge:translate_write_failed".to_string());
        runtime.active_task = None;
        runtime.updated_unix_ms = unix_ms();
        return Some(CommandResult::blocked(
            LifecycleState::TranslationAdapterPending,
            "Helper bridge translation blocked: failed to write request to running Python helper worker.",
        ));
    }

    let response = match read_worker_response_with_deadline(&mut runtime) {
        Ok(value) => value,
        Err(error) => {
            runtime.state = "blocked".to_string();
            runtime.message = format!("Failed to read translate response from Python helper worker before deadline: {error}");
            runtime.last_error = Some("helper_bridge:translate_read_failed".to_string());
            runtime.active_task = None;
            runtime.updated_unix_ms = unix_ms();
            return Some(CommandResult::blocked(
                LifecycleState::TranslationAdapterPending,
                format!("Helper bridge translation blocked: failed to read response from Python helper worker before deadline: {error}"),
            ));
        }
    };

    let ok = apply_worker_response(&mut runtime, &response);
    runtime.active_task = None;
    runtime.updated_unix_ms = unix_ms();

    let translated = response
        .get("translated_text")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim()
        .to_string();

    if ok && !translated.is_empty() {
        return Some(CommandResult::ok(LifecycleState::Idle, translated));
    }

    Some(CommandResult::blocked(
        LifecycleState::TranslationAdapterPending,
        format!("Helper bridge translation blocked: {}", bridge_blocker(&response)),
    ))
}

#[tauri::command]
pub fn translate_text(source: String) -> CommandResult {
    let started = trace_command_start(
        "translate_text",
        format!("source_chars={}", source.chars().count()),
    );
    let result = translate_with_running_helper_bridge(&source)
        .unwrap_or_else(|| engine::translate_text(source));
    if result.ok {
        trace_command_end("translate_text", started, format!("state={}", result.state));
    } else {
        trace_command_error("translate_text", started, format!("state={}", result.state));
    }
    result
}
