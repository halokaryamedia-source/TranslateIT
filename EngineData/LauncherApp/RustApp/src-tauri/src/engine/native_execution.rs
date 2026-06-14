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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeExecutionBatchRequest {
    pub asr: NativeExecutionRequest,
    pub translation: NativeExecutionRequest,
    pub output: NativeExecutionRequest,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeExecutionContractRequest {
    pub stage: String,
    pub segment_id: String,
    pub source_text: Option<String>,
    pub source_audio_path: Option<String>,
    pub model_path: Option<String>,
    pub output_audio_path: Option<String>,
    pub plan: NativeExecutionRequest,
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

#[derive(Debug, Clone, Serialize)]
pub struct NativeExecutionContractResult {
    pub segment_id: String,
    pub stage: String,
    pub ready_to_execute: bool,
    pub execution_status: String,
    pub selected_model: String,
    pub selected_device: String,
    pub selected_compute_type: String,
    pub input_kind: String,
    pub input_summary: String,
    pub output_target: String,
    pub queue_wait_ms: i64,
    pub preprocess_ms: i64,
    pub inference_ms: i64,
    pub postprocess_ms: i64,
    pub total_ms: i64,
    pub error: String,
    pub blocker: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct NativeExecutionBatchPlan {
    pub asr: NativeExecutionPlan,
    pub translation: NativeExecutionPlan,
    pub output: NativeExecutionPlan,
    pub all_ready: bool,
    pub any_cpu_degraded: bool,
    pub cuda_ready_for_core_stages: bool,
    pub blockers: Vec<String>,
}

pub fn plan_native_execution(request: NativeExecutionRequest) -> NativeExecutionPlan {
    let stage = normalize_stage(&request.stage);
    let model_id = request.model_id.unwrap_or_else(|| default_model_for_stage(&stage).to_string());
    let requested_device = request.device.unwrap_or_else(|| default_device_for_stage(&stage).to_string());
    let requested_compute = request.compute_type.unwrap_or_else(|| default_compute_for_stage(&stage).to_string());

    if stage == "unknown" {
        return blocked(stage, model_id, requested_device, requested_compute, "unknown_stage");
    }
    if !request.input_ready {
        return blocked(stage, model_id, requested_device, requested_compute, "input_not_ready");
    }
    if !request.model_ready {
        return blocked(stage, model_id, requested_device, requested_compute, "model_not_ready");
    }
    if !request.backend_ready {
        if request.allow_cpu_degraded_mode && stage != "output" {
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

pub fn prepare_native_execution_contract(request: NativeExecutionContractRequest) -> NativeExecutionContractResult {
    let plan = plan_native_execution(request.plan);
    let input_kind = input_kind(&request.source_text, &request.source_audio_path);
    let input_summary = input_summary(&request.source_text, &request.source_audio_path);
    let output_target = request.output_audio_path.unwrap_or_default();
    let contract_blocker = contract_blocker(
        &plan.stage,
        &request.source_text,
        &request.source_audio_path,
        &request.model_path,
        &output_target,
        &plan.blocker,
    );
    let ready_to_execute = plan.ready && contract_blocker.is_empty();
    let execution_status = if ready_to_execute {
        if plan.cpu_degraded { "degraded_prepared" } else { "prepared" }
    } else {
        "blocked"
    }
    .to_string();

    NativeExecutionContractResult {
        segment_id: request.segment_id,
        stage: plan.stage.clone(),
        ready_to_execute,
        execution_status,
        selected_model: plan.model_id,
        selected_device: plan.selected_device,
        selected_compute_type: plan.selected_compute_type,
        input_kind,
        input_summary,
        output_target,
        queue_wait_ms: 0,
        preprocess_ms: 0,
        inference_ms: 0,
        postprocess_ms: 0,
        total_ms: 0,
        error: String::new(),
        blocker: contract_blocker,
    }
}

pub fn plan_native_execution_batch(request: NativeExecutionBatchRequest) -> NativeExecutionBatchPlan {
    let asr = plan_native_execution(request.asr);
    let translation = plan_native_execution(request.translation);
    let output = plan_native_execution(request.output);
    let all_ready = asr.ready && translation.ready && output.ready;
    let any_cpu_degraded = asr.cpu_degraded || translation.cpu_degraded || output.cpu_degraded;
    let cuda_ready_for_core_stages = asr.ready
        && translation.ready
        && asr.selected_device == "cuda"
        && translation.selected_device == "cuda"
        && !asr.cpu_degraded
        && !translation.cpu_degraded;
    let blockers = [&asr, &translation, &output]
        .iter()
        .filter(|plan| !plan.blocker.is_empty())
        .map(|plan| format!("{}:{}", plan.stage, plan.blocker))
        .collect::<Vec<_>>();
    NativeExecutionBatchPlan {
        asr,
        translation,
        output,
        all_ready,
        any_cpu_degraded,
        cuda_ready_for_core_stages,
        blockers,
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

fn contract_blocker(
    stage: &str,
    source_text: &Option<String>,
    source_audio_path: &Option<String>,
    model_path: &Option<String>,
    output_target: &str,
    plan_blocker: &str,
) -> String {
    if !plan_blocker.trim().is_empty() {
        return plan_blocker.to_string();
    }
    if model_path.as_ref().map(|value| value.trim().is_empty()).unwrap_or(true) && stage != "output" {
        return "model_path_missing".to_string();
    }
    match stage {
        "asr" if !is_present(source_audio_path.as_deref()) => "asr_audio_input_missing".to_string(),
        "translation" if !is_present(source_text.as_deref()) => "translation_text_input_missing".to_string(),
        "output" if !is_present(Some(output_target)) => "output_target_missing".to_string(),
        "asr" | "translation" | "output" => String::new(),
        _ => "unknown_stage".to_string(),
    }
}

fn is_present(value: Option<&str>) -> bool {
    value.map(|text| !text.trim().is_empty()).unwrap_or(false)
}

fn input_kind(source_text: &Option<String>, source_audio_path: &Option<String>) -> String {
    if source_audio_path.as_ref().map(|value| !value.trim().is_empty()).unwrap_or(false) {
        "audio".to_string()
    } else if source_text.as_ref().map(|value| !value.trim().is_empty()).unwrap_or(false) {
        "text".to_string()
    } else {
        "empty".to_string()
    }
}

fn input_summary(source_text: &Option<String>, source_audio_path: &Option<String>) -> String {
    if let Some(path) = source_audio_path.as_ref().filter(|value| !value.trim().is_empty()) {
        return format!("audio:{path}");
    }
    if let Some(text) = source_text.as_ref().filter(|value| !value.trim().is_empty()) {
        return format!("text_chars:{}", text.chars().count());
    }
    "empty".to_string()
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

fn default_device_for_stage(stage: &str) -> &'static str {
    match stage {
        "output" => "windows-default-output",
        _ => "cuda",
    }
}

fn default_compute_for_stage(stage: &str) -> &'static str {
    match stage {
        "output" => "audio",
        _ => "float16",
    }
}
