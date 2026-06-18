use serde::{Deserialize, Serialize};

const MAX_CONTEXT_WINDOW_SIZE: usize = 64;
const MAX_CONTEXT_SEGMENT_CHARS: usize = 1_000;
const MAX_CONTEXT_INPUT_SEGMENTS: usize = 256;

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
    let window_size = request.window_size.min(MAX_CONTEXT_WINDOW_SIZE);
    let existing_input_count = request.existing_segments.len();
    let new_input_count = request.new_segments.len();
    if window_size == 0 {
        return TranslationContextReport {
            window_size: 0,
            accepted_segments: Vec::new(),
            dropped_count: existing_input_count + new_input_count,
        };
    }
    let mut window = if request.clear_first {
        Vec::new()
    } else {
        clean_segments(request.existing_segments)
    };
    let before_push_len = window.len();
    for item in request
        .new_segments
        .into_iter()
        .take(MAX_CONTEXT_INPUT_SEGMENTS)
    {
        let text = clean_segment(&item);
        if !text.is_empty() {
            window.push(text);
        }
    }
    let total_after_push = window.len();
    let dropped_count = total_after_push.saturating_sub(window_size)
        + existing_input_count.saturating_sub(before_push_len)
        + new_input_count.saturating_sub(MAX_CONTEXT_INPUT_SEGMENTS);
    if window.len() > window_size {
        let start = window.len() - window_size;
        window = window[start..].to_vec();
    }
    TranslationContextReport {
        window_size,
        accepted_segments: window,
        dropped_count,
    }
}

fn is_unsafe_context_character(character: char) -> bool {
    character == '\0'
        || ('\u{0001}'..='\u{0008}').contains(&character)
        || ('\u{000b}'..='\u{001f}').contains(&character)
        || character == '\u{007f}'
        || ('\u{202a}'..='\u{202e}').contains(&character)
        || ('\u{2066}'..='\u{2069}').contains(&character)
}

fn clean_segment(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|character| !is_unsafe_context_character(*character))
        .take(MAX_CONTEXT_SEGMENT_CHARS)
        .collect::<String>()
        .trim()
        .to_string()
}

fn clean_segments(segments: Vec<String>) -> Vec<String> {
    segments
        .into_iter()
        .take(MAX_CONTEXT_INPUT_SEGMENTS)
        .map(|item| clean_segment(&item))
        .filter(|item| !item.is_empty())
        .collect()
}
