use serde::Serialize;

use crate::engine::adapters::runtime_status_bundle_logic::build_runtime_status_bundle;

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

pub fn build_realtime_status_payload() -> RealtimeStatusPayload {
    let bundle = build_runtime_status_bundle();
    let worker = &bundle.local_worker_manifest;
    let pipeline = &bundle.live_pipeline_gate;

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
    } else if !worker_available || !missing.is_empty() {
        "partial_ready"
    } else if pipeline.progress_percent > 0 {
        "checking"
    } else {
        "idle"
    }
    .to_string();

    let message = if pipeline.ready_for_user_runtime {
        "Realtime pipeline is ready for local validation.".to_string()
    } else if !missing.is_empty() {
        format!("Realtime assets or worker checks are incomplete: {} item(s).", missing.len())
    } else {
        format!(
            "Realtime pipeline progress is {}%; next action: {}.",
            pipeline.progress_percent, bundle.next_action
        )
    };

    RealtimeStatusPayload {
        status,
        language_direction: "ID > EN".to_string(),
        mode: "Realtime".to_string(),
        latency: RealtimeStatusLatencyPayload {
            target_ms: worker.realtime_target_latency_ms.unwrap_or(1000),
            last_total_ms: None,
            p50_ms: None,
            sample_count: 0,
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
            last_command: Some(bundle.next_action),
        },
        assets: RealtimeStatusAssetsPayload {
            asr_ready: worker.asr_model_ready,
            translation_ready: worker.realtime_translation_model_ready,
            tts_ready: worker.tts_default_ready,
            missing,
        },
        evidence_path: None,
        message,
    }
}
