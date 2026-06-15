use crate::engine::adapters::translation_logic::{run_translation_logic, TranslationLogicRequest};
use crate::engine::runtime_settings::load_settings;
use crate::engine::state::{CommandResult, LifecycleState};

const MAX_MANUAL_TRANSLATION_CHARS: usize = 2_000;
const SOURCE_PREVIEW_CHARS: usize = 180;

fn preview_source(value: &str) -> String {
    let mut preview = String::new();
    let mut previous_was_space = false;
    let mut truncated = false;

    for character in value.chars() {
        let next_character = if character.is_whitespace() {
            if previous_was_space {
                continue;
            }
            previous_was_space = true;
            ' '
        } else {
            previous_was_space = false;
            character
        };

        if preview.chars().count() >= SOURCE_PREVIEW_CHARS {
            truncated = true;
            break;
        }
        preview.push(next_character);
    }

    let mut preview = preview.trim().to_string();
    if truncated {
        preview.push('…');
    }
    preview
}

pub fn translate_text(source: String) -> CommandResult {
    let trimmed = source.trim();
    if trimmed.is_empty() {
        return CommandResult::blocked(LifecycleState::EmptyInput, "No source text provided.");
    }

    let input_chars = trimmed.chars().count();
    if input_chars > MAX_MANUAL_TRANSLATION_CHARS {
        return CommandResult::blocked(
            LifecycleState::TranslationAdapterPending,
            format!(
                "Input is too long for manual translation preview. Limit: {MAX_MANUAL_TRANSLATION_CHARS} characters. Received: {input_chars} characters."
            ),
        );
    }

    let settings = load_settings();
    let quality_mode = settings.runtime_profile.eq_ignore_ascii_case("Quality");
    let profile_label = if quality_mode { "Quality" } else { "Realtime" };
    let primary_engine_name = if quality_mode {
        "nllb-200-distilled-600M-quality"
    } else {
        "marianmt-id-en"
    };
    let fallback_engine_name = if quality_mode {
        "marianmt-id-en"
    } else {
        "nllb-200-distilled-600M-quality"
    };

    let result = run_translation_logic(TranslationLogicRequest {
        segment_id: "manual_text_input".to_string(),
        source_text: trimmed.to_string(),
        source_language: settings.source_language,
        target_language: settings.target_language,
        detected_language: None,
        context_window: Vec::new(),
        backend_ready: false,
        primary_engine_name: Some(primary_engine_name.to_string()),
        fallback_engine_name: Some(fallback_engine_name.to_string()),
    });

    if !result.translated_text.trim().is_empty() && result.status == "Completed" {
        return CommandResult::ok(
            LifecycleState::Idle,
            format!("{}", result.translated_text.trim()),
        );
    }

    CommandResult::blocked(
        LifecycleState::TranslationAdapterPending,
        format!(
            "{profile_label} local translation worker is not connected yet. Source preview: {}. Planner status: {} / {}",
            preview_source(trimmed), result.status, result.mode
        ),
    )
}
