use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageRoutingRequest {
    pub text: Option<String>,
    pub detected_language: Option<String>,
    pub source_language: String,
    pub target_language: String,
    pub language_probability: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LanguageRoutingReport {
    pub normalized_source: String,
    pub normalized_target: String,
    pub normalized_detected: String,
    pub should_translate: bool,
    pub inferred_language_bias: String,
    pub normalized_short_source_text: String,
    pub indonesian_score: usize,
    pub english_score: usize,
}

pub fn normalize_language_code(language: Option<&str>) -> String {
    let mut value = language.unwrap_or_default().trim().to_lowercase();
    if value.is_empty() {
        return String::new();
    }
    if value.starts_with("ind") || value.starts_with("id") {
        return "id".to_string();
    }
    if value.starts_with("eng") || value.starts_with("en") {
        return "en".to_string();
    }
    if let Some((first, _)) = value.split_once('-') {
        value = first.to_string();
    }
    if let Some((first, _)) = value.split_once('_') {
        value = first.to_string();
    }
    value.chars().take(2).collect()
}

pub fn should_translate_segment(detected_language: Option<&str>, source_language: &str, target_language: &str) -> bool {
    let source = normalize_language_code(Some(source_language));
    let target = normalize_language_code(Some(target_language));
    let detected = normalize_language_code(detected_language);
    if target.is_empty() || source == target {
        return false;
    }
    if detected == target {
        return false;
    }
    true
}

pub fn analyze_language_routing(request: LanguageRoutingRequest) -> LanguageRoutingReport {
    let text = request.text.unwrap_or_default();
    let source = normalize_language_code(Some(&request.source_language));
    let target = normalize_language_code(Some(&request.target_language));
    let detected = normalize_language_code(request.detected_language.as_deref());
    let tokens = tokenize(&text);
    let indonesian_score = tokens.iter().filter(|token| is_id_cue(token)).count();
    let english_score = tokens.iter().filter(|token| is_en_cue(token)).count();
    let inferred_language_bias = infer_language_bias(
        &tokens,
        &source,
        &target,
        &detected,
        request.language_probability.unwrap_or(0.0),
        indonesian_score,
        english_score,
    );
    let normalized_short_source_text = normalize_short_id_source_text(&tokens, &text, &source, &target, indonesian_score, english_score);

    LanguageRoutingReport {
        normalized_source: source,
        normalized_target: target,
        normalized_detected: detected.clone(),
        should_translate: should_translate_segment(request.detected_language.as_deref(), &request.source_language, &request.target_language),
        inferred_language_bias,
        normalized_short_source_text,
        indonesian_score,
        english_score,
    }
}

fn infer_language_bias(
    tokens: &[String],
    source: &str,
    target: &str,
    detected: &str,
    probability: f64,
    indonesian_score: usize,
    english_score: usize,
) -> String {
    let fallback = if detected.is_empty() { source } else { detected };
    if tokens.is_empty() || source == target {
        return fallback.to_string();
    }
    let token_count = tokens.len();
    let has_id_affix = tokens.iter().any(|token| {
        token.len() > 3 && ["lah", "kah", "ku", "mu", "nya", "kan", "i"].iter().any(|suffix| token.ends_with(suffix))
    });
    if source == "id" && target == "en" {
        if indonesian_score > 0 || has_id_affix {
            if token_count <= 8 || probability <= 0.85 || indonesian_score > english_score {
                return "id".to_string();
            }
        }
        if token_count <= 3 && indonesian_score > english_score {
            return "id".to_string();
        }
        if english_score > indonesian_score && token_count <= 5 {
            return "en".to_string();
        }
    }
    if source == "en" && target == "id" && english_score > 0 && (token_count <= 8 || probability <= 0.85) {
        return "en".to_string();
    }
    fallback.to_string()
}

fn normalize_short_id_source_text(tokens: &[String], original: &str, source: &str, target: &str, ind_score: usize, en_score: usize) -> String {
    let trimmed = original.trim().to_string();
    if source != "id" || target == "id" || tokens.is_empty() || tokens.len() > 6 {
        return trimmed;
    }
    let has_replacement = tokens.iter().any(|token| replacement(token).is_some());
    if ind_score == 0 && !has_replacement {
        return trimmed;
    }
    if ind_score < en_score && !has_replacement {
        return trimmed;
    }
    let mut changed = false;
    let mut out = Vec::new();
    for token in tokens {
        let value = replacement(token).unwrap_or(token.as_str());
        if value != token {
            changed = true;
        }
        for part in value.split_whitespace() {
            if !part.is_empty() {
                out.push(part.to_string());
            }
        }
    }
    if changed { out.join(" ") } else { trimmed }
}

fn tokenize(text: &str) -> Vec<String> {
    text.trim()
        .to_lowercase()
        .chars()
        .map(|ch| if ch.is_alphanumeric() || ch.is_whitespace() { ch } else { ' ' })
        .collect::<String>()
        .split_whitespace()
        .map(|token| token.to_string())
        .collect()
}

fn is_id_cue(token: &str) -> bool {
    matches!(token, "halo" | "coba" | "bicara" | "lagi" | "oke" | "ok" | "iya" | "ya" | "tidak" | "nggak" | "enggak" | "tolong" | "maaf" | "terima" | "kasih" | "sudah" | "udah" | "saya" | "kamu" | "kami" | "kita" | "apa" | "kenapa" | "lalu" | "sama")
}

fn is_en_cue(token: &str) -> bool {
    matches!(token, "hello" | "please" | "sorry" | "again" | "talk" | "speak" | "speaking" | "try" | "go" | "yes" | "no" | "thanks" | "thank" | "you" | "i" | "we" | "what" | "why" | "the" | "and" | "to" | "for" | "of" | "is" | "are")
}

fn replacement(token: &str) -> Option<&'static str> {
    match token {
        "check" => Some("cek"),
        "the" => Some(""),
        "hello" => Some("halo"),
        "hi" => Some("hai"),
        "please" => Some("tolong"),
        "try" => Some("coba"),
        "speak" | "speaking" => Some("bicara"),
        "word" => Some("kata"),
        "again" => Some("lagi"),
        "yes" => Some("ya"),
        "no" => Some("tidak"),
        "thanks" | "thank" => Some("terima kasih"),
        _ => None,
    }
}
