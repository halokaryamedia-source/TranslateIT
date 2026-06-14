use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptQualityMetrics {
    pub input_quality: String,
    pub asr_confidence: f64,
    pub status: String,
    pub no_speech_probability: f64,
    pub average_log_probability: f64,
    pub compression_ratio: f64,
    pub language_ok: bool,
    pub notes: String,
    pub raw_rms: f64,
    pub raw_peak: f64,
    pub speech_to_noise_gap: f64,
    pub voiced_frame_ratio: f64,
    pub tts_status: String,
    pub tts_error: String,
    pub output_device_name: String,
    pub replay_error: String,
    pub capture_buffer_ms: i64,
    pub endpoint_wait_ms: i64,
    pub silence_accumulation_ms: i64,
    pub speech_confirmation_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptReplayPaths {
    pub source_audio_path: Option<String>,
    pub translated_audio_path: Option<String>,
    pub source_replay_available: bool,
    pub target_voice_available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptSegmentRecord {
    pub segment_id: String,
    pub trace_id: String,
    pub session_id: String,
    pub input_language: String,
    pub output_language: String,
    pub start_time_ms: i64,
    pub end_time_ms: i64,
    pub input_text: String,
    pub translated_text: String,
    pub pipeline_mode: String,
    pub capture_mode: String,
    pub asr_model_used: String,
    pub asr_device_used: String,
    pub asr_compute_type_used: String,
    pub translation_engine_used: String,
    pub model_fallback_used: bool,
    pub error_message: String,
    pub created_at_iso: String,
    pub quality: TranscriptQualityMetrics,
    pub replay: TranscriptReplayPaths,
}

#[derive(Debug, Clone, Serialize)]
pub struct TranscriptSegmentSummary {
    pub segment_id: String,
    pub duration_ms: i64,
    pub accepted: bool,
    pub source_chars: usize,
    pub translated_chars: usize,
    pub status: String,
}

impl Default for TranscriptQualityMetrics {
    fn default() -> Self {
        Self {
            input_quality: "Unknown".to_string(),
            asr_confidence: 0.0,
            status: "Planned".to_string(),
            no_speech_probability: 0.0,
            average_log_probability: 0.0,
            compression_ratio: 0.0,
            language_ok: true,
            notes: String::new(),
            raw_rms: 0.0,
            raw_peak: 0.0,
            speech_to_noise_gap: 0.0,
            voiced_frame_ratio: 0.0,
            tts_status: String::new(),
            tts_error: String::new(),
            output_device_name: String::new(),
            replay_error: String::new(),
            capture_buffer_ms: 0,
            endpoint_wait_ms: 0,
            silence_accumulation_ms: 0,
            speech_confirmation_ms: 0,
        }
    }
}

impl Default for TranscriptReplayPaths {
    fn default() -> Self {
        Self {
            source_audio_path: None,
            translated_audio_path: None,
            source_replay_available: false,
            target_voice_available: false,
        }
    }
}

impl TranscriptSegmentRecord {
    pub fn duration_ms(&self) -> i64 {
        (self.end_time_ms - self.start_time_ms).max(0)
    }

    pub fn accepted(&self) -> bool {
        self.quality.status == "Completed"
    }

    pub fn summarize(&self) -> TranscriptSegmentSummary {
        TranscriptSegmentSummary {
            segment_id: self.segment_id.clone(),
            duration_ms: self.duration_ms(),
            accepted: self.accepted(),
            source_chars: self.input_text.chars().count(),
            translated_chars: self.translated_text.chars().count(),
            status: self.quality.status.clone(),
        }
    }
}

pub fn build_transcript_segment(
    segment_id: String,
    session_id: String,
    input_language: String,
    output_language: String,
    start_time_ms: i64,
    end_time_ms: i64,
    input_text: String,
    translated_text: String,
) -> TranscriptSegmentRecord {
    TranscriptSegmentRecord {
        segment_id,
        trace_id: String::new(),
        session_id,
        input_language,
        output_language,
        start_time_ms,
        end_time_ms,
        input_text,
        translated_text,
        pipeline_mode: "cascaded".to_string(),
        capture_mode: "Real ASR + Real Translation".to_string(),
        asr_model_used: String::new(),
        asr_device_used: String::new(),
        asr_compute_type_used: String::new(),
        translation_engine_used: String::new(),
        model_fallback_used: false,
        error_message: String::new(),
        created_at_iso: String::new(),
        quality: TranscriptQualityMetrics::default(),
        replay: TranscriptReplayPaths::default(),
    }
}
