use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationContextRequest {
    pub window_size: usize,
    pub existing_segments: Vec<String>,
    pub new_segments: Vec<String>,
    pub clear_first: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct TranslationContextReport {
    pub window_size: usize,
    pub accepted_segments: Vec<String>,
    pub dropped_count: usize,
}

pub fn update_translation_context(request: TranslationContextRequest) -> TranslationContextReport {
    if request.window_size == 0 {
        return TranslationContextReport {
            window_size: 0,
            accepted_segments: Vec::new(),
            dropped_count: request.existing_segments.len() + request.new_segments.len(),
        };
    }
    let existing_segment_count = request.existing_segments.len();
    let mut window = if request.clear_first { Vec::new() } else { clean_segments(request.existing_segments) };
    let before_push_len = window.len();
    for item in request.new_segments {
        let text = item.trim();
        if !text.is_empty() {
            window.push(text.to_string());
        }
    }
    let total_after_push = window.len();
    let dropped_count = total_after_push.saturating_sub(request.window_size) + existing_segment_count.saturating_sub(before_push_len);
    if window.len() > request.window_size {
        let start = window.len() - request.window_size;
        window = window[start..].to_vec();
    }
    TranslationContextReport {
        window_size: request.window_size,
        accepted_segments: window,
        dropped_count,
    }
}

fn clean_segments(segments: Vec<String>) -> Vec<String> {
    segments.into_iter().map(|item| item.trim().to_string()).filter(|item| !item.is_empty()).collect()
}
