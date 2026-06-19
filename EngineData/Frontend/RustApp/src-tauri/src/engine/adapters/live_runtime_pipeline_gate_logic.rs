use serde::Serialize;

use crate::engine::adapters::live_tts_boundary_logic::{
    analyze_live_tts_boundary, LiveTtsBoundaryReport,
};

#[derive(Debug, Clone, Serialize)]
pub struct LiveRuntimePipelineGateReport {
    pub ready_for_user_runtime: bool,
    pub microphone_ready: bool,
    pub asr_ready: bool,
    pub translation_ready: bool,
    pub tts_ready: bool,
    pub playback_ready: bool,
    pub completed_stage_count: u8,
    pub total_stage_count: u8,
    pub progress_percent: u8,
    pub tts_boundary: LiveTtsBoundaryReport,
    pub blocker: String,
    pub note: String,
}

pub fn analyze_live_runtime_pipeline_gate() -> LiveRuntimePipelineGateReport {
    let tts_boundary = analyze_live_tts_boundary();
    let translation = &tts_boundary.translation_boundary;
    let asr_decoder = &translation.asr_decoder;
    let asr_boundary = &asr_decoder.boundary;
    let target_segment = &asr_boundary.target_segment;

    let microphone_ready = target_segment.ready;
    let asr_ready = asr_decoder.ok
        && asr_decoder
            .transcript_text
            .as_ref()
            .map(|text| !text.trim().is_empty())
            .unwrap_or(false);
    let translation_ready = translation.ok
        && translation
            .translated_text
            .as_ref()
            .map(|text| !text.trim().is_empty())
            .unwrap_or(false);
    let tts_ready = tts_boundary.ok && tts_boundary.output_audio_ready;
    let playback_ready = tts_boundary.playback_ready;

    let completed_stage_count = [
        microphone_ready,
        asr_ready,
        translation_ready,
        tts_ready,
        playback_ready,
    ]
    .iter()
    .filter(|value| **value)
    .count() as u8;
    let total_stage_count = 5;
    let progress_percent = ((completed_stage_count as u16 * 100) / total_stage_count as u16) as u8;
    let ready_for_user_runtime = completed_stage_count == total_stage_count;

    let blocker = if !microphone_ready {
        format!(
            "pipeline_gate:microphone_segment_not_ready:{}",
            target_segment.blocker
        )
    } else if !asr_ready {
        format!("pipeline_gate:asr_not_ready:{}", asr_decoder.blocker)
    } else if !translation_ready {
        format!(
            "pipeline_gate:translation_not_ready:{}",
            translation.blocker
        )
    } else if !tts_ready {
        format!("pipeline_gate:tts_not_ready:{}", tts_boundary.blocker)
    } else if !playback_ready {
        "pipeline_gate:playback_not_ready".to_string()
    } else {
        String::new()
    };

    let note = format!(
        "Live runtime pipeline gate: {}/{} stages complete, progress={}%, ready_for_user_runtime={}, blocker={}",
        completed_stage_count, total_stage_count, progress_percent, ready_for_user_runtime, blocker
    );

    LiveRuntimePipelineGateReport {
        ready_for_user_runtime,
        microphone_ready,
        asr_ready,
        translation_ready,
        tts_ready,
        playback_ready,
        completed_stage_count,
        total_stage_count,
        progress_percent,
        tts_boundary,
        blocker,
        note,
    }
}
