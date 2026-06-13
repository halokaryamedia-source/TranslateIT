use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AsrProfileRequest {
    pub primary_model: Option<String>,
    pub backup_model: Option<String>,
    pub model_root: Option<String>,
    pub device: Option<String>,
    pub compute_type: Option<String>,
    pub language: Option<String>,
    pub task: Option<String>,
    pub temperature: Option<i32>,
    pub beam_size: Option<i32>,
    pub condition_on_previous_text: Option<bool>,
    pub vad_filter: Option<bool>,
    pub word_timestamps: Option<bool>,
    pub initial_prompt: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AsrRuntimeProfileReport {
    pub model_name: String,
    pub performance_mode: bool,
    pub device: String,
    pub compute_type: String,
    pub language: String,
    pub task: String,
    pub temperature: i32,
    pub beam_size: i32,
    pub best_of: i32,
    pub condition_on_previous_text: bool,
    pub vad_filter: bool,
    pub word_timestamps: bool,
    pub initial_prompt: String,
    pub local_model_path: Option<String>,
    pub dependency_status: String,
    pub model_ready: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct AsrProfilePlan {
    pub default_profile: AsrRuntimeProfileReport,
    pub backup_profile: AsrRuntimeProfileReport,
    pub selected_model: String,
    pub fallback_used: bool,
    pub ready_for_native_execution: bool,
}

pub fn build_asr_profile_plan(request: AsrProfileRequest) -> AsrProfilePlan {
    let primary = request.primary_model.clone().unwrap_or_else(|| "large-v3-turbo".to_string());
    let backup = request.backup_model.clone().unwrap_or_else(|| "medium".to_string());
    let default_profile = profile(&request, &primary, false);
    let backup_profile = profile(&request, &backup, true);
    let selected_model = if default_profile.model_ready { default_profile.model_name.clone() } else { backup_profile.model_name.clone() };
    let fallback_used = !default_profile.model_ready && backup_profile.model_ready;
    let ready_for_native_execution = default_profile.model_ready || backup_profile.model_ready;
    AsrProfilePlan {
        default_profile,
        backup_profile,
        selected_model,
        fallback_used,
        ready_for_native_execution,
    }
}

fn profile(request: &AsrProfileRequest, model_name: &str, performance_mode: bool) -> AsrRuntimeProfileReport {
    let device = request.device.clone().unwrap_or_else(|| "cuda".to_string());
    let compute_type = request.compute_type.clone().unwrap_or_else(|| "float16".to_string());
    let language = normalize_language(request.language.as_deref().unwrap_or("id"));
    let task = request.task.clone().unwrap_or_else(|| "transcribe".to_string());
    let initial_prompt = request.initial_prompt.clone().filter(|value| !value.trim().is_empty()).unwrap_or_else(default_initial_prompt);
    let local_model_path = local_model_path(request.model_root.as_deref(), model_name);
    let model_ready = local_model_path.is_some();
    AsrRuntimeProfileReport {
        model_name: model_name.to_string(),
        performance_mode,
        device: device.clone(),
        compute_type: compute_type.clone(),
        language,
        task,
        temperature: request.temperature.unwrap_or(0),
        beam_size: request.beam_size.unwrap_or(1),
        best_of: 1,
        condition_on_previous_text: request.condition_on_previous_text.unwrap_or(false),
        vad_filter: request.vad_filter.unwrap_or(false),
        word_timestamps: request.word_timestamps.unwrap_or(false),
        initial_prompt,
        local_model_path: local_model_path.clone(),
        dependency_status: if model_ready { "available".to_string() } else { "pending:native-model-files".to_string() },
        model_ready,
        message: if model_ready { format!("ASR model files found for {model_name} on {device}/{compute_type}.") } else { format!("ASR model files are not available for {model_name}.") },
    }
}

fn local_model_path(model_root: Option<&str>, model_name: &str) -> Option<String> {
    let root = model_root?.trim();
    if root.is_empty() { return None; }
    let local_name = match model_name {
        "large-v3-turbo" => "faster-whisper-large-v3-turbo",
        "medium" => "faster-whisper-medium",
        other => other,
    };
    let path = Path::new(root).join(local_name);
    if path.join("model.bin").is_file() { Some(path.to_string_lossy().replace('\\', "/")) } else { None }
}

fn normalize_language(value: &str) -> String {
    let lowered = value.trim().to_lowercase();
    if lowered.starts_with("ind") || lowered.starts_with("id") { "id".to_string() } else if lowered.starts_with("eng") || lowered.starts_with("en") { "en".to_string() } else if lowered.is_empty() { "id".to_string() } else { lowered.chars().take(2).collect() }
}

fn default_initial_prompt() -> String {
    "Live bilingual speech in Indonesian and English. Indonesian is the primary spoken language. Transcribe exactly what was spoken, not a paraphrase or translation. Preserve short Indonesian phrases, filler words, names of people and places. Keep natural code-switching, numbers, and simple conversational words. For very short Indonesian utterances, preserve the exact Indonesian words and do not rewrite them in English.".to_string()
}
