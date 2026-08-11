use serde::Serialize;
use serde_json::{json, Value};

use crate::commands::diagnostic_trace::{
    trace_command_end, trace_command_error, trace_command_start,
};
use crate::engine::runtime_settings::load_settings;

use super::helper_bridge::{
    get_helper_bridge_status, send_helper_worker_task, start_helper_bridge,
};

const MAX_TEXT_TRANSLATION_CHARS: usize = 2_000;

#[derive(Debug, Clone, Serialize)]
pub struct TextTranslationResult {
    pub ok: bool,
    pub state: String,
    pub translated_text: String,
    pub user_message: String,
    pub blocker: String,
}

impl TextTranslationResult {
    fn success(translated_text: String) -> Self {
        Self {
            ok: true,
            state: "translated".to_string(),
            translated_text,
            user_message: "Translation ready.".to_string(),
            blocker: String::new(),
        }
    }

    fn blocked(state: &str, user_message: &str, blocker: String) -> Self {
        Self {
            ok: false,
            state: state.to_string(),
            translated_text: String::new(),
            user_message: user_message.to_string(),
            blocker,
        }
    }
}

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
        parts.push(format!("device_fallback={fallback}"));
    }

    if parts.is_empty() {
        "persistent helper returned no validated translation".to_string()
    } else {
        parts.join("; ")
    }
}

fn ensure_persistent_helper_started() -> Result<(), TextTranslationResult> {
    let status = get_helper_bridge_status();
    if !matches!(status.state.as_str(), "not_started" | "stopped" | "error") {
        return Ok(());
    }

    let start = start_helper_bridge();
    if start.ok {
        Ok(())
    } else {
        Err(TextTranslationResult::blocked(
            "runtime_unavailable",
            "Local translation isn't available yet. Check Setup or Diagnostics and try again.",
            format!("helper_start:{}:{}", start.state, start.message),
        ))
    }
}

fn translate_with_persistent_helper(source: &str) -> TextTranslationResult {
    if let Err(result) = ensure_persistent_helper_started() {
        return result;
    }

    let settings = load_settings();
    let payload = json!({
        "text": source,
        "source_language": settings.source_language,
        "target_language": settings.target_language,
        "max_new_tokens": 96,
        "request_kind": "standalone_text",
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
    let stage_is_translate =
        worker_response.get("stage").and_then(Value::as_str) == Some("translate");
    let contract_is_canonical = worker_response
        .get("translation_contract")
        .and_then(Value::as_str)
        == Some("canonical_bidirectional_id_en");

    if response.ok && stage_is_translate && contract_is_canonical && !translated.is_empty() {
        return TextTranslationResult::success(translated.to_string());
    }

    TextTranslationResult::blocked(
        "translation_unavailable",
        "Translation isn't available for this language direction right now. Check Setup or Diagnostics and try again.",
        worker_blocker(&worker_response),
    )
}

#[tauri::command]
pub fn translate_text(source: String) -> TextTranslationResult {
    let started = trace_command_start(
        "translate_text",
        format!("source_chars={}", source.chars().count()),
    );
    let source = clean_source(&source);
    let result = if source.is_empty() {
        TextTranslationResult::blocked(
            "empty_input",
            "Type or paste something to translate.",
            "text_translation:empty_input".to_string(),
        )
    } else if source.chars().count() > MAX_TEXT_TRANSLATION_CHARS {
        TextTranslationResult::blocked(
            "input_too_long",
            &format!(
                "Text is too long. Limit: {MAX_TEXT_TRANSLATION_CHARS} characters. Shorten or split it and try again."
            ),
            "text_translation:input_too_long".to_string(),
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
