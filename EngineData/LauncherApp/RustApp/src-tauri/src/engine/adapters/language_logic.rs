use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageLogicRequest {
    pub text: Option<String>,
    pub detected_language: Option<String>,
    pub source_language: String,
    pub target_language: String,
    pub language_probability: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LanguageLogicReport {
    pub normalized_source: String,
    pub normalized_target: String,
    pub normalized_detected: String,
    pub should_translate: bool,
    pub inferred_language_bias: String,
    pub normalized_short_source_text: String,
}

pub fn run_language_logic(request: LanguageLogicRequest) -> LanguageLogicReport {
    let text = request.text.unwrap_or_default();
    let source = normalize_language_code(Some(&request.source_language));
    let target = normalize_language_code(Some(&request.target_language));
    let detected = normalize_language_code(request.detected_language.as_deref());
    let tokens = tokenize(&text);
    let id_score = tokens.iter().filter(|token| is_id_cue(token)).count();
    let en_score = tokens.iter().filter(|token| is_en_cue(token)).count();
    let bias = infer_bias(&tokens, &source, &target, &detected, request.language_probability.unwrap_or(0.0), id_score, en_score);
    let normalized_text = normalize_short_id_text(&tokens, &text, &source, &target, id_score, en_score);
    LanguageLogicReport {
        normalized_source: source.clone(),
        normalized_target: target.clone(),
        normalized_detected: detected.clone(),
        should_translate: should_translate_segment(Some(&detected), &source, &target),
        inferred_language_bias: bias,
        normalized_short_source_text: normalized_text,
    }
}

fn normalize_language_code(language: Option<&str>) -> String {
    let value = language.unwrap_or_default().trim().to_lowercase();
    if value.starts_with("ind") || value.starts_with("id") { return "id".to_string(); }
    if value.starts_with("eng") || value.starts_with("en") { return "en".to_string(); }
    value.split(['-', '_']).next().unwrap_or("").chars().take(2).collect()
}

fn should_translate_segment(detected: Option<&str>, source: &str, target: &str) -> bool {
    let detected = normalize_language_code(detected);
    !target.is_empty() && source != target && detected != target
}

fn infer_bias(tokens: &[String], source: &str, target: &str, detected: &str, prob: f64, id_score: usize, en_score: usize) -> String {
    let fallback = if detected.is_empty() { source } else { detected };
    if tokens.is_empty() || source == target { return fallback.to_string(); }
    let has_id_affix = tokens.iter().any(|token| token.len() > 3 && ["lah", "kah", "ku", "mu", "nya", "kan", "i"].iter().any(|suffix| token.ends_with(suffix)));
    if source == "id" && target == "en" {
        if (id_score > 0 || has_id_affix) && (tokens.len() <= 8 || prob <= 0.85 || id_score > en_score) { return "id".to_string(); }
        if tokens.len() <= 3 && id_score > en_score { return "id".to_string(); }
        if en_score > id_score && tokens.len() <= 5 { return "en".to_string(); }
    }
    if source == "en" && target == "id" && en_score > 0 && (tokens.len() <= 8 || prob <= 0.85) { return "en".to_string(); }
    fallback.to_string()
}

fn normalize_short_id_text(tokens: &[String], original: &str, source: &str, target: &str, id_score: usize, en_score: usize) -> String {
    let trimmed = original.trim().to_string();
    if source != "id" || target == "id" || tokens.is_empty() || tokens.len() > 6 { return trimmed; }
    let has_replacement = tokens.iter().any(|token| replacement(token).is_some());
    if id_score == 0 && !has_replacement { return trimmed; }
    if id_score < en_score && !has_replacement { return trimmed; }
    let mut changed = false;
    let mut out = Vec::new();
    for token in tokens {
        let value = replacement(token).unwrap_or(token.as_str());
        if value != token { changed = true; }
        out.extend(value.split_whitespace().map(|part| part.to_string()));
    }
    if changed { out.join(" ") } else { trimmed }
}

fn tokenize(text: &str) -> Vec<String> {
    text.trim().to_lowercase().chars().map(|c| if c.is_alphanumeric() || c.is_whitespace() { c } else { ' ' }).collect::<String>().split_whitespace().map(|t| t.to_string()).collect()
}

fn is_id_cue(token: &str) -> bool {
    matches!(token, "halo" | "coba" | "bicara" | "lagi" | "oke" | "ok" | "iya" | "ya" | "tidak" | "tolong" | "maaf" | "terima" | "kasih" | "sudah" | "udah" | "saya" | "kamu" | "kami" | "kita" | "apa" | "kenapa" | "lalu" | "sama")
}

fn is_en_cue(token: &str) -> bool {
    matches!(token, "hello" | "please" | "sorry" | "again" | "talk" | "speak" | "speaking" | "try" | "go" | "yes" | "no" | "thanks" | "thank" | "you" | "i" | "we" | "what" | "why" | "the" | "and" | "to" | "for" | "of" | "is" | "are")
}

fn replacement(token: &str) -> Option<&'static str> {
    match token {
        "check" => Some("cek"), "the" => Some(""), "hello" => Some("halo"), "hi" => Some("hai"), "please" => Some("tolong"), "try" => Some("coba"), "speak" | "speaking" => Some("bicara"), "word" => Some("kata"), "again" => Some("lagi"), "yes" => Some("ya"), "no" => Some("tidak"), "thanks" | "thank" => Some("terima kasih"), _ => None,
    }
}
