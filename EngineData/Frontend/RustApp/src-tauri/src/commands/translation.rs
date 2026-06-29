use serde_json::{json, Value};

use crate::commands::diagnostic_trace::{
    trace_command_end, trace_command_error, trace_command_start,
};
use crate::commands::helper_bridge_runtime::{
    apply_worker_response, read_worker_response, runtime, write_worker_request, HelperBridgeRuntime,
};
use crate::engine;
use crate::engine::state::{CommandResult, LifecycleState};

const MAX_BRIDGE_TRANSLATION_CHARS: usize = 2_000;
const MAX_BRIDGE_TTS_DETAIL_CHARS: usize = 240;

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

fn clean_tts_detail(value: &str) -> String {
    clean_bridge_text(value)
        .chars()
        .take(MAX_BRIDGE_TTS_DETAIL_CHARS)
        .collect::<String>()
}

fn text_field(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .map(clean_bridge_text)
        .filter(|text| !text.is_empty())
}

fn bool_field(value: &Value, key: &str) -> bool {
    value.get(key).and_then(Value::as_bool).unwrap_or(false)
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

fn user_friendly_blocker(blocker: &str) -> String {
    let normalized = blocker.to_lowercase();
    if normalized.contains("transformers_missing") || normalized.contains("torch_missing") {
        return "Translation dependency is missing. Install torch and transformers in the WorkerRuntime Python environment.".to_string();
    }
    if normalized.contains("marianmt_id_en_missing") || normalized.contains("marianmt-id-en_missing") {
        return "Realtime translation model is missing. Place marianmt-id-en under RuntimeAssets/Translation/ModelData.".to_string();
    }
    if normalized.contains("nllb") && normalized.contains("missing") {
        return "Quality translation model is missing. Use Realtime mode or add the NLLB quality model later.".to_string();
    }
    if normalized.contains("direction_not_supported") {
        return "This language direction is not supported by the realtime model. Switch to Indonesian → English or use Quality mode after the quality model is installed.".to_string();
    }
    if normalized.contains("empty_text") {
        return "Text is empty. Type text before translating.".to_string();
    }
    if normalized.contains("text_too_large") {
        return "Text is too long for local translation. Shorten the input and try again.".to_string();
    }
    if normalized.contains("cuda") {
        return "CUDA is not ready. Translation can still run on CPU when dependencies and models are available.".to_string();
    }
    format!("Helper translation is blocked: {blocker}")
}

fn user_friendly_tts_blocker(blocker: &str) -> String {
    let normalized = blocker.to_lowercase();
    if normalized.contains("no_local_provider") || normalized.contains("sapi") || normalized.contains("piper") {
        return "TTS provider is not ready. Provide Piper voice assets or enable a Windows SAPI fallback.".to_string();
    }
    if normalized.contains("empty_text") {
        return "TTS was skipped because translated text is empty.".to_string();
    }
    if normalized.contains("text_too_large") {
        return "TTS was skipped because translated text is too long.".to_string();
    }
    format!("TTS blocked: {blocker}")
}

fn bridge_success_message(response: &Value, tts_detail: Option<String>) -> Option<String> {
    let translated = text_field(response, "translated_text")?;
    let mode = text_field(response, "mode").unwrap_or_else(|| "helper bridge".to_string());
    let model = text_field(response, "model_id").unwrap_or_else(|| "model unknown".to_string());
    let device = text_field(response, "device").unwrap_or_else(|| "device unknown".to_string());
    let pair = text_field(response, "direction_pair").unwrap_or_else(|| "direction unknown".to_string());
    let tts = tts_detail
        .map(|detail| format!("; {}", clean_tts_detail(&detail)))
        .unwrap_or_default();
    Some(format!(
        "{translated}\n\n(helper bridge: {mode} / {model} / {device}; {pair}{tts})"
    ))
}

fn bridge_blocked_message(response: &Value) -> String {
    let stage = text_field(response, "stage").unwrap_or_else(|| "translate".to_string());
    let blocker = text_field(response, "blocker").unwrap_or_else(|| "translation:helper_response_not_ready".to_string());
    let friendly = user_friendly_blocker(&blocker);
    let note = text_field(response, "note");
    let model = text_field(response, "model_id");
    let device = text_field(response, "device").or_else(|| text_field(response, "selected_device"));
    let fallback = text_field(response, "translation_fallback_reason").or_else(|| text_field(response, "fallback_reason"));
    let next_actions = array_field(response, "next_actions");

    let mut details = vec![format!("{friendly} Stage: {stage}.")];
    if let Some(model) = model {
        details.push(format!("Model: {model}."));
    }
    if let Some(device) = device {
        details.push(format!("Device: {device}."));
    }
    if let Some(fallback) = fallback {
        details.push(format!("Fallback: {fallback}."));
    }
    if let Some(note) = note {
        details.push(note);
    }
    if let Some(next_actions) = next_actions {
        details.push(format!("Next: {next_actions}."));
    }
    details.join(" ")
}

fn synthesize_translated_text(
    runtime: &mut HelperBridgeRuntime,
    translated_text: &str,
) -> Option<String> {
    let text = clean_bridge_text(translated_text);
    if text.is_empty() {
        return Some("tts skipped: empty translated text".to_string());
    }

    runtime.active_task = Some("synthesize".to_string());
    runtime.updated_unix_ms = crate::commands::helper_bridge_runtime::unix_ms();

    let payload = json!({
        "command": "synthesize",
        "text": text,
    });

    if write_worker_request(runtime.stdin.as_mut()?, &payload).is_err() {
        runtime.active_task = None;
        runtime.last_error = Some("helper_bridge:tts_write_failed".to_string());
        runtime.updated_unix_ms = crate::commands::helper_bridge_runtime::unix_ms();
        return Some("tts blocked: failed to send synthesize request".to_string());
    }

    let response = match read_worker_response(runtime.stdout.as_mut()?) {
        Ok(value) => value,
        Err(error) => {
            runtime.active_task = None;
            runtime.last_error = Some("helper_bridge:tts_read_failed".to_string());
            runtime.updated_unix_ms = crate::commands::helper_bridge_runtime::unix_ms();
            return Some(format!("tts blocked: failed to read synthesize response: {error}"));
        }
    };

    runtime.active_task = None;
    runtime.updated_unix_ms = crate::commands::helper_bridge_runtime::unix_ms();

    if bool_field(&response, "ok") {
        let provider = text_field(&response, "provider").unwrap_or_else(|| "provider unknown".to_string());
        let output = text_field(&response, "output_path").unwrap_or_else(|| "output path unavailable".to_string());
        return Some(format!("tts: {provider} -> {output}"));
    }

    let blocker = text_field(&response, "blocker").unwrap_or_else(|| "tts:not_ready".to_string());
    runtime.last_error = Some(blocker.clone());
    let friendly = user_friendly_tts_blocker(&blocker);
    let next = array_field(&response, "next_actions")
        .map(|actions| format!(" next: {actions}"))
        .unwrap_or_default();
    Some(format!("{}{}", friendly, next))
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
            "Helper translation failed before the worker accepted the request. Restart Helper from Developer settings and try again.",
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
                format!("Helper translation failed while reading worker response: {error}. Restart Helper from Developer settings and try again."),
            ));
        }
    };

    let ok = apply_worker_response(&mut runtime, &response);
    runtime.active_task = None;
    runtime.updated_unix_ms = crate::commands::helper_bridge_runtime::unix_ms();

    if ok {
        let tts_detail = if settings.audio.auto_play_out_voice {
            text_field(&response, "translated_text")
                .and_then(|translated| synthesize_translated_text(&mut runtime, &translated))
        } else {
            None
        };

        return Some(
            bridge_success_message(&response, tts_detail)
                .map(|message| CommandResult::ok(LifecycleState::Idle, message))
                .unwrap_or_else(|| {
                    CommandResult::blocked(
                        LifecycleState::TranslationAdapterPending,
                        "Helper translation completed, but no translated text was returned. Check Worker Status in Developer settings.",
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
