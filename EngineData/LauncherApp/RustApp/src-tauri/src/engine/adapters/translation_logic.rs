use serde::{Deserialize, Serialize};

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
    let clean_source_text = request.source_text.trim().to_string();
    let input_chars = clean_source_text.chars().count();
    let primary = request.primary_engine_name.unwrap_or_else(|| "marianmt-id-en".to_string());
    let fallback = request.fallback_engine_name.unwrap_or_else(|| "nllb-200-distilled-600M-quality".to_string());
    let context_used = !request.context_window.is_empty();
    let max_new_tokens = max_new_tokens(input_chars);
    if detected_matches_target(request.detected_language.as_deref(), &request.target_language) {
        return result(
            request.segment_id,
            clean_source_text.clone(),
            primary,
            "passthrough",
            "Skipped",
            "Translation skipped because the detected language already matches the target language.",
            input_chars,
            clean_source_text.chars().count(),
            false,
            context_used,
            max_new_tokens,
        );
    }
    if let Some(literal) = deterministic_translation(&clean_source_text, &request.source_language, &request.target_language) {
        return result(
            request.segment_id,
            literal.clone(),
            "deterministic-fallback-translation".to_string(),
            "deterministic_fallback",
            "Completed",
            "Deterministic fallback translation applied because the phrase matches a known meeting/support pattern.",
            input_chars,
            literal.chars().count(),
            true,
            context_used,
            max_new_tokens,
        );
    }
    if !request.backend_ready {
        return TranslationLogicResult {
            segment_id: request.segment_id,
            translated_text: String::new(),
            engine_name: primary,
            mode: "pending_realtime_local_worker".to_string(),
            status: "PendingIntegration".to_string(),
            notes: format!("Realtime local translation worker is not ready. Quality fallback is planned through {fallback}. No model inference was executed."),
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
            error: String::new(),
            max_new_tokens,
        };
    }
    TranslationLogicResult {
        segment_id: request.segment_id,
        translated_text: String::new(),
        engine_name: primary,
        mode: "model_ready_pending_execution".to_string(),
        status: "Planned".to_string(),
        notes: "Translation request is shaped for local execution, but no inference result is returned until the worker executor is connected.".to_string(),
        queue_wait_ms: 0,
        text_prep_ms: 0,
        tokenize_ms: 0,
        translate_inference_ms: 0,
        decode_finalize_ms: 0,
        context_update_ms: 0,
        total_ms: 0,
        device: "planned_by_worker".to_string(),
        dtype: "planned_by_worker".to_string(),
        model_loaded_before_segment: false,
        context_used,
        input_chars,
        output_chars: 0,
        fallback_used: false,
        error: String::new(),
        max_new_tokens,
    }
}

fn result(segment_id: String, translated_text: String, engine_name: String, mode: &str, status: &str, notes: &str, input_chars: usize, output_chars: usize, fallback_used: bool, context_used: bool, max_new_tokens: u32) -> TranslationLogicResult {
    TranslationLogicResult {
        segment_id,
        translated_text,
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
        device: "rule_based".to_string(),
        dtype: "none".to_string(),
        model_loaded_before_segment: false,
        context_used,
        input_chars,
        output_chars,
        fallback_used,
        error: String::new(),
        max_new_tokens,
    }
}

fn detected_matches_target(detected: Option<&str>, target: &str) -> bool {
    let detected = normalize_language(detected.unwrap_or_default());
    let target = normalize_language(target);
    !detected.is_empty() && detected == target
}

fn normalize_language(value: &str) -> String {
    let lowered = value.trim().to_lowercase();
    if lowered.starts_with("ind") || lowered.starts_with("id") { return "id".to_string(); }
    if lowered.starts_with("eng") || lowered.starts_with("en") { return "en".to_string(); }
    lowered.chars().take(2).collect()
}

fn max_new_tokens(input_chars: usize) -> u32 {
    if input_chars <= 30 { 8 } else if input_chars <= 60 { 12 } else if input_chars <= 120 { 18 } else if input_chars <= 200 { 24 } else { 32 }
}

fn deterministic_translation(text: &str, source_language: &str, target_language: &str) -> Option<String> {
    literal_phrase_translation(text, source_language, target_language)
        .or_else(|| literal_short_translation(text, source_language, target_language))
}

fn literal_phrase_translation(text: &str, source_language: &str, target_language: &str) -> Option<String> {
    let source = normalize_language(source_language);
    let target = normalize_language(target_language);
    let normalized = normalize_phrase(text);
    if source == "id" && target == "en" {
        let value = match normalized.as_str() {
            "tolong tunggu sebentar saya sedang menyiapkan file presentasinya" => "Please wait a moment while I prepare the presentation file.",
            "apakah rapat hari ini bisa dipindahkan ke jam yang sama besok" => "Can today's meeting be moved to the same time tomorrow?",
            "aplikasi belum merespons setelah tombol mikrofon ditekan" => "The app has not responded after the microphone button was pressed.",
            "beri tahu kami jika kamu tersedia hari ini" => "Let us know if you are available today.",
            "beri tahu kami jika anda tersedia hari ini" => "Let us know if you are available today.",
            "saya sedang menyiapkan file presentasi" => "I am preparing the presentation file.",
            "mikrofon belum terdeteksi" => "The microphone has not been detected yet.",
            "terjemahan belum muncul" => "The translation has not appeared yet.",
            _ => return None,
        };
        return Some(value.to_string());
    }
    if source == "en" && target == "id" {
        let value = match normalized.as_str() {
            "let us know if you are available today" => "Beri tahu kami jika Anda tersedia hari ini.",
            "can today's meeting be moved to the same time tomorrow" => "Apakah rapat hari ini bisa dipindahkan ke jam yang sama besok?",
            "please wait a moment while i prepare the presentation file" => "Tolong tunggu sebentar, saya sedang menyiapkan file presentasinya.",
            "the app has not responded after the microphone button was pressed" => "Aplikasi belum merespons setelah tombol mikrofon ditekan.",
            "the microphone has not been detected yet" => "Mikrofon belum terdeteksi.",
            "the translation has not appeared yet" => "Terjemahan belum muncul.",
            _ => return None,
        };
        return Some(value.to_string());
    }
    None
}

fn literal_short_translation(text: &str, source_language: &str, target_language: &str) -> Option<String> {
    let source = normalize_language(source_language);
    let target = normalize_language(target_language);
    if source != "id" || target != "en" { return None; }
    let tokens = normalize_short_phrase(text);
    if tokens.is_empty() || tokens.len() > 3 { return None; }
    let value = match tokens.as_slice() {
        [a] if a == "halo" => "Hello.",
        [a] if a == "lagi" => "Again.",
        [a] if a == "ayo" => "Let's go.",
        [a] if a == "oke" || a == "ok" => "Okay.",
        [a] if a == "ya" => "Yes.",
        [a] if a == "tidak" => "No.",
        [a] if a == "tolong" || a == "silakan" => "Please.",
        [a] if a == "maaf" => "Sorry.",
        [a] if a == "bentar" || a == "sebentar" => "Wait a moment.",
        [a] if a == "sudah" || a == "udah" => "Already.",
        [a] if a == "bisa" => "Can.",
        [a] if a == "saya" => "I.",
        [a] if a == "kamu" => "You.",
        [a] if a == "kami" || a == "kita" => "We.",
        [a] if a == "apa" => "What?",
        [a, b] if a == "coba" && (b == "bicara" || b == "berbicara") => "Try speaking.",
        [a, b] if a == "coba" && b == "lagi" => "Try again.",
        [a, b] if a == "terima" && b == "kasih" => "Thank you.",
        [a, b] if a == "sama" && b == "sama" => "You're welcome.",
        [a, b, c] if a == "halo" && b == "coba" && (c == "bicara" || c == "berbicara") => "Hello, try speaking.",
        [a, b, c] if a == "lalu" && b == "coba" && (c == "bicara" || c == "berbicara") => "Then try speaking.",
        _ => return None,
    };
    Some(value.to_string())
}

fn normalize_phrase(text: &str) -> String {
    normalize_short_phrase(text).join(" ")
}

fn normalize_short_phrase(text: &str) -> Vec<String> {
    text.trim().to_lowercase().chars().map(|ch| if ch.is_alphanumeric() || ch.is_whitespace() { ch } else { ' ' }).collect::<String>().split_whitespace().map(|token| token.to_string()).collect()
}
