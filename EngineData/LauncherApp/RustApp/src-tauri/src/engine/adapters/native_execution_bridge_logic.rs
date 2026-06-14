use serde::{Deserialize, Serialize};

use crate::engine::native_execution::{NativeExecutionContractRequest, NativeExecutionRequest};
use crate::engine::native_runners::{prepare_native_stage_runners, NativeStageRunnerReport, NativeStageRunnerRequest};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeExecutionBridgeRequest {
    pub segment_id: String,
    pub source_text: Option<String>,
    pub source_audio_path: Option<String>,
    pub output_audio_path: Option<String>,
    pub asr_model_path: Option<String>,
    pub translation_model_path: Option<String>,
    pub output_model_path: Option<String>,
    pub asr_backend_ready: bool,
    pub translation_backend_ready: bool,
    pub output_backend_ready: bool,
    pub allow_cpu_degraded_mode: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct NativeExecutionBridgeReport {
    pub segment_id: String,
    pub ready_for_execution: bool,
    pub runner_report: NativeStageRunnerReport,
    pub blockers: Vec<String>,
    pub note: String,
}

pub fn build_native_execution_bridge(request: NativeExecutionBridgeRequest) -> NativeExecutionBridgeReport {
    let asr_input_ready = request.source_audio_path.as_ref().map(|value| !value.trim().is_empty()).unwrap_or(false);
    let translation_input_ready = request.source_text.as_ref().map(|value| !value.trim().is_empty()).unwrap_or(false);
    let output_input_ready = translation_input_ready || request.output_audio_path.as_ref().map(|value| !value.trim().is_empty()).unwrap_or(false);
    let asr_model_ready = request.asr_model_path.as_ref().map(|value| !value.trim().is_empty()).unwrap_or(false);
    let translation_model_ready = request.translation_model_path.as_ref().map(|value| !value.trim().is_empty()).unwrap_or(false);
    let output_model_ready = request.output_model_path.as_ref().map(|value| !value.trim().is_empty()).unwrap_or(true);

    let asr = NativeExecutionContractRequest {
        stage: "asr".to_string(),
        segment_id: request.segment_id.clone(),
        source_text: None,
        source_audio_path: request.source_audio_path.clone(),
        model_path: request.asr_model_path.clone(),
        output_audio_path: None,
        plan: NativeExecutionRequest {
            stage: "asr".to_string(),
            model_id: Some("large-v3-turbo".to_string()),
            device: Some("cuda".to_string()),
            compute_type: Some("float16".to_string()),
            input_ready: asr_input_ready,
            model_ready: asr_model_ready,
            backend_ready: request.asr_backend_ready,
            allow_cpu_degraded_mode: request.allow_cpu_degraded_mode,
        },
    };

    let translation = NativeExecutionContractRequest {
        stage: "translation".to_string(),
        segment_id: request.segment_id.clone(),
        source_text: request.source_text.clone(),
        source_audio_path: None,
        model_path: request.translation_model_path.clone(),
        output_audio_path: None,
        plan: NativeExecutionRequest {
            stage: "translation".to_string(),
            model_id: Some("nllb-200-distilled-600M".to_string()),
            device: Some("cuda".to_string()),
            compute_type: Some("float16".to_string()),
            input_ready: translation_input_ready,
            model_ready: translation_model_ready,
            backend_ready: request.translation_backend_ready,
            allow_cpu_degraded_mode: request.allow_cpu_degraded_mode,
        },
    };

    let output = NativeExecutionContractRequest {
        stage: "output".to_string(),
        segment_id: request.segment_id.clone(),
        source_text: request.source_text.clone(),
        source_audio_path: None,
        model_path: request.output_model_path.clone(),
        output_audio_path: request.output_audio_path.clone(),
        plan: NativeExecutionRequest {
            stage: "output".to_string(),
            model_id: Some("windows-default-output".to_string()),
            device: Some("windows-default-output".to_string()),
            compute_type: Some("audio".to_string()),
            input_ready: output_input_ready,
            model_ready: output_model_ready,
            backend_ready: request.output_backend_ready,
            allow_cpu_degraded_mode: false,
        },
    };

    let runner_report = prepare_native_stage_runners(NativeStageRunnerRequest {
        asr: Some(asr),
        translation: Some(translation),
        output: Some(output),
    });
    let ready_for_execution = runner_report.blockers.is_empty() && runner_report.ready_stage_count == 3;
    let note = if ready_for_execution {
        "Native execution bridge is ready to enter real runner integration.".to_string()
    } else {
        "Native execution bridge remains blocked until required inputs, model paths, and backend readiness are available.".to_string()
    };

    NativeExecutionBridgeReport {
        segment_id: request.segment_id,
        ready_for_execution,
        blockers: runner_report.blockers.clone(),
        runner_report,
        note,
    }
}
