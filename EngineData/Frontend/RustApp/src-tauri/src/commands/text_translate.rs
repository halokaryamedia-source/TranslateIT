use serde_json::{json, Value};

use crate::commands::diagnostic_trace::{
    trace_command_end, trace_command_error, trace_command_start,
};
use crate::engine::runtime_settings::load_settings;
use crate::engine::state::{CommandResult, LifecycleState};

use super::helper_bridge::{
    get_helper_bridge_status, send_helper_worker_task, start_helper_bridge,
};

const MAX_TEXT_TRANSLATION_CHARS: usize = 2_000;

fn clean_source(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|character| {
            *character != '\0'
                && !('\u{0001}'..='\u{0008}').contains(character)
                && !('\u{000b}'..='\u{001f}').contains(character)
                && *character != '\u{007f}'
        })
        .collect::<String>()
}

fn compact_worker_text(value: Option<&Value>) -> String {
    value
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim()
        .chars()
        .take(500)
        .collect::<String>()
}

fn worker_blocker(response: &Value) -> String {
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
        "persistent helper returned no validated translation".to_string()
    } else {
        parts.join("; ")
    }
}

fn ensure_persistent_helper_started() -> Result<(), CommandResult> {
    let status = get_helper_bridge_status();
    if !matches!(status.state.as_str(), "not_started" | "stopped" | "error") {
        return Ok(());
    }

    let start = start_helper_bridge();
    if start.ok {
        Ok(())
    } else {
        Err(CommandResult::blocked(
            LifecycleState::TranslationAdapterPending,
            format!(
                "Local translation is unavailable because the persistent helper could not start. {}",
                start.message
            ),
        ))
    }
}

fn translate_with_persistent_helper(source: &str) -> CommandResult {
    if let Err(result) = ensure_persistent_helper_started() {
        return result;
    }

    let settings = load_settings();
    let payload = json!({
        "text": source,
        "source_language": settings.source_language,
        "target_language": settings.target_language,
        "mode": settings.runtime_profile,
        "max_new_tokens": 96,
    });
    let response = send_helper_worker_task("translate", payload);
    let worker_response = serde_json::from_str::<Value>(&response.worker_response_json)
        .unwrap_or_else(|_| {
            json!({
                "ok": false,
                "stage": "translate",
                "blocker": "helper_bridge:invalid_translation_response",
                "note": response.message,
            })
        });
    let translated = worker_response
        .get("translated_text")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim();
    let stage_is_translate = worker_response.get("stage").and_then(Value::as_str) == Some("translate");

    if response.ok && stage_is_translate && !translated.is_empty() {
        return CommandResult::ok(LifecycleState::Idle, translated.to_string());
    }

    CommandResult::blocked(
        LifecycleState::TranslationAdapterPending,
        format!(
            "Local translation is unavailable. {}",
            worker_blocker(&worker_response)
        ),
    )
}

#[tauri::command]
pub fn translate_text(source: String) -> CommandResult {
    let started = trace_command_start(
        "translate_text",
        format!("source_chars={}", source.chars().count()),
    );
    let source = clean_source(&source);
    let result = if source.is_empty() {
        CommandResult::blocked(LifecycleState::EmptyInput, "No source text provided.")
    } else if source.chars().count() > MAX_TEXT_TRANSLATION_CHARS {
        CommandResult::blocked(
            LifecycleState::TranslationAdapterPending,
            format!(
                "Input is too long. Limit: {MAX_TEXT_TRANSLATION_CHARS} characters. Shorten or split the text and try again."
            ),
        )
    } else {
        translate_with_persistent_helper(&source)
    };

    if result.ok {
        trace_command_end("translate_text", started, format!("state={}", result.state));
    } else {
        trace_command_error("translate_text", started, format!("state={}", result.state));
    }
    result
}
