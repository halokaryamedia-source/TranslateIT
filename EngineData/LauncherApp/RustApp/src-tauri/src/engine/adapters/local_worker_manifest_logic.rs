use serde::Serialize;
use std::path::{Path, PathBuf};

use crate::engine::paths::ProjectPaths;

#[derive(Debug, Clone, Serialize)]
pub struct LocalWorkerManifestReport {
    pub ok: bool,
    pub worker_script_path: String,
    pub worker_script_exists: bool,
    pub asr_model_path: String,
    pub asr_model_ready: bool,
    pub realtime_translation_model_path: String,
    pub realtime_translation_model_ready: bool,
    pub quality_translation_model_path: String,
    pub quality_translation_model_ready: bool,
    pub piper_root_path: String,
    pub piper_ready: bool,
    pub preferred_stack: String,
    pub blockers: Vec<String>,
    pub note: String,
}

pub fn analyze_local_worker_manifest() -> LocalWorkerManifestReport {
    let project_paths = ProjectPaths::discover();
    let root = PathBuf::from(&project_paths.project_root);
    let worker_script = root
        .join("EngineData")
        .join("LauncherApp")
        .join("Workers")
        .join("realtime_local_worker.py");
    let asr_model = root
        .join("EngineData")
        .join("TranscriptEngine")
        .join("ModelData")
        .join("faster-whisper-large-v3-turbo");
    let realtime_translation_model = root
        .join("EngineData")
        .join("TranslateEngine")
        .join("ModelData")
        .join("marianmt-id-en");
    let quality_translation_model = root
        .join("EngineData")
        .join("TranslateEngine")
        .join("ModelData")
        .join("nllb-200-distilled-600M");
    let piper_root = root
        .join("EngineData")
        .join("VoiceEngine")
        .join("Piper");

    let worker_script_exists = worker_script.is_file();
    let asr_model_ready = asr_model.join("model.bin").is_file();
    let realtime_translation_model_ready = realtime_translation_model.is_dir();
    let quality_translation_model_ready = quality_translation_model.is_dir();
    let piper_ready = piper_root.is_dir() && has_onnx_voice(&piper_root);

    let mut blockers = Vec::new();
    if !worker_script_exists {
        blockers.push("local_worker:script_missing".to_string());
    }
    if !asr_model_ready {
        blockers.push("model:faster_whisper_large_v3_turbo_missing".to_string());
    }
    if !realtime_translation_model_ready {
        blockers.push("model:marianmt_id_en_missing".to_string());
    }
    if !quality_translation_model_ready {
        blockers.push("model:nllb_quality_model_missing".to_string());
    }
    if !piper_ready {
        blockers.push("model:piper_voice_missing".to_string());
    }

    let ok = blockers.is_empty();
    LocalWorkerManifestReport {
        ok,
        worker_script_path: normalize(&worker_script),
        worker_script_exists,
        asr_model_path: normalize(&asr_model),
        asr_model_ready,
        realtime_translation_model_path: normalize(&realtime_translation_model),
        realtime_translation_model_ready,
        quality_translation_model_path: normalize(&quality_translation_model),
        quality_translation_model_ready,
        piper_root_path: normalize(&piper_root),
        piper_ready,
        preferred_stack: "Realtime: Faster Whisper Large V3 Turbo + MarianMT ID-EN + Piper. Quality: Faster Whisper Large V3 Turbo + NLLB 600M + Piper.".to_string(),
        blockers,
        note: if ok {
            "Local realtime worker manifest is ready for dependency and runtime preload validation.".to_string()
        } else {
            "Local realtime worker manifest is incomplete. Missing local model or worker assets must be installed before real inference can run.".to_string()
        },
    }
}

fn has_onnx_voice(root: &Path) -> bool {
    std::fs::read_dir(root)
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
