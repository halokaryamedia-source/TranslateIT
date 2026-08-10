use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

use crate::engine::paths::ProjectPaths;

#[derive(Debug, Clone, Serialize)]
pub struct LocalWorkerManifestReport {
    pub ok: bool,
    pub worker_script_path: String,
    pub worker_script_exists: bool,
    pub python_project_path: String,
    pub python_project_exists: bool,
    pub model_manifest_path: String,
    pub model_manifest_exists: bool,
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
    pub blockers: Vec<String>,
    pub warnings: Vec<String>,
    pub tts_blockers: Vec<String>,
    pub note: String,
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
    let python_project = worker_root.join("pyproject.toml");
    let model_manifest = worker_root.join("model_manifest.json");
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
    let python_project_exists = python_project.is_file();
    let model_manifest_exists = model_manifest.is_file();
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
    if !python_project_exists {
        blockers.push("local_worker:python_project_missing".to_string());
    }
    if !model_manifest_exists {
        blockers.push("local_worker:model_manifest_missing".to_string());
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
    if !worker_root.join("uv.lock").is_file() {
        warnings.push("local_worker:uv_lock_not_verified_or_committed".to_string());
    }

    let ok = blockers.is_empty();
    LocalWorkerManifestReport {
        ok,
        worker_script_path: normalize(&worker_script),
        worker_script_exists,
        python_project_path: normalize(&python_project),
        python_project_exists,
        model_manifest_path: normalize(&model_manifest),
        model_manifest_exists,
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
        blockers,
        warnings,
        tts_blockers: Vec::new(),
        note: if ok {
            "Required worker source, canonical pyproject.toml, model inventory, and primary model asset markers are present. This remains static installation evidence only; uv.lock, imports, model load, SAPI, CUDA, inference, latency, and product readiness require separate proof."
                .to_string()
        } else {
            "Static WorkerRuntime installation evidence is incomplete. Runtime capability must still come from the persistent worker after these source/install blockers are resolved."
                .to_string()
        },
    }
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
