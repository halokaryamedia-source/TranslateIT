use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

use crate::engine::paths::ProjectPaths;

#[derive(Debug, Clone, Serialize)]
pub struct LocalWorkerManifestReport {
    pub ok: bool,
    pub worker_script_path: String,
    pub worker_script_exists: bool,
    pub requirements_path: String,
    pub requirements_exists: bool,
    pub stack_manifest_path: String,
    pub stack_manifest_exists: bool,
    pub stack_manifest_schema: Option<String>,
    pub runtime_manifest_path: String,
    pub runtime_manifest_exists: bool,
    pub runtime_manifest_valid: bool,
    pub realtime_target_latency_ms: Option<u32>,
    pub quality_target_latency_ms: Option<u32>,
    pub worker_command_count: usize,
    pub asr_model_path: String,
    pub asr_model_ready: bool,
    pub asr_backup_model_path: String,
    pub asr_backup_model_ready: bool,
    pub realtime_translation_model_path: String,
    pub realtime_translation_model_ready: bool,
    pub quality_translation_model_path: String,
    pub quality_translation_model_ready: bool,
    pub piper_root_path: String,
    pub piper_ready: bool,
    pub sapi_ready: bool,
    pub tts_default_ready: bool,
    pub voice_actor_marcel_ready: bool,
    pub voice_actor_path: Option<String>,
    pub torch_cuda_available: bool,
    pub ctranslate2_cuda_available: bool,
    pub preferred_stack: String,
    pub blockers: Vec<String>,
    pub warnings: Vec<String>,
    pub tts_blockers: Vec<String>,
    pub note: String,
}

#[derive(Debug, Clone, Deserialize)]
struct StackManifest {
    schema: Option<String>,
    modes: Option<StackModes>,
    worker_commands: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize)]
struct StackModes {
    #[serde(rename = "Realtime")]
    realtime: Option<StackMode>,
    #[serde(rename = "Quality")]
    quality: Option<StackMode>,
}

#[derive(Debug, Clone, Deserialize)]
struct StackMode {
    target_latency_ms: Option<u32>,
}

pub fn analyze_local_worker_manifest() -> LocalWorkerManifestReport {
    let project_paths = ProjectPaths::discover();
    let root = PathBuf::from(&project_paths.project_root);
    let worker_root = root
        .join("EngineData")
        .join("Backend")
        .join("LocalWorker")
        .join("WorkerRuntime");
    let worker_script = worker_root.join("realtime_local_worker.py");
    let requirements = worker_root.join("requirements-realtime.txt");
    let stack_manifest = worker_root.join("realtime_stack_manifest.json");
    let asr_model =
        PathBuf::from(&project_paths.asr_model_dir).join("faster-whisper-large-v3-turbo");
    let asr_backup_model =
        PathBuf::from(&project_paths.asr_model_dir).join("faster-whisper-medium");
    let realtime_translation_model =
        PathBuf::from(&project_paths.translation_model_dir).join("marianmt-id-en");
    let quality_translation_model =
        PathBuf::from(&project_paths.translation_model_dir).join("nllb-200-distilled-600M");
    let piper_root = PathBuf::from(&project_paths.voice_runtime_dir).join("Piper");

    let worker_script_exists = worker_script.is_file();
    let requirements_exists = requirements.is_file();
    let stack_manifest_exists = stack_manifest.is_file();
    let stack = read_stack_manifest(&stack_manifest);
    let stack_manifest_schema = stack.as_ref().and_then(|value| value.schema.clone());
    let realtime_target_latency_ms = stack
        .as_ref()
        .and_then(|value| value.modes.as_ref())
        .and_then(|modes| modes.realtime.as_ref())
        .and_then(|mode| mode.target_latency_ms);
    let quality_target_latency_ms = stack
        .as_ref()
        .and_then(|value| value.modes.as_ref())
        .and_then(|modes| modes.quality.as_ref())
        .and_then(|mode| mode.target_latency_ms);
    let worker_command_count = stack
        .as_ref()
        .and_then(|value| value.worker_commands.as_ref())
        .and_then(|value| value.as_object())
        .map(|value| value.len())
        .unwrap_or(0);

    let asr_model_ready = asr_markers_ready(&asr_model);
    let asr_backup_model_ready = asr_markers_ready(&asr_backup_model);
    let realtime_translation_model_ready = marian_markers_ready(&realtime_translation_model);
    let quality_translation_model_ready = nllb_markers_ready(&quality_translation_model);
    let piper_ready = piper_root.is_dir() && has_onnx_voice(&piper_root);

    let mut blockers = Vec::new();
    let mut warnings = Vec::new();
    if !worker_script_exists {
        blockers.push("local_worker:script_missing".to_string());
    }
    if !requirements_exists {
        blockers.push("local_worker:requirements_missing".to_string());
    }
    if !stack_manifest_exists {
        warnings.push("local_worker:stack_manifest_missing".to_string());
    } else if stack.is_none() {
        warnings.push("local_worker:stack_manifest_invalid_json".to_string());
    }
    if !asr_model_ready {
        blockers.push("model:faster_whisper_large_v3_turbo_missing".to_string());
    }
    if !realtime_translation_model_ready {
        blockers.push("model:marianmt_id_en_missing".to_string());
    }
    if !asr_backup_model_ready {
        warnings.push("model:faster_whisper_medium_optional_missing".to_string());
    }
    if !quality_translation_model_ready {
        warnings.push("model:nllb_quality_optional_missing".to_string());
    }
    if !piper_ready {
        warnings.push("tts:piper_optional_missing_runtime_sapi_not_checked_here".to_string());
    }

    let ok = blockers.is_empty();
    LocalWorkerManifestReport {
        ok,
        worker_script_path: normalize(&worker_script),
        worker_script_exists,
        requirements_path: normalize(&requirements),
        requirements_exists,
        stack_manifest_path: normalize(&stack_manifest),
        stack_manifest_exists,
        stack_manifest_schema,
        // Compatibility fields retained while Diagnostics consumers are reconciled.
        // The previous MODEL_RUNTIME_MANIFEST snapshot is intentionally retired and
        // never consulted as current runtime truth.
        runtime_manifest_path: "retired:MODEL_RUNTIME_MANIFEST.json".to_string(),
        runtime_manifest_exists: false,
        runtime_manifest_valid: false,
        realtime_target_latency_ms,
        quality_target_latency_ms,
        worker_command_count,
        asr_model_path: normalize(&asr_model),
        asr_model_ready,
        asr_backup_model_path: normalize(&asr_backup_model),
        asr_backup_model_ready,
        realtime_translation_model_path: normalize(&realtime_translation_model),
        realtime_translation_model_ready,
        quality_translation_model_path: normalize(&quality_translation_model),
        quality_translation_model_ready,
        piper_root_path: normalize(&piper_root),
        piper_ready,
        // These are runtime capabilities and cannot be proven by this static source
        // inventory. Current worker status is their authority.
        sapi_ready: false,
        tts_default_ready: piper_ready,
        voice_actor_marcel_ready: false,
        voice_actor_path: None,
        torch_cuda_available: false,
        ctranslate2_cuda_available: false,
        preferred_stack: "Static install/source inspection only. Active ASR/translation/TTS/device capability comes from persistent worker status."
            .to_string(),
        blockers,
        warnings,
        tts_blockers: Vec::new(),
        note: if ok {
            "Required worker source and primary model asset markers are present. This report is static installation evidence only; it does not prove imports, model load, SAPI, CUDA, inference, latency, or product readiness."
                .to_string()
        } else {
            "Static worker installation evidence is incomplete. Runtime capability must still come from the persistent worker even after these blockers are resolved."
                .to_string()
        },
    }
}

fn read_stack_manifest(path: &Path) -> Option<StackManifest> {
    let text = fs::read_to_string(path).ok()?;
    serde_json::from_str::<StackManifest>(&text).ok()
}

fn asr_markers_ready(root: &Path) -> bool {
    root.join("model.bin").is_file()
        && root.join("config.json").is_file()
        && has_any_named_file(
            root,
            &["tokenizer.json", "tokenizer.model", "vocabulary.json"],
        )
}

fn marian_markers_ready(root: &Path) -> bool {
    root.join("config.json").is_file()
        && has_any_named_file(root, &["source.spm", "tokenizer.json", "spiece.model"])
        && has_any_named_file(root, &["target.spm", "tokenizer.json", "spiece.model"])
        && has_model_weights(root)
}

fn nllb_markers_ready(root: &Path) -> bool {
    root.join("config.json").is_file()
        && root.join("tokenizer_config.json").is_file()
        && has_any_named_file(
            root,
            &["sentencepiece.bpe.model", "tokenizer.json", "spiece.model"],
        )
        && has_model_weights(root)
}

fn has_any_named_file(root: &Path, names: &[&str]) -> bool {
    names.iter().any(|name| root.join(name).is_file())
}

fn has_model_weights(root: &Path) -> bool {
    fs::read_dir(root)
        .ok()
        .map(|entries| {
            entries.filter_map(Result::ok).any(|entry| {
                let name = entry.file_name().to_string_lossy().to_ascii_lowercase();
                entry.path().is_file()
                    && (name.ends_with(".safetensors")
                        || (name.starts_with("pytorch_model") && name.ends_with(".bin")))
            })
        })
        .unwrap_or(false)
}

fn has_onnx_voice(root: &Path) -> bool {
    fs::read_dir(root)
        .ok()
        .map(|entries| {
            entries.filter_map(Result::ok).any(|entry| {
                let path = entry.path();
                path.extension()
                    .and_then(|value| value.to_str())
                    .map(|ext| ext.eq_ignore_ascii_case("onnx"))
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false)
}

fn normalize(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}
