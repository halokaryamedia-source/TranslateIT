use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::path::PathBuf;

use crate::engine::adapters::runtime_status_bundle_logic::build_runtime_status_bundle;
use crate::engine::paths::ProjectPaths;
use crate::engine::runtime_settings::load_settings;

#[derive(Debug, Clone, Serialize)]
pub struct RealtimeStatusLatencyPayload {
    pub target_ms: u32,
    pub last_total_ms: Option<u32>,
    pub p50_ms: Option<u32>,
    pub sample_count: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct RealtimeStatusWorkerPayload {
    pub available: bool,
    pub device: Option<String>,
    pub fallback_active: bool,
    pub last_command: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct RealtimeStatusAssetsPayload {
    pub asr_ready: bool,
    pub translation_ready: bool,
    pub tts_ready: bool,
    pub missing: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct RealtimeStatusPayload {
    pub status: String,
    pub language_direction: String,
    pub mode: String,
    pub latency: RealtimeStatusLatencyPayload,
    pub worker: RealtimeStatusWorkerPayload,
    pub assets: RealtimeStatusAssetsPayload,
    pub message: String,
    pub evidence_path: Option<String>,
}

fn latest_audio_evidence_path() -> PathBuf {
    let project_paths = ProjectPaths::discover();
    PathBuf::from(project_paths.user_log_dir)
        .join("RustAppValidation")
        .join("latest_audio_pipeline_evidence.json")
}

fn read_latest_audio_evidence(path: &PathBuf) -> Option<Value> {
    fs::read_to_string(path)
        .ok()
        .and_then(|content| serde_json::from_str::<Value>(&content).ok())
}

fn evidence_latency_ms(evidence: &Option<Value>) -> Option<u32> {
    let payload = evidence.as_ref()?;
    ["latency_ms", "total_latency_ms", "last_total_ms"]
        .iter()
        .find_map(|key| {
            payload
                .get(*key)
                .and_then(Value::as_u64)
                .map(|value| value.min(u64::from(u32::MAX)) as u32)
        })
}

fn evidence_ok(evidence: &Option<Value>) -> bool {
    evidence
        .as_ref()
        .and_then(|payload| payload.get("ok"))
        .and_then(Value::as_bool)
        .unwrap_or(false)
}

pub fn build_realtime_status_payload() -> RealtimeStatusPayload {
    let bundle = build_runtime_status_bundle();
    let worker = &bundle.local_worker_manifest;
    let pipeline = &bundle.live_pipeline_gate;
    let next_action = bundle.next_action.clone();
    let settings = load_settings();
    let evidence_path = latest_audio_evidence_path();
    let evidence = read_latest_audio_evidence(&evidence_path);

    let worker_available = worker.worker_script_exists && worker.stack_manifest_exists;
    let fallback_active = !worker.ctranslate2_cuda_available || (worker.sapi_ready && !worker.piper_ready);
    let mut missing = worker.blockers.clone();
    for blocker in &worker.tts_blockers {
        if !missing.contains(blocker) {
            missing.push(blocker.clone());
        }
    }

    let status = if pipeline.ready_for_user_runtime {
        "ready"
    } else if evidence_ok(&evidence) && worker_available {
        "ready"
    } else if !worker_available || !missing.is_empty() {
        "partial_ready"
    } else if pipeline.progress_percent > 0 {
        "checking"
    } else {
        "idle"
    }
    .to_string();

    let message = if evidence_ok(&evidence) {
        "Latest local voice translation evidence is available.".to_string()
    } else if pipeline.ready_for_user_runtime {
        "Realtime pipeline is ready for local validation.".to_string()
    } else if !missing.is_empty() {
        format!("Realtime assets or worker checks are incomplete: {} item(s).", missing.len())
    } else {
        format!(
            "Realtime pipeline progress is {}%; next action: {}.",
            pipeline.progress_percent, next_action
        )
    };

    RealtimeStatusPayload {
        status,
        language_direction: format!(
            "{} > {}",
            settings.source_language.to_uppercase(),
            settings.target_language.to_uppercase()
        ),
        mode: settings.runtime_profile,
        latency: RealtimeStatusLatencyPayload {
            target_ms: worker.realtime_target_latency_ms.unwrap_or(1000),
            last_total_ms: evidence_latency_ms(&evidence),
            p50_ms: None,
            sample_count: if evidence_latency_ms(&evidence).is_some() { 1 } else { 0 },
        },
        worker: RealtimeStatusWorkerPayload {
            available: worker_available,
            device: Some(if worker.ctranslate2_cuda_available {
                "cuda".to_string()
            } else if worker.torch_cuda_available {
                "cuda_partial".to_string()
            } else {
                "cpu_or_unknown".to_string()
            }),
            fallback_active,
            last_command: Some(next_action),
        },
        assets: RealtimeStatusAssetsPayload {
            asr_ready: worker.asr_model_ready,
            translation_ready: worker.realtime_translation_model_ready,
            tts_ready: worker.tts_default_ready,
            missing,
        },
        evidence_path: if evidence_path.is_file() {
            Some(evidence_path.to_string_lossy().replace('\\', "/"))
        } else {
            None
        },
        message,
    }
}
