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

#[derive(Debug, Clone, Deserialize)]
struct RuntimeModelManifest {
    asr: RuntimeAsrModels,
    translation: RuntimeTranslationModels,
    tts: RuntimeTts,
    cuda: RuntimeCuda,
}

#[derive(Debug, Clone, Deserialize)]
struct RuntimeAsrModels {
    primary: RuntimeModelEntry,
    backup: RuntimeModelEntry,
}

#[derive(Debug, Clone, Deserialize)]
struct RuntimeTranslationModels {
    primary: RuntimeModelEntry,
    fallback: RuntimeModelEntry,
}

#[derive(Debug, Clone, Deserialize)]
struct RuntimeModelEntry {
    ready: bool,
}

#[derive(Debug, Clone, Deserialize)]
struct RuntimeTts {
    default_sapi_ready: bool,
    voice_actor_ready: bool,
    voice_actor_path: Option<String>,
    #[serde(default)]
    blockers: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct RuntimeCuda {
    torch_cuda_available: bool,
    ctranslate2_cuda_available: bool,
}

pub fn analyze_local_worker_manifest() -> LocalWorkerManifestReport {
    let project_paths = ProjectPaths::discover();
    let root = PathBuf::from(&project_paths.project_root);
    let worker_root = root.join("EngineData").join("LauncherApp").join("Workers");
    let worker_script = worker_root.join("realtime_local_worker.py");
    let requirements = worker_root.join("requirements-realtime.txt");
    let stack_manifest = worker_root.join("realtime_stack_manifest.json");
    let runtime_manifest = PathBuf::from(&project_paths.backend_contract_dir)
        .join("MODEL_RUNTIME_MANIFEST.json");
    let asr_model = PathBuf::from(&project_paths.asr_model_dir)
        .join("faster-whisper-large-v3-turbo");
    let asr_backup_model = PathBuf::from(&project_paths.asr_model_dir)
        .join("faster-whisper-medium");
    let realtime_translation_model = PathBuf::from(&project_paths.translation_model_dir)
        .join("marianmt-id-en");
    let quality_translation_model = PathBuf::from(&project_paths.translation_model_dir)
        .join("nllb-200-distilled-600M");
    let piper_root = PathBuf::from(&project_paths.voice_runtime_dir).join("Piper");

    let worker_script_exists = worker_script.is_file();
    let requirements_exists = requirements.is_file();
    let stack_manifest_exists = stack_manifest.is_file();
    let runtime_manifest_exists = runtime_manifest.is_file();
    let stack = read_stack_manifest(&stack_manifest);
    let runtime_models = read_runtime_model_manifest(&runtime_manifest);
    let runtime_manifest_valid = runtime_models.is_some();
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
    let asr_model_ready = asr_markers_ready(&asr_model)
        && runtime_models
            .as_ref()
            .map(|value| value.asr.primary.ready)
            .unwrap_or(false);
    let asr_backup_model_ready = asr_markers_ready(&asr_backup_model)
        && runtime_models
            .as_ref()
            .map(|value| value.asr.backup.ready)
            .unwrap_or(false);
    let realtime_translation_model_ready = marian_markers_ready(&realtime_translation_model)
        && runtime_models
            .as_ref()
            .map(|value| value.translation.fallback.ready)
            .unwrap_or(false);
    let quality_translation_model_ready = nllb_markers_ready(&quality_translation_model)
        && runtime_models
            .as_ref()
            .map(|value| value.translation.primary.ready)
            .unwrap_or(false);
    let piper_ready = piper_root.is_dir() && has_onnx_voice(&piper_root);
    let sapi_ready = runtime_models
        .as_ref()
        .map(|value| value.tts.default_sapi_ready)
        .unwrap_or(false);
    let tts_default_ready = piper_ready || sapi_ready;
    let voice_actor_marcel_ready = runtime_models
        .as_ref()
        .map(|value| value.tts.voice_actor_ready)
        .unwrap_or(false);
    let voice_actor_path = runtime_models
        .as_ref()
        .and_then(|value| value.tts.voice_actor_path.clone());
    let torch_cuda_available = runtime_models
        .as_ref()
        .map(|value| value.cuda.torch_cuda_available)
        .unwrap_or(false);
    let ctranslate2_cuda_available = runtime_models
        .as_ref()
        .map(|value| value.cuda.ctranslate2_cuda_available)
        .unwrap_or(false);
    let tts_blockers = runtime_models
        .as_ref()
        .map(|value| value.tts.blockers.clone())
        .unwrap_or_else(|| vec!["runtime_model_manifest_missing_or_invalid".to_string()]);

    let mut blockers = Vec::new();
    let mut warnings = Vec::new();
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
    if !runtime_manifest_exists {
        blockers.push("model:runtime_manifest_missing".to_string());
    } else if !runtime_manifest_valid {
        blockers.push("model:runtime_manifest_invalid_json".to_string());
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
    if !asr_backup_model_ready {
        blockers.push("model:faster_whisper_medium_missing".to_string());
    }
    if !realtime_translation_model_ready {
        blockers.push("model:marianmt_id_en_missing".to_string());
    }
    if !quality_translation_model_ready {
        blockers.push("model:nllb_quality_model_missing".to_string());
    }
    if !tts_default_ready {
        blockers.push("tts:no_local_provider_available".to_string());
    }
    if !voice_actor_marcel_ready {
        warnings.push("voice_actor_marcel_missing".to_string());
    }
    if !torch_cuda_available {
        warnings.push("cuda:torch_cpu_only".to_string());
    }
    if !ctranslate2_cuda_available {
        warnings.push("cuda:ctranslate2_model_load_failed".to_string());
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
        runtime_manifest_path: normalize(&runtime_manifest),
        runtime_manifest_exists,
        runtime_manifest_valid,
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
        sapi_ready,
        tts_default_ready,
        voice_actor_marcel_ready,
        voice_actor_path,
        torch_cuda_available,
        ctranslate2_cuda_available,
        preferred_stack: "Realtime: Faster Whisper Large V3 Turbo + MarianMT ID-EN + Piper or Windows SAPI. Quality: Faster Whisper Large V3 Turbo + NLLB 600M + Piper or Windows SAPI.".to_string(),
        blockers,
        warnings,
        tts_blockers,
        note: if ok {
            "Project-local runtime assets passed marker and load-manifest checks. Default local TTS is available; custom voice and CUDA warnings remain separate from internal CPU/SAPI readiness.".to_string()
        } else {
            "Local realtime worker is incomplete. A model is ready only when required files exist and EngineData/Backend/RuntimeContracts/MODEL_RUNTIME_MANIFEST.json records a successful local load.".to_string()
        },
    }
}

fn read_stack_manifest(path: &Path) -> Option<StackManifest> {
    let text = fs::read_to_string(path).ok()?;
    serde_json::from_str::<StackManifest>(&text).ok()
}

fn read_runtime_model_manifest(path: &Path) -> Option<RuntimeModelManifest> {
    let text = fs::read_to_string(path).ok()?;
    serde_json::from_str::<RuntimeModelManifest>(&text).ok()
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
