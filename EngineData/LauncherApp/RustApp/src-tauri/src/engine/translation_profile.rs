pub fn normalize_language(value: &str, fallback: &str) -> String {
    let text = value.trim().to_lowercase();
    if text.starts_with("ind") || text == "id" {
        return "id".to_string();
    }
    if text.starts_with("eng") || text == "en" {
        return "en".to_string();
    }
    if text.is_empty() {
        fallback.to_string()
    } else {
        text.chars().take(2).collect()
    }
}

pub fn realtime_direction_supported(source_language: &str, target_language: &str) -> bool {
    normalize_language(source_language, "id") == "id" && normalize_language(target_language, "en") == "en"
}

pub fn preferred_profile_order(primary_mode: &str, source_language: &str, target_language: &str) -> Vec<&'static str> {
    let realtime_supported = realtime_direction_supported(source_language, target_language);
    if primary_mode.eq_ignore_ascii_case("Quality") || !realtime_supported {
        if realtime_supported {
            vec!["Quality", "Realtime"]
        } else {
            vec!["Quality"]
        }
    } else {
        vec!["Realtime", "Quality"]
    }
}
