use serde::{Deserialize, Serialize};

const MAX_TRANSLATION_TEXT_CHARS: usize = 8_000;
const MAX_TRANSLATION_SEGMENT_ID_CHARS: usize = 96;
const MAX_TRANSLATION_ENGINE_NAME_CHARS: usize = 160;
const MAX_TRANSLATION_LANGUAGE_CHARS: usize = 32;
const MAX_TRANSLATION_CONTEXT_SEGMENTS: usize = 64;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationLogicRequest {
    pub segment_id: String,
    pub source_text: String,
    pub source_language: String,
    pub target_language: String,
    pub detected_language: Option<String>,
    pub context_window: Vec<String>,
    pub backend_ready: bool,
    pub primary_engine_name: Option<String>,
    pub fallback_engine_name: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TranslationLogicResult {
    pub segment_id: String,
    pub translated_text: String,
    pub engine_name: String,
    pub mode: String,
    pub status: String,
    pub notes: String,
    pub queue_wait_ms: i64,
    pub text_prep_ms: i64,
    pub tokenize_ms: i64,
    pub translate_inference_ms: i64,
    pub decode_finalize_ms: i64,
    pub context_update_ms: i64,
    pub total_ms: i64,
    pub device: String,
    pub dtype: String,
    pub model_loaded_before_segment: bool,
    pub context_used: bool,
    pub input_chars: usize,
    pub output_chars: usize,
    pub fallback_used: bool,
    pub error: String,
    pub max_new_tokens: u32,
}

pub fn run_translation_logic(request: TranslationLogicRequest) -> TranslationLogicResult {
    let segment_id = sanitize_segment_id(&request.segment_id);
    let clean_source_text =
        compact_translation_text(&request.source_text, MAX_TRANSLATION_TEXT_CHARS);
    let source_language = normalize_language(&request.source_language);
    let target_language = normalize_language(&request.target_language);
    let detected_language = request.detected_language.as_deref().map(normalize_language);
    let input_chars = clean_source_text.chars().count();
    let primary = sanitize_engine_name(
        request
            .primary_engine_name
            .as_deref()
            .unwrap_or("persistent-local-worker"),
    );
    let context_used = request
        .context_window
        .iter()
        .take(MAX_TRANSLATION_CONTEXT_SEGMENTS)
        .any(|item| !compact_translation_text(item, MAX_TRANSLATION_TEXT_CHARS).is_empty());
    let max_new_tokens = max_new_tokens(input_chars);

    if clean_source_text.is_empty() {
        return non_execution_result(
            segment_id,
            primary,
            "blocked_empty_input",
            "Blocked",
            "No source text was provided. No translation inference was executed.",
            context_used,
            input_chars,
            max_new_tokens,
            "translation:empty_text",
        );
    }

    if detected_matches_target(detected_language.as_deref(), &target_language) {
        return TranslationLogicResult {
            segment_id,
            translated_text: clean_source_text.clone(),
            engine_name: primary,
            mode: "passthrough".to_string(),
            status: "Skipped".to_string(),
            notes: "Translation skipped because the detected language already matches the target language. This is passthrough, not model translation.".to_string(),
            queue_wait_ms: 0,
            text_prep_ms: 0,
            tokenize_ms: 0,
            translate_inference_ms: 0,
            decode_finalize_ms: 0,
            context_update_ms: 0,
            total_ms: 0,
            device: "not_executed".to_string(),
            dtype: "not_executed".to_string(),
            model_loaded_before_segment: false,
            context_used,
            input_chars,
            output_chars: clean_source_text.chars().count(),
            fallback_used: false,
            error: String::new(),
            max_new_tokens,
        };
    }

    if !request.backend_ready {
        return non_execution_result(
            segment_id,
            primary,
            "persistent_worker_unavailable",
            "PendingIntegration",
            &format!(
                "Canonical persistent translation execution is not ready for {source_language}->{target_language}. No deterministic, dictionary, preview, or alternate-worker fallback is permitted."
            ),
            context_used,
            input_chars,
            max_new_tokens,
            "translation:persistent_worker_unavailable",
        );
    }

    non_execution_result(
        segment_id,
        primary,
        "persistent_worker_execution_required",
        "Planned",
        &format!(
            "Translation request is valid for {source_language}->{target_language}, but this adapter is not an inference executor. Product translation must come from the canonical persistent worker."
        ),
        context_used,
        input_chars,
        max_new_tokens,
        "",
    )
}

fn non_execution_result(
    segment_id: String,
    engine_name: String,
    mode: &str,
    status: &str,
    notes: &str,
    context_used: bool,
    input_chars: usize,
    max_new_tokens: u32,
    error: &str,
) -> TranslationLogicResult {
    TranslationLogicResult {
        segment_id,
        translated_text: String::new(),
        engine_name,
        mode: mode.to_string(),
        status: status.to_string(),
        notes: notes.to_string(),
        queue_wait_ms: 0,
        text_prep_ms: 0,
        tokenize_ms: 0,
        translate_inference_ms: 0,
        decode_finalize_ms: 0,
        context_update_ms: 0,
        total_ms: 0,
        device: "not_executed".to_string(),
        dtype: "not_executed".to_string(),
        model_loaded_before_segment: false,
        context_used,
        input_chars,
        output_chars: 0,
        fallback_used: false,
        error: error.to_string(),
        max_new_tokens,
    }
}

fn is_unsafe_translation_character(character: char) -> bool {
    character == '\0'
        || ('\u{0001}'..='\u{0008}').contains(&character)
        || ('\u{000b}'..='\u{001f}').contains(&character)
        || character == '\u{007f}'
        || ('\u{202a}'..='\u{202e}').contains(&character)
        || ('\u{2066}'..='\u{2069}').contains(&character)
}

fn compact_translation_text(value: &str, max_chars: usize) -> String {
    value
        .trim()
        .chars()
        .filter(|character| !is_unsafe_translation_character(*character))
        .take(max_chars)
        .collect::<String>()
}

fn sanitize_segment_id(value: &str) -> String {
    let clean = value
        .trim()
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || matches!(character, '-' | '_') {
                character
            } else {
                '_'
            }
        })
        .take(MAX_TRANSLATION_SEGMENT_ID_CHARS)
        .collect::<String>();
    if clean.is_empty() {
        "segment".to_string()
    } else {
        clean
    }
}

fn sanitize_engine_name(value: &str) -> String {
    let clean = compact_translation_text(value, MAX_TRANSLATION_ENGINE_NAME_CHARS);
    if clean.is_empty() {
        "persistent-local-worker".to_string()
    } else {
        clean
    }
}

fn detected_matches_target(detected: Option<&str>, target: &str) -> bool {
    let detected = normalize_language(detected.unwrap_or_default());
    let target = normalize_language(target);
    !detected.is_empty() && detected == target
}

fn normalize_language(value: &str) -> String {
    let lowered = compact_translation_text(value, MAX_TRANSLATION_LANGUAGE_CHARS).to_lowercase();
    if lowered.starts_with("ind") || lowered.starts_with("id") {
        return "id".to_string();
    }
    if lowered.starts_with("eng") || lowered.starts_with("en") {
        return "en".to_string();
    }
    lowered.chars().take(2).collect()
}

fn max_new_tokens(input_chars: usize) -> u32 {
    if input_chars <= 30 {
        8
    } else if input_chars <= 60 {
        12
    } else if input_chars <= 120 {
        18
    } else if input_chars <= 200 {
        24
    } else {
        32
    }
}
