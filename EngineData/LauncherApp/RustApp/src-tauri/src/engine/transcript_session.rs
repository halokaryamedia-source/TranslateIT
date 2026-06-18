use serde::{Deserialize, Serialize};
use std::path::{Component, Path, PathBuf};

use crate::engine::session_store::{preview_transcript_session_save, SessionSavePreview};
use crate::engine::transcript::TranscriptSegmentRecord;

const MAX_PATH_SEGMENT_CHARS: usize = 96;
const MAX_EXTENSION_CHARS: usize = 12;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptSessionRecord {
    pub session_id: String,
    pub input_language: String,
    pub output_language: String,
    pub asr_model: String,
    pub translation_engine: String,
    pub created_at_iso: String,
    pub segments: Vec<TranscriptSegmentRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptSessionPlanRequest {
    pub session: TranscriptSessionRecord,
    pub cache_root: Option<String>,
    pub saved_root: Option<String>,
    pub copy_audio: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct TranscriptSessionPathPlan {
    pub cache_session_dir: String,
    pub cache_audio_dir: String,
    pub cache_session_json_path: String,
    pub saved_session_dir: String,
    pub saved_session_json_path: String,
    pub planned_cache_items: Vec<String>,
    pub planned_save_items: Vec<String>,
    pub guard_blockers: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TranscriptSessionSummary {
    pub session_id: String,
    pub segment_count: usize,
    pub source_language: String,
    pub target_language: String,
    pub source_chars: usize,
    pub translated_chars: usize,
    pub completed_segments: usize,
    pub errored_segments: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct TranscriptSessionPlanReport {
    pub summary: TranscriptSessionSummary,
    pub paths: TranscriptSessionPathPlan,
    pub store_preview: SessionSavePreview,
    pub ready_to_save: bool,
    pub message: String,
}

impl Default for TranscriptSessionRecord {
    fn default() -> Self {
        Self {
            session_id: String::new(),
            input_language: "id".to_string(),
            output_language: "en".to_string(),
            asr_model: "large-v3-turbo".to_string(),
            translation_engine: "local-nllb-distilled".to_string(),
            created_at_iso: String::new(),
            segments: Vec::new(),
        }
    }
}

impl TranscriptSessionRecord {
    pub fn segment_count(&self) -> usize {
        self.segments.len()
    }

    pub fn add_segment(&mut self, segment: TranscriptSegmentRecord) {
        self.segments.push(segment);
    }

    pub fn summary(&self) -> TranscriptSessionSummary {
        summarize_transcript_session(self)
    }
}

pub fn append_segment_to_session(
    mut session: TranscriptSessionRecord,
    segment: TranscriptSegmentRecord,
) -> TranscriptSessionRecord {
    session.add_segment(segment);
    session
}

pub fn summarize_transcript_session(session: &TranscriptSessionRecord) -> TranscriptSessionSummary {
    let source_chars = session
        .segments
        .iter()
        .map(|segment| segment.input_text.chars().count())
        .sum();
    let translated_chars = session
        .segments
        .iter()
        .map(|segment| segment.translated_text.chars().count())
        .sum();
    let completed_segments = session.segments.iter().filter(|segment| segment.accepted()).count();
    let errored_segments = session
        .segments
        .iter()
        .filter(|segment| !segment.error_message.trim().is_empty())
        .count();

    TranscriptSessionSummary {
        session_id: safe_path_segment(&session.session_id, "session"),
        segment_count: session.segment_count(),
        source_language: session.input_language.clone(),
        target_language: session.output_language.clone(),
        source_chars,
        translated_chars,
        completed_segments,
        errored_segments,
    }
}

pub fn plan_transcript_session_paths(request: TranscriptSessionPlanRequest) -> TranscriptSessionPlanReport {
    let summary = summarize_transcript_session(&request.session);
    let store_preview = preview_transcript_session_save(&request.session);
    let cache_root = request.cache_root.unwrap_or_default();
    let saved_root = request.saved_root.unwrap_or_default();
    let session_id = safe_path_segment(&request.session.session_id, "session");
    let cache_session_dir = join_path(&cache_root, &["session_cache", &session_id]);
    let cache_audio_dir = join_path(&cache_root, &["audio_segments"]);
    let cache_session_json_path = join_path(&cache_session_dir, &[&format!("{}.json", session_id)]);
    let saved_session_dir = join_path(&saved_root, &["SavedTranscript", &session_id]);
    let saved_session_json_path = join_path(&saved_session_dir, &[&format!("{}.json", session_id)]);

    let mut guard_blockers = Vec::new();
    guard_path("cache_root", &cache_root, &cache_session_json_path, &mut guard_blockers);
    guard_path("saved_root", &saved_root, &saved_session_json_path, &mut guard_blockers);

    let mut planned_cache_items = vec![cache_session_json_path.clone()];
    for segment in &request.session.segments {
        let segment_id = safe_path_segment(&segment.segment_id, "segment");
        planned_cache_items.push(join_path(&cache_audio_dir, &[&format!("{}.wav", segment_id)]));
    }

    let mut planned_save_items = vec![saved_session_json_path.clone()];
    if request.copy_audio {
        for segment in &request.session.segments {
            if let Some(path) = &segment.replay.source_audio_path {
                if !path.trim().is_empty() {
                    planned_save_items.push(join_path(&saved_session_dir, &["audio", &saved_audio_filename(&segment.segment_id, path, "source")]));
                }
            }
            if let Some(path) = &segment.replay.translated_audio_path {
                if !path.trim().is_empty() {
                    planned_save_items.push(join_path(&saved_session_dir, &["audio", &saved_audio_filename(&segment.segment_id, path, "translated")]));
                }
            }
        }
    }

    let paths = TranscriptSessionPathPlan {
        cache_session_dir,
        cache_audio_dir,
        cache_session_json_path,
        saved_session_dir,
        saved_session_json_path,
        planned_cache_items,
        planned_save_items,
        guard_blockers,
    };
    let ready_to_save = !paths.saved_session_json_path.trim().is_empty()
        && paths.guard_blockers.is_empty()
        && store_preview.ready;
    let message = if ready_to_save {
        "Transcript session path plan and store preview are ready.".to_string()
    } else {
        "Transcript session save preview is blocked by missing or unsafe path planning.".to_string()
    };

    TranscriptSessionPlanReport {
        summary,
        paths,
        store_preview,
        ready_to_save,
        message,
    }
}

fn join_path(root: &str, parts: &[&str]) -> String {
    let mut path = PathBuf::from(root);
    for part in parts {
        path.push(part);
    }
    normalize_path(&path)
}

fn guard_path(label: &str, root: &str, target: &str, blockers: &mut Vec<String>) {
    if root.trim().is_empty() {
        blockers.push(format!("{label}:missing_root"));
        return;
    }
    if has_unsafe_component(root) || has_unsafe_component(target) {
        blockers.push(format!("{label}:unsafe_path_component"));
        return;
    }
    let normalized_root = normalize_path(Path::new(root));
    let normalized_target = normalize_path(Path::new(target));
    if !normalized_target.starts_with(&normalized_root) {
        blockers.push(format!("{label}:target_outside_root"));
    }
}

fn has_unsafe_component(value: &str) -> bool {
    Path::new(value).components().any(|component| matches!(component, Component::ParentDir))
}

fn safe_path_segment(value: &str, fallback: &str) -> String {
    let clean = value
        .trim()
        .chars()
        .map(|character| if character.is_ascii_alphanumeric() || matches!(character, '-' | '_') { character } else { '_' })
        .take(MAX_PATH_SEGMENT_CHARS)
        .collect::<String>();
    if clean.is_empty() { fallback.to_string() } else { clean }
}

fn safe_extension(source_path: &str) -> String {
    let extension = Path::new(source_path)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("wav")
        .trim()
        .chars()
        .filter(|character| character.is_ascii_alphanumeric())
        .take(MAX_EXTENSION_CHARS)
        .collect::<String>();
    if extension.is_empty() { "wav".to_string() } else { extension }
}

fn saved_audio_filename(segment_id: &str, source_path: &str, role: &str) -> String {
    let segment = safe_path_segment(segment_id, "segment");
    let role = safe_path_segment(role, "audio");
    let extension = safe_extension(source_path);
    format!("{segment}-{role}.{extension}")
}

fn normalize_path(path: &Path) -> String {
    path.to_string_lossy().replace(char::from(92), "/")
}
