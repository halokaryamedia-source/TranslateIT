use serde_json::{json, Value};

use crate::commands::diagnostic_trace::{
    trace_command_end, trace_command_error, trace_command_start,
};
use crate::commands::helper_bridge_runtime::{
    apply_worker_response, read_worker_response, runtime, write_worker_request,
};
use crate::engine;
use crate::engine::state::{CommandResult, LifecycleState};

const MAX_BRIDGE_TRANSLATION_CHARS: usize = 2_000;

fn clean_bridge_text(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|character| {
            *character != '\0'
                && !('\u{0001}'..='\u{0008}').contains(character)
                && !('\u{000b}'..='\u{001f}').contains(character)
                && *character != '\u{007f}'
                && !('\u{202a}'..='\u{202e}').contains(character)
                && !('\u{2066}'..='\u{2069}').contains(character)
        })
        .take(MAX_BRIDGE_TRANSLATION_CHARS)
        .collect::<String>()
        .trim()
        .to_string()
}

fn text_field(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .map(clean_bridge_text)
        .filter(|text| !text.is_empty())
}

fn array_field(value: &Value, key: &str) -> Option<String> {
    let values = value.get(key)?.as_array()?;
    let text = values
        .iter()
        .filter_map(Value::as_str)
        .map(clean_bridge_text)
        .filter(|entry| !entry.is_empty())
        .collect::<Vec<_>>()
        .join(", ");
    if text.is_empty() { None } else { Some(text) }
}

fn bridge_success_message(response: &Value) -> Option<String> {
    let translated = text_field(response, "translated_text")?;
    let mode = text_field(response, "mode").unwrap_or_else(|| "helper bridge".to_string());
    let model = text_field(response, "model_id").unwrap_or_else(|| "model unknown".to_string());
    let device = text_field(response, "device").unwrap_or_else(|| "device unknown".to_string());
    let pair = text_field(response, "direction_pair").unwrap_or_else(|| "direction unknown".to_string());
    Some(format!(
        "{translated}\n\n(helper bridge: {mode} / {model} / {device}; {pair})"
    ))
}

fn bridge_blocked_message(response: &Value) -> String {
    let stage = text_field(response, "stage").unwrap_or_else(|| "translate".to_string());
    let blocker = text_field(response, "blocker").unwrap_or_else(|| "translation:helper_response_not_ready".to_string());
    let note = text_field(response, "note");
    let model = text_field(response, "model_id");
    let device = text_field(response, "device").or_else(|| text_field(response, "selected_device"));
    let fallback = text_field(response, "translation_fallback_reason").or_else(|| text_field(response, "fallback_reason"));
    let next_actions = array_field(response, "next_actions");

    let mut details = vec![format!("Helper translation blocked at {stage}: {blocker}")];
    if let Some(model) = model {
        details.push(format!("model: {model}"));
    }
    if let Some(device) = device {
        details.push(format!("device: {device}"));
    }
    if let Some(fallback) = fallback {
        details.push(format!("fallback: {fallback}"));
    }
    if let Some(note) = note {
        details.push(note);
    }
    if let Some(next_actions) = next_actions {
        details.push(format!("next: {next_actions}"));
    }
    details.join(" | ")
}

fn try_translate_with_running_helper_bridge(source: &str) -> Option<CommandResult> {
    let settings = engine::load_settings();
    let payload = json!({
        "command": "translate",
        "text": source,
        "source_language": settings.source_language,
        "target_language": settings.target_language,
        "mode": settings.runtime_profile,
        "max_new_tokens": 96,
    });

    let mut runtime = runtime().lock().ok()?;
    if runtime.state != "ready"
        || runtime.stdin.is_none()
        || runtime.stdout.is_none()
        || runtime.child.is_none()
    {
        return None;
    }

    runtime.active_task = Some("translate".to_string());
    runtime.updated_unix_ms = crate::commands::helper_bridge_runtime::unix_ms();

    if write_worker_request(runtime.stdin.as_mut()?, &payload).is_err() {
        runtime.state = "blocked".to_string();
        runtime.message = "Failed to write translation request to helper bridge.".to_string();
        runtime.last_error = Some("helper_bridge:translation_write_failed".to_string());
        runtime.active_task = None;
        runtime.updated_unix_ms = crate::commands::helper_bridge_runtime::unix_ms();
        return Some(CommandResult::blocked(
            LifecycleState::Error,
            "Helper translation failed before the worker accepted the request.",
        ));
    }

    let response = match read_worker_response(runtime.stdout.as_mut()?) {
        Ok(value) => value,
        Err(error) => {
            runtime.state = "blocked".to_string();
            runtime.message = "Failed to read translation response from helper bridge.".to_string();
            runtime.last_error = Some("helper_bridge:translation_read_failed".to_string());
            runtime.active_task = None;
            runtime.updated_unix_ms = crate::commands::helper_bridge_runtime::unix_ms();
            return Some(CommandResult::blocked(
                LifecycleState::Error,
                format!("Helper translation failed while reading worker response: {error}"),
            ));
        }
    };

    let ok = apply_worker_response(&mut runtime, &response);
    runtime.active_task = None;
    runtime.updated_unix_ms = crate::commands::helper_bridge_runtime::unix_ms();

    if ok {
        return Some(
            bridge_success_message(&response)
                .map(|message| CommandResult::ok(LifecycleState::Idle, message))
                .unwrap_or_else(|| {
                    CommandResult::blocked(
                        LifecycleState::TranslationAdapterPending,
                        "Helper translation completed, but no translated_text was returned.",
                    )
                }),
        );
    }

    Some(CommandResult::blocked(
        LifecycleState::TranslationAdapterPending,
        bridge_blocked_message(&response),
    ))
}

#[tauri::command]
pub fn translate_text(source: String) -> CommandResult {
    let started = trace_command_start(
        "translate_text",
        format!("source_chars={}", source.chars().count()),
    );
    let result = try_translate_with_running_helper_bridge(&source)
        .unwrap_or_else(|| engine::translate_text(source));
    if result.ok {
        trace_command_end("translate_text", started, format!("state={}", result.state));
    } else {
        trace_command_error("translate_text", started, format!("state={}", result.state));
    }
    result
}
