use serde::{Deserialize, Serialize};

use crate::engine::audio::noise_filter::{
    classify_noise, AudioNoiseAssessment, NoiseAssessmentRequest,
};
use crate::engine::audio::preprocess::{
    preprocess_audio, AudioPreprocessRequest, PreprocessingResult,
};
use crate::engine::audio::vad::{
    evaluate_segment_decision, VadDecisionReport, VadSegmentDecisionRequest,
};
use crate::engine::native_execution::{
    plan_native_execution_batch, NativeExecutionBatchPlan, NativeExecutionBatchRequest,
};

use super::asr_model_logic::{build_asr_profile_plan, AsrProfilePlan, AsrProfileRequest};
use super::asr_quality_logic::{
    evaluate_asr_quality, AsrQualityLogicDecision, AsrQualityLogicRequest,
};
use super::language_logic::{run_language_logic, LanguageLogicReport, LanguageLogicRequest};
use super::latency_logic::{build_latency_logic, LatencyLogicReport, LatencyLogicRequest};
use super::pipeline_logic::{
    check_stale_job, decide_pipeline, PipelineDecisionReport, PipelineDecisionRequest,
    StaleJobGuardReport, StaleJobGuardRequest,
};
use super::playback_logic::{plan_playback, PlaybackLogicRequest, PlaybackLogicResult};
use super::translation_logic::{
    run_translation_logic, TranslationLogicRequest, TranslationLogicResult,
};

const MAX_ORCHESTRATION_ID_CHARS: usize = 96;
const MAX_ORCHESTRATION_BLOCKER_CHARS: usize = 180;
const MAX_ORCHESTRATION_BLOCKERS: usize = 32;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeOrchestrationRequest {
    pub segment_id: String,
    pub capture_mode: String,
    pub preprocess: AudioPreprocessRequest,
    pub noise: NoiseAssessmentRequest,
    pub vad: VadSegmentDecisionRequest,
    pub asr_profile: AsrProfileRequest,
    pub asr_quality: AsrQualityLogicRequest,
    pub language: LanguageLogicRequest,
    pub latency: LatencyLogicRequest,
    pub pipeline: PipelineDecisionRequest,
    pub stale_guard: StaleJobGuardRequest,
    pub translation: TranslationLogicRequest,
    pub playback: PlaybackLogicRequest,
    pub native_execution: NativeExecutionBatchRequest,
}

#[derive(Debug, Clone, Serialize)]
pub struct RuntimeOrchestrationReport {
    pub segment_id: String,
    pub accepted: bool,
    pub stage: String,
    pub summary: String,
    pub preprocess: PreprocessingResult,
    pub noise: AudioNoiseAssessment,
    pub vad: VadDecisionReport,
    pub asr_profile: AsrProfilePlan,
    pub asr_quality: AsrQualityLogicDecision,
    pub language: LanguageLogicReport,
    pub latency: LatencyLogicReport,
    pub pipeline: PipelineDecisionReport,
    pub stale_guard: StaleJobGuardReport,
    pub translation: TranslationLogicResult,
    pub playback: PlaybackLogicResult,
    pub native_execution: NativeExecutionBatchPlan,
    pub blockers: Vec<String>,
}

struct BlockerContext<'a> {
    noise: &'a AudioNoiseAssessment,
    vad: &'a VadDecisionReport,
    asr_profile: &'a AsrProfilePlan,
    asr_quality: &'a AsrQualityLogicDecision,
    pipeline: &'a PipelineDecisionReport,
    stale_guard: &'a StaleJobGuardReport,
    translation: &'a TranslationLogicResult,
    playback: &'a PlaybackLogicResult,
    native_execution: &'a NativeExecutionBatchPlan,
}

pub fn run_runtime_orchestration(
    mut request: RuntimeOrchestrationRequest,
) -> RuntimeOrchestrationReport {
    let segment_id = safe_orchestration_id(&request.segment_id);
    let preprocess = preprocess_audio(request.preprocess.clone());
    let noise = classify_noise(request.noise.clone());
    let vad = evaluate_segment_decision(request.vad.clone());
    let asr_profile = build_asr_profile_plan(request.asr_profile.clone());
    let asr_quality = evaluate_asr_quality(request.asr_quality.clone());
    let language = run_language_logic(request.language.clone());
    let latency = build_latency_logic(request.latency.clone());
    let stale_guard = check_stale_job(request.stale_guard.clone());

    request.pipeline.vad_accepted = vad.accepted && !noise.matched;
    request.pipeline.should_translate = language.should_translate;
    request.pipeline.asr_ready = asr_profile.ready_for_native_execution;
    request.pipeline.translation_ready = request.translation.backend_ready;
    let pipeline = decide_pipeline(request.pipeline.clone());

    let mut translation_request = request.translation.clone();
    translation_request.detected_language = Some(language.inferred_language_bias.clone());
    translation_request.source_text = if language.normalized_short_source_text.trim().is_empty() {
        translation_request.source_text
    } else {
        language.normalized_short_source_text.clone()
    };
    let translation = run_translation_logic(translation_request);

    let playback = plan_playback(request.playback.clone());
    let native_execution = plan_native_execution_batch(request.native_execution.clone());
    let blockers = compact_blockers(build_blockers(
        BlockerContext {
            noise: &noise,
            vad: &vad,
            asr_profile: &asr_profile,
            asr_quality: &asr_quality,
            pipeline: &pipeline,
            stale_guard: &stale_guard,
            translation: &translation,
            playback: &playback,
            native_execution: &native_execution,
        },
    ));
    let accepted = blockers.is_empty();
    let stage = if accepted { "planned" } else { "blocked" }.to_string();
    let summary = if accepted {
        "Runtime orchestration plan accepted. Native execution may proceed when adapters are connected.".to_string()
    } else {
        format!(
            "Runtime orchestration blocked by {} guard(s).",
            blockers.len()
        )
    };

    RuntimeOrchestrationReport {
        segment_id,
        accepted,
        stage,
        summary,
        preprocess,
        noise,
        vad,
        asr_profile,
        asr_quality,
        language,
        latency,
        pipeline,
        stale_guard,
        translation,
        playback,
        native_execution,
        blockers,
    }
}

fn build_blockers(ctx: BlockerContext<'_>) -> Vec<String> {
    let mut blockers = Vec::new();
    if ctx.noise.matched {
        blockers.push(format!("noise:{}", ctx.noise.category));
    }
    if !ctx.vad.accepted {
        blockers.push(format!("vad:{}", ctx.vad.reason));
    }
    if !ctx.asr_profile.ready_for_native_execution {
        blockers.push("asr_model:not_ready".to_string());
    }
    if !ctx.asr_quality.accepted {
        blockers.push(format!("asr_quality:{}", ctx.asr_quality.reason));
    }
    if !ctx.pipeline.accepted
        || ctx.pipeline.asr_status == "blocked"
        || ctx.pipeline.translation_status == "blocked"
    {
        blockers.push(format!(
            "pipeline:{}:{}",
            ctx.pipeline.asr_status, ctx.pipeline.translation_status
        ));
    }
    if ctx.stale_guard.stale_job_rejected {
        blockers.push(format!("stale_job:{}", ctx.stale_guard.reason));
    }
    if matches!(ctx.translation.status.as_str(), "PendingIntegration" | "Error") {
        blockers.push(format!("translation:{}", ctx.translation.status));
    }
    if matches!(ctx.playback.status.as_str(), "Unavailable" | "Unsupported") {
        blockers.push(format!("playback:{}", ctx.playback.status));
    }
    for blocker in &ctx.native_execution.blockers {
        blockers.push(format!("native_execution:{blocker}"));
    }
    if ctx.native_execution.any_cpu_degraded {
        blockers.push("native_execution:cpu_degraded_requires_visible_approval".to_string());
    }
    blockers
}

fn safe_orchestration_id(value: &str) -> String {
    let clean = value
        .trim()
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || matches!(character, '-' | '_') {
                character
            } else {
                '_'
            }
        })
        .take(MAX_ORCHESTRATION_ID_CHARS)
        .collect::<String>();
    if clean.is_empty() {
        "segment".to_string()
    } else {
        clean
    }
}

fn compact_blockers(values: Vec<String>) -> Vec<String> {
    values
        .into_iter()
        .map(|value| {
            value
                .trim()
                .chars()
                .filter(|character| !character.is_control())
                .take(MAX_ORCHESTRATION_BLOCKER_CHARS)
                .collect::<String>()
        })
        .filter(|value| !value.is_empty())
        .take(MAX_ORCHESTRATION_BLOCKERS)
        .collect()
}
