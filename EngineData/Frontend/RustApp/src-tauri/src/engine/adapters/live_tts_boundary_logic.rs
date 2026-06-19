use serde::Serialize;

use crate::engine::adapters::live_translation_boundary_logic::{
    analyze_live_translation_boundary, LiveTranslationBoundaryReport,
};

#[derive(Debug, Clone, Serialize)]
pub struct LiveTtsBoundaryReport {
    pub ok: bool,
    pub execution_attempted: bool,
    pub translated_text: Option<String>,
    pub output_audio_ready: bool,
    pub playback_ready: bool,
    pub voice_backend_connected: bool,
    pub ready_for_tts_call: bool,
    pub translation_boundary: LiveTranslationBoundaryReport,
    pub blocker: String,
    pub note: String,
}

pub fn analyze_live_tts_boundary() -> LiveTtsBoundaryReport {
    let translation_boundary = analyze_live_translation_boundary();
    let translated_text = translation_boundary
        .translated_text
        .clone()
        .filter(|text| !text.trim().is_empty());
    let input_ready = translated_text.is_some();
    let voice_backend_connected = false;
    let playback_ready = false;
    let ready_for_tts_call = input_ready && voice_backend_connected && playback_ready;

    let blocker = if !input_ready {
        format!(
            "tts_boundary:translation_not_ready:{}",
            translation_boundary.blocker
        )
    } else if !voice_backend_connected {
        "tts_boundary:voice_backend_not_connected".to_string()
    } else if !playback_ready {
        "tts_boundary:playback_not_ready".to_string()
    } else {
        String::new()
    };

    let note = if ready_for_tts_call {
        "Live TTS boundary is ready to synthesize and play translated output.".to_string()
    } else {
        format!(
            "Live TTS boundary is blocked. input_ready={}, voice_backend_connected={}, playback_ready={}, blocker={}",
            input_ready, voice_backend_connected, playback_ready, blocker
        )
    };

    LiveTtsBoundaryReport {
        ok: false,
        execution_attempted: false,
        translated_text,
        output_audio_ready: false,
        playback_ready,
        voice_backend_connected,
        ready_for_tts_call,
        translation_boundary,
        blocker,
        note,
    }
}
