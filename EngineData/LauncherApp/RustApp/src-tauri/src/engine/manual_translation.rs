use crate::engine::adapters::translation_logic::{run_translation_logic, TranslationLogicRequest};
use crate::engine::runtime_settings::load_settings;
use crate::engine::state::{CommandResult, LifecycleState};

pub fn translate_text(source: String) -> CommandResult {
    let trimmed = source.trim();
    if trimmed.is_empty() {
        return CommandResult::blocked(LifecycleState::EmptyInput, "No source text provided.");
    }

    let settings = load_settings();
    let quality_mode = settings.runtime_profile.eq_ignore_ascii_case("Quality");
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
            "Realtime local translation worker is not connected yet. Source was received safely: {trimmed}. Planner status: {} / {}",
            result.status, result.mode
        ),
    )
}
