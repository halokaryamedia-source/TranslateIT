use serde::Serialize;

use crate::engine::adapters::live_runtime_pipeline_gate_logic::{
    analyze_live_runtime_pipeline_gate, LiveRuntimePipelineGateReport,
};

const MAX_COMPACT_STATUS_TEXT_CHARS: usize = 220;

#[derive(Debug, Clone, Serialize)]
pub struct LivePipelineCompactStatusReport {
    pub progress_percent: u8,
    pub ready_for_user_runtime: bool,
    pub microphone_ready: bool,
    pub asr_ready: bool,
    pub translation_ready: bool,
    pub tts_ready: bool,
    pub playback_ready: bool,
    pub next_blocker: String,
    pub next_action: String,
    pub note: String,
}

pub fn build_live_pipeline_compact_status() -> LivePipelineCompactStatusReport {
    compact_from_gate(analyze_live_runtime_pipeline_gate())
}

fn compact_from_gate(gate: LiveRuntimePipelineGateReport) -> LivePipelineCompactStatusReport {
    let next_action = if gate.ready_for_user_runtime {
        "runtime_ready_for_internal_validation".to_string()
    } else if !gate.microphone_ready {
        "continue_microphone_capture_until_segment_ready".to_string()
    } else if !gate.asr_ready {
        "connect_or_validate_native_asr_decoder".to_string()
    } else if !gate.translation_ready {
        "connect_or_validate_native_translation_decoder".to_string()
    } else if !gate.tts_ready {
        "connect_or_validate_tts_voice_backend".to_string()
    } else if !gate.playback_ready {
        "connect_or_validate_playback_output".to_string()
    } else {
        "hold_runtime_gate".to_string()
    };

    LivePipelineCompactStatusReport {
        progress_percent: gate.progress_percent.min(100),
        ready_for_user_runtime: gate.ready_for_user_runtime,
        microphone_ready: gate.microphone_ready,
        asr_ready: gate.asr_ready,
        translation_ready: gate.translation_ready,
        tts_ready: gate.tts_ready,
        playback_ready: gate.playback_ready,
        next_blocker: compact_status_text(&gate.blocker),
        next_action,
        note: compact_status_text(&gate.note),
    }
}

fn compact_status_text(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|character| !character.is_control())
        .take(MAX_COMPACT_STATUS_TEXT_CHARS)
        .collect::<String>()
}
