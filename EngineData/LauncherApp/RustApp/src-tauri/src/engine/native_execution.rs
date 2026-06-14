use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeExecutionRequest {
    pub stage: String,
    pub model_id: Option<String>,
    pub device: Option<String>,
    pub compute_type: Option<String>,
    pub input_ready: bool,
    pub model_ready: bool,
    pub backend_ready: bool,
    pub allow_cpu_degraded_mode: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct NativeExecutionPlan {
    pub stage: String,
    pub model_id: String,
    pub selected_device: String,
    pub selected_compute_type: String,
    pub ready: bool,
    pub cpu_degraded: bool,
    pub status: String,
    pub blocker: String,
}

pub fn plan_native_execution(request: NativeExecutionRequest) -> NativeExecutionPlan {
    let stage = normalize_stage(&request.stage);
    let model_id = request.model_id.unwrap_or_else(|| default_model_for_stage(&stage).to_string());
    let requested_device = request.device.unwrap_or_else(|| "cuda".to_string());
    let requested_compute = request.compute_type.unwrap_or_else(|| "float16".to_string());

    if !request.input_ready {
        return blocked(stage, model_id, requested_device, requested_compute, "input_not_ready");
    }
    if !request.model_ready {
        return blocked(stage, model_id, requested_device, requested_compute, "model_not_ready");
    }
    if !request.backend_ready {
        if request.allow_cpu_degraded_mode {
            return NativeExecutionPlan {
                stage,
                model_id,
                selected_device: "cpu".to_string(),
                selected_compute_type: "int8".to_string(),
                ready: true,
                cpu_degraded: true,
                status: "degraded_ready".to_string(),
                blocker: String::new(),
            };
        }
        return blocked(stage, model_id, requested_device, requested_compute, "backend_not_ready");
    }

    NativeExecutionPlan {
        stage,
        model_id,
        selected_device: requested_device,
        selected_compute_type: requested_compute,
        ready: true,
        cpu_degraded: false,
        status: "ready".to_string(),
        blocker: String::new(),
    }
}

fn blocked(stage: String, model_id: String, device: String, compute: String, reason: &str) -> NativeExecutionPlan {
    NativeExecutionPlan {
        stage,
        model_id,
        selected_device: device,
        selected_compute_type: compute,
        ready: false,
        cpu_degraded: false,
        status: "blocked".to_string(),
        blocker: reason.to_string(),
    }
}

fn normalize_stage(stage: &str) -> String {
    match stage.trim().to_lowercase().as_str() {
        "asr" | "transcript" => "asr".to_string(),
        "translation" | "translate" => "translation".to_string(),
        "tts" | "playback" | "output" => "output".to_string(),
        _ => "unknown".to_string(),
    }
}

fn default_model_for_stage(stage: &str) -> &'static str {
    match stage {
        "asr" => "large-v3-turbo",
        "translation" => "nllb-200-distilled-600M",
        "output" => "marcel",
        _ => "unknown",
    }
}
