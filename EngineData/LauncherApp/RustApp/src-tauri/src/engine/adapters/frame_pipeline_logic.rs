use serde::{Deserialize, Serialize};

use crate::engine::audio::buffer::{inspect_frame, AudioFrameInspectionReport};
use crate::engine::audio::preprocess::{
    preprocess_audio, AudioPreprocessRequest, PreprocessingResult,
};
use crate::engine::audio::AudioFrame;

const MAX_FRAME_PIPELINE_DURATION_MS: u32 = 60_000;
const MAX_FRAME_PIPELINE_STATE_CHARS: usize = 80;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FramePipelineRequest {
    pub frame: AudioFrame,
    pub floor_rms: Option<f32>,
    pub require_vad_acceptance: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct FramePipelineReport {
    pub accepted_by_buffer: bool,
    pub vad_passed: bool,
    pub ready_for_segment_builder: bool,
    pub ready_for_asr_preprocess: bool,
    pub duration_ms: u32,
    pub input_state: String,
    pub blockers: Vec<String>,
    pub inspection: AudioFrameInspectionReport,
    pub asr_preprocess: PreprocessingResult,
    pub note: String,
}

pub fn analyze_frame_pipeline(request: FramePipelineRequest) -> FramePipelineReport {
    let floor_rms = safe_floor_rms(request.floor_rms);
    let inspection = inspect_frame(request.frame.clone());
    let asr_preprocess = preprocess_audio(AudioPreprocessRequest {
        frame: request.frame,
        floor_rms,
        target_rate: None,
        gate_multiplier: None,
        mode: "asr".to_string(),
        collect_stats: Some(true),
    });

    let vad_passed = inspection.vad_result.accepted;
    let mut blockers = Vec::new();
    if !inspection.accepted_by_buffer {
        blockers.push("buffer:rejected_frame_format".to_string());
    }
    if request.require_vad_acceptance && !vad_passed {
        blockers.push("vad:not_passed".to_string());
    }
    if asr_preprocess.samples.is_empty() {
        blockers.push("preprocess:empty_samples".to_string());
    }
    if asr_preprocess.stats.duration_ms == 0 {
        blockers.push("preprocess:zero_duration".to_string());
    }

    let ready_for_asr_preprocess = blockers
        .iter()
        .all(|blocker| !blocker.starts_with("preprocess:"));
    let ready_for_segment_builder = blockers.is_empty();
    let note = if ready_for_segment_builder {
        "Frame pipeline contract is ready for segment builder handoff.".to_string()
    } else {
        format!(
            "Frame pipeline contract is blocked by {} guard(s).",
            blockers.len()
        )
    };

    FramePipelineReport {
        accepted_by_buffer: inspection.accepted_by_buffer,
        vad_passed,
        ready_for_segment_builder,
        ready_for_asr_preprocess,
        duration_ms: asr_preprocess
            .stats
            .duration_ms
            .min(MAX_FRAME_PIPELINE_DURATION_MS),
        input_state: compact_state(&asr_preprocess.stats.input_state),
        blockers,
        inspection,
        asr_preprocess,
        note,
    }
}

fn safe_floor_rms(value: Option<f32>) -> f32 {
    let value = value.unwrap_or(0.0);
    if value.is_finite() {
        value.max(0.0)
    } else {
        0.0
    }
}

fn compact_state(value: &str) -> String {
    let clean = value
        .trim()
        .chars()
        .filter(|character| !character.is_control())
        .take(MAX_FRAME_PIPELINE_STATE_CHARS)
        .collect::<String>();
    if clean.is_empty() {
        "unknown".to_string()
    } else {
        clean
    }
}
