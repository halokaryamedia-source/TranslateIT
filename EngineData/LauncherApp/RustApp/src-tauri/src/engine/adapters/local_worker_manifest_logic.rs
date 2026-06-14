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
    pub realtime_target_latency_ms: Option<u32>,
    pub quality_target_latency_ms: Option<u32>,
    pub worker_command_count: usize,
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
    let worker_root = root.join("EngineData").join("LauncherApp").join("Workers");
    let worker_script = worker_root.join("realtime_local_worker.py");
    let requirements = worker_root.join("requirements-realtime.txt");
    let stack_manifest = worker_root.join("realtime_stack_manifest.json");
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
    let asr_model_ready = asr_model.join("model.bin").is_file();
    let realtime_translation_model_ready = realtime_translation_model.is_dir();
    let quality_translation_model_ready = quality_translation_model.is_dir();
    let piper_ready = piper_root.is_dir() && has_onnx_voice(&piper_root);

    let mut blockers = Vec::new();
    if !worker_script_exists {
        blockers.push("local_worker:script_missing".to_string());
    }
    if !requirements_exists {
        blockers.push("local_worker:requirements_missing".to_string());
    }
    if !stack_manifest_exists {
        blockers.push("local_worker:stack_manifest_missing".to_string());
    }
    if stack_manifest_exists && stack.is_none() {
        blockers.push("local_worker:stack_manifest_invalid_json".to_string());
    }
    if realtime_target_latency_ms.is_none() || quality_target_latency_ms.is_none() {
        blockers.push("local_worker:latency_budget_missing".to_string());
    }
    if worker_command_count < 7 {
        blockers.push("local_worker:worker_commands_incomplete".to_string());
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
        requirements_path: normalize(&requirements),
        requirements_exists,
        stack_manifest_path: normalize(&stack_manifest),
        stack_manifest_exists,
        stack_manifest_schema,
        realtime_target_latency_ms,
        quality_target_latency_ms,
        worker_command_count,
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
            "Local realtime worker manifest is incomplete. Missing local model, worker, requirements, stack manifest, latency budget, command map, or voice assets must be installed before real inference can run.".to_string()
        },
    }
}

fn read_stack_manifest(path: &Path) -> Option<StackManifest> {
    let text = fs::read_to_string(path).ok()?;
    serde_json::from_str::<StackManifest>(&text).ok()
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
