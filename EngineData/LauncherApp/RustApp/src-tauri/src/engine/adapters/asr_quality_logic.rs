use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AsrQualityLogicRequest {
    pub transcript_text: String,
    pub audio_rms: f32,
    pub audio_peak: f32,
    pub peak_to_rms_ratio: f32,
    pub speech_to_noise_gap: f32,
    pub voiced_frame_ratio: f32,
    pub audio_duration_ms: u32,
    pub sustained_speech_ms: u32,
    pub no_speech_probability: f32,
    pub average_log_probability: f32,
    pub compression_ratio: f32,
    pub language_probability: f32,
    pub language_ok: bool,
    pub timestamp_ok: bool,
    pub repetitive_text: bool,
    pub empty_output: bool,
    pub zero_crossing_rate: f32,
    pub frame_energy_concentration: f32,
    pub frame_active_ratio: f32,
    pub impulse_edge_ratio: f32,
}

#[derive(Debug, Clone, Serialize)]
pub struct AsrQualityLogicDecision {
    pub accepted: bool,
    pub should_hide: bool,
    pub reason: String,
    pub normalized_text: String,
    pub badword_match: String,
}

pub fn evaluate_asr_quality(request: AsrQualityLogicRequest) -> AsrQualityLogicDecision {
    let normalized = normalize_text(&request.transcript_text);
    let tokens = tokenize(&normalized);
    if request.empty_output || normalized.is_empty() {
        return reject("Empty ASR output", &normalized, "");
    }
    if !request.language_ok {
        return reject("Language check failed", &normalized, "");
    }
    if !request.timestamp_ok {
        return reject("Timestamp check failed", &normalized, "");
    }
    if known_silence_hallucination(&normalized) {
        return reject("Known silence hallucination", &normalized, "");
    }
    let badword_match = find_badword_match(&tokens);
    if !badword_match.is_empty() {
        return reject("Profanity-like ASR artifact", &normalized, &badword_match);
    }
    if request.repetitive_text || looks_looping(&tokens, request.average_log_probability, request.no_speech_probability, request.language_probability, request.voiced_frame_ratio) {
        return reject("Looping or repetitive ASR artifact", &normalized, "");
    }
    if looks_like_gibberish(&tokens, request.average_log_probability, request.no_speech_probability, request.language_probability, request.voiced_frame_ratio) {
        return reject("Gibberish or contextless ASR artifact", &normalized, "");
    }
    if request.no_speech_probability >= 0.92 && request.voiced_frame_ratio <= 0.02 && !contains_focus_anchor(&tokens) {
        return reject("High no-speech probability", &normalized, "");
    }
    if request.audio_duration_ms < 120 && request.sustained_speech_ms < 100 && !contains_focus_anchor(&tokens) {
        return reject("Speech segment too short for reliable ASR", &normalized, "");
    }
    AsrQualityLogicDecision {
        accepted: true,
        should_hide: false,
        reason: "Accepted".to_string(),
        normalized_text: normalized,
        badword_match: String::new(),
    }
}

fn reject(reason: &str, normalized_text: &str, badword_match: &str) -> AsrQualityLogicDecision {
    AsrQualityLogicDecision {
        accepted: false,
        should_hide: true,
        reason: reason.to_string(),
        normalized_text: normalized_text.to_string(),
        badword_match: badword_match.to_string(),
    }
}

fn normalize_text(text: &str) -> String {
    text.trim().to_lowercase().split_whitespace().collect::<Vec<_>>().join(" ")
}

fn tokenize(text: &str) -> Vec<String> {
    text.split_whitespace().map(|token| token.to_string()).collect()
}

fn contains_focus_anchor(tokens: &[String]) -> bool {
    tokens.iter().any(|token| matches!(token.as_str(), "halo" | "hello" | "hi" | "coba" | "bicara" | "speak" | "talk" | "tolong" | "please" | "saya" | "i" | "we" | "you" | "ya" | "yes" | "tidak" | "no" | "terima" | "kasih" | "thanks" | "thank"))
}

fn known_silence_hallucination(text: &str) -> bool {
    matches!(text, "selamat menikmati" | "selamat menikmati." | "terima kasih" | "terima kasih." | "terima kasih!" | "terima kasih telah menonton" | "terima kasih telah menonton." | "thanks for watching" | "thank you for watching" | "see you next time" | "bye bye" | "don't forget to subscribe" | "subscribe for more" | "i'm going to say" | "i'm not sure what i'm saying")
}

fn find_badword_match(tokens: &[String]) -> String {
    let simplified = tokens.iter().map(|token| simplify_badword_token(token)).filter(|token| !token.is_empty()).collect::<Vec<_>>();
    let phrases = vec![
        vec!["anjing"], vec!["asu"], vec!["bajingan"], vec!["bangsat"], vec!["bego"], vec!["brengsek"], vec!["jancok"], vec!["jancuk"], vec!["keparat"], vec!["fuck"], vec!["fucker"], vec!["fucking"], vec!["goblok"], vec!["kontol"], vec!["memek"], vec!["ngentot"], vec!["pelacur"], vec!["shit"], vec!["tai"], vec!["tolol"], vec!["sundal"], vec!["whore"], vec!["slut"], vec!["bitch"], vec!["bastard"], vec!["cunt"], vec!["dickhead"], vec!["motherfucker"], vec!["son", "of", "a", "bitch"], vec!["fuck", "you"], vec!["damn", "you"],
    ];
    for start in 0..simplified.len() {
        for phrase in &phrases {
            if start + phrase.len() <= simplified.len() && simplified[start..start + phrase.len()].iter().map(String::as_str).eq(phrase.iter().copied()) {
                return phrase.join(" ");
            }
        }
    }
    String::new()
}

fn simplify_badword_token(token: &str) -> String {
    let translated = token.to_lowercase().chars().map(|ch| match ch { '@' | '4' => 'a', '3' => 'e', '1' | '!' => 'i', '0' => 'o', '5' | '$' => 's', other => other }).collect::<String>();
    let letters = translated.chars().filter(|ch| ch.is_alphabetic()).collect::<Vec<_>>();
    let mut out = String::new();
    let mut previous = '\0';
    for ch in letters {
        if ch != previous {
            out.push(ch);
            previous = ch;
        }
    }
    out
}

fn looks_like_gibberish(tokens: &[String], avg_log_prob: f32, no_speech: f32, lang_prob: f32, voiced_ratio: f32) -> bool {
    if tokens.is_empty() || contains_focus_anchor(tokens) { return false; }
    let distinct_ratio = distinct_ratio(tokens);
    let max_len = tokens.iter().map(|token| token.chars().count()).max().unwrap_or(0);
    if tokens.len() <= 2 {
        if avg_log_prob <= -0.45 && no_speech >= 0.08 && voiced_ratio <= 0.32 { return true; }
        if lang_prob > 0.0 && lang_prob <= 0.45 && avg_log_prob <= -0.15 { return true; }
        if max_len >= 7 && distinct_ratio <= 0.5 && avg_log_prob <= -0.12 { return true; }
    }
    tokens.len() <= 3 && distinct_ratio <= 0.67 && lang_prob > 0.0 && lang_prob <= 0.55 && avg_log_prob <= -0.20
}

fn looks_looping(tokens: &[String], avg_log_prob: f32, no_speech: f32, lang_prob: f32, voiced_ratio: f32) -> bool {
    if tokens.len() < 3 { return false; }
    let distinct = distinct_ratio(tokens);
    let repeated_bigram = repeated_windows(tokens, 2);
    let repeated_trigram = repeated_windows(tokens, 3);
    if tokens.len() >= 8 && repeated_trigram >= 2 && distinct <= 0.55 { return true; }
    if tokens.len() >= 8 && repeated_bigram >= 3 && distinct <= 0.85 { return true; }
    if tokens.len() >= 6 && (repeated_bigram >= 1 || repeated_trigram >= 1) && distinct <= 0.70 {
        return avg_log_prob <= -0.03 || no_speech >= 0.05 || voiced_ratio <= 0.20 || (lang_prob > 0.0 && lang_prob <= 0.90);
    }
    false
}

fn repeated_windows(tokens: &[String], window_size: usize) -> usize {
    if window_size == 0 || tokens.len() < window_size * 2 { return 0; }
    let mut seen = HashSet::new();
    let mut repeated = 0;
    for start in 0..=tokens.len() - window_size {
        let key = tokens[start..start + window_size].join(" ");
        if !seen.insert(key) { repeated += 1; }
    }
    repeated
}

fn distinct_ratio(tokens: &[String]) -> f32 {
    if tokens.is_empty() { return 0.0; }
    let set = tokens.iter().collect::<HashSet<_>>();
    set.len() as f32 / tokens.len() as f32
}
