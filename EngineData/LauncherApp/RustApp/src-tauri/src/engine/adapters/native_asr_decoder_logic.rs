use serde::Serialize;

use crate::engine::adapters::live_asr_boundary_logic::{
    analyze_live_asr_boundary, mark_live_asr_segment_consumed_after_success, AsrConsumeGuardReport,
    LiveAsrBoundaryReport,
};

#[derive(Debug, Clone, Serialize)]
pub struct NativeAsrDecoderBridgeReport {
    pub ok: bool,
    pub decoder_stage: String,
    pub decoder_connected: bool,
    pub execution_attempted: bool,
    pub transcript_text: Option<String>,
    pub boundary: LiveAsrBoundaryReport,
    pub consume_guard: Option<AsrConsumeGuardReport>,
    pub blocker: String,
    pub note: String,
}

pub fn analyze_native_asr_decoder_bridge() -> NativeAsrDecoderBridgeReport {
    let boundary = analyze_live_asr_boundary();
    let decoder_connected = false;
    let execution_attempted = false;
    let consume_guard = None;

    let blocker = if !boundary.input_ready {
        format!("native_asr_decoder:input_not_ready:{}", boundary.blocker)
    } else if !boundary.model_ready {
        "native_asr_decoder:model_not_ready".to_string()
    } else if !boundary.backend_ready {
        format!("native_asr_decoder:backend_not_ready:{}", boundary.blocker)
    } else if boundary.duplicate_of_last_success {
        "native_asr_decoder:duplicate_segment_already_consumed".to_string()
    } else if !decoder_connected {
        "native_asr_decoder:ffi_decoder_not_implemented".to_string()
    } else {
        String::new()
    };

    let note = format!(
        "Native ASR decoder bridge is scaffolded but not connected. segment_id={}, input_ready={}, model_ready={}, backend_ready={}, decoder_connected={}, blocker={}",
        boundary.segment_id,
        boundary.input_ready,
        boundary.model_ready,
        boundary.backend_ready,
        decoder_connected,
        blocker
    );

    NativeAsrDecoderBridgeReport {
        ok: false,
        decoder_stage: "native_asr_decoder_bridge".to_string(),
        decoder_connected,
        execution_attempted,
        transcript_text: None,
        boundary,
        consume_guard,
        blocker,
        note,
    }
}

pub fn mark_segment_consumed_after_verified_decoder_success() -> NativeAsrDecoderBridgeReport {
    let mut report = analyze_native_asr_decoder_bridge();
    if report.ok && report.transcript_text.as_ref().map(|text| !text.trim().is_empty()).unwrap_or(false) {
        report.consume_guard = Some(mark_live_asr_segment_consumed_after_success());
    } else {
        report.note = format!(
            "Segment consume was not updated because verified decoder success is not available. blocker={}",
            report.blocker
        );
    }
    report
}
