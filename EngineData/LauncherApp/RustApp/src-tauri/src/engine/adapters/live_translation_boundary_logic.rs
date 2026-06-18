use serde::Serialize;

use crate::engine::adapters::native_asr_decoder_logic::{
    analyze_native_asr_decoder_bridge, NativeAsrDecoderBridgeReport,
};
use crate::engine::paths::ProjectPaths;

#[derive(Debug, Clone, Serialize)]
pub struct LiveTranslationBoundaryReport {
    pub ok: bool,
    pub execution_attempted: bool,
    pub source_text: Option<String>,
    pub translated_text: Option<String>,
    pub source_language: String,
    pub target_language: String,
    pub model_ready: bool,
    pub backend_ready: bool,
    pub decoder_connected: bool,
    pub ready_for_translation_call: bool,
    pub asr_decoder: NativeAsrDecoderBridgeReport,
    pub blocker: String,
    pub note: String,
}

pub fn analyze_live_translation_boundary() -> LiveTranslationBoundaryReport {
    let project_paths = ProjectPaths::discover();
    let asr_decoder = analyze_native_asr_decoder_bridge();
    let source_text = asr_decoder
        .transcript_text
        .clone()
        .filter(|text| !text.trim().is_empty());
    let input_ready = source_text.is_some();
    let model_ready = std::path::Path::new(&project_paths.translation_model_dir).is_dir();
    let backend_ready = asr_decoder.boundary.backend_validation.ready;
    let decoder_connected = false;
    let ready_for_translation_call =
        input_ready && model_ready && backend_ready && decoder_connected;

    let blocker = if !input_ready {
        format!(
            "translation_boundary:transcript_not_ready:{}",
            asr_decoder.blocker
        )
    } else if !model_ready {
        "translation_boundary:model_not_ready".to_string()
    } else if !backend_ready {
        "translation_boundary:backend_not_ready".to_string()
    } else if !decoder_connected {
        "translation_boundary:native_translation_decoder_not_connected".to_string()
    } else {
        String::new()
    };

    let note = if ready_for_translation_call {
        "Live translation boundary is ready to call the native translation decoder.".to_string()
    } else {
        format!(
            "Live translation boundary is blocked. input_ready={}, model_ready={}, backend_ready={}, decoder_connected={}, blocker={}",
            input_ready, model_ready, backend_ready, decoder_connected, blocker
        )
    };

    LiveTranslationBoundaryReport {
        ok: false,
        execution_attempted: false,
        source_text,
        translated_text: None,
        source_language: "id".to_string(),
        target_language: "en".to_string(),
        model_ready,
        backend_ready,
        decoder_connected,
        ready_for_translation_call,
        asr_decoder,
        blocker,
        note,
    }
}
