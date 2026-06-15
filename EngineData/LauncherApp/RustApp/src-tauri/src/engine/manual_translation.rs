use crate::engine::adapters::translation_logic::{run_translation_logic, TranslationLogicRequest};
use crate::engine::state::{CommandResult, LifecycleState};

pub fn translate_text(source: String) -> CommandResult {
    let trimmed = source.trim();
    if trimmed.is_empty() {
        return CommandResult::blocked(LifecycleState::EmptyInput, "No source text provided.");
    }

    let result = run_translation_logic(TranslationLogicRequest {
        segment_id: "manual_text_input".to_string(),
        source_text: trimmed.to_string(),
        source_language: "id".to_string(),
        target_language: "en".to_string(),
        detected_language: None,
        context_window: Vec::new(),
        backend_ready: false,
        primary_engine_name: Some("marianmt-id-en".to_string()),
        fallback_engine_name: Some("nllb-200-distilled-600M-quality".to_string()),
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
