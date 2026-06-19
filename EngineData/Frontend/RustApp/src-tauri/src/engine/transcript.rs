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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SegmentWindow {
    pub start_time_ms: i64,
    pub end_time_ms: i64,
    pub speech_ms: i64,
    pub silence_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SegmentBuildRequest {
    pub segment_id: String,
    pub session_id: String,
    pub input_language: Option<String>,
    pub output_language: Option<String>,
    pub start_time_ms: i64,
    pub end_time_ms: i64,
    pub input_text: Option<String>,
    pub translated_text: Option<String>,
    pub trace_id: Option<String>,
    pub source_audio_path: Option<String>,
    pub translated_audio_path: Option<String>,
    pub pipeline_mode: Option<String>,
    pub capture_mode: Option<String>,
    pub asr_model_used: Option<String>,
    pub asr_device_used: Option<String>,
    pub asr_compute_type_used: Option<String>,
    pub translation_engine_used: Option<String>,
    pub model_fallback_used: Option<bool>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptSegmentInput {
    pub segment_id: String,
    pub session_id: String,
    pub input_language: String,
    pub output_language: String,
    pub start_time_ms: i64,
    pub end_time_ms: i64,
    pub input_text: String,
    pub translated_text: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SegmentBuildReport {
    pub valid_duration: bool,
    pub duration_ms: i64,
    pub segment: TranscriptSegmentRecord,
    pub warning: String,
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

impl TranscriptReplayPaths {
    pub fn from_paths(
        source_audio_path: Option<String>,
        translated_audio_path: Option<String>,
    ) -> Self {
        let source_replay_available = source_audio_path
            .as_ref()
            .map(|value| !value.trim().is_empty())
            .unwrap_or(false);
        let target_voice_available = translated_audio_path
            .as_ref()
            .map(|value| !value.trim().is_empty())
            .unwrap_or(false);
        Self {
            source_audio_path,
            translated_audio_path,
            source_replay_available,
            target_voice_available,
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

pub fn is_valid_segment_duration(window: &SegmentWindow) -> bool {
    let duration_ms = (window.end_time_ms - window.start_time_ms).max(0);
    (500..=8000).contains(&duration_ms)
}

pub fn build_segment_from_request(request: SegmentBuildRequest) -> SegmentBuildReport {
    let replay = TranscriptReplayPaths::from_paths(
        request.source_audio_path.clone(),
        request.translated_audio_path.clone(),
    );
    let segment = TranscriptSegmentRecord {
        segment_id: request.segment_id,
        trace_id: request.trace_id.unwrap_or_default(),
        session_id: request.session_id,
        input_language: request.input_language.unwrap_or_else(|| "id".to_string()),
        output_language: request.output_language.unwrap_or_else(|| "en".to_string()),
        start_time_ms: request.start_time_ms,
        end_time_ms: request.end_time_ms,
        input_text: request.input_text.unwrap_or_default(),
        translated_text: request.translated_text.unwrap_or_default(),
        pipeline_mode: request
            .pipeline_mode
            .unwrap_or_else(|| "cascaded".to_string()),
        capture_mode: request
            .capture_mode
            .unwrap_or_else(|| "Real ASR + Real Translation".to_string()),
        asr_model_used: request.asr_model_used.unwrap_or_default(),
        asr_device_used: request.asr_device_used.unwrap_or_default(),
        asr_compute_type_used: request.asr_compute_type_used.unwrap_or_default(),
        translation_engine_used: request.translation_engine_used.unwrap_or_default(),
        model_fallback_used: request.model_fallback_used.unwrap_or(false),
        error_message: request.error_message.unwrap_or_default(),
        created_at_iso: String::new(),
        quality: TranscriptQualityMetrics::default(),
        replay,
    };
    let duration_ms = segment.duration_ms();
    let valid_duration = (500..=8000).contains(&duration_ms);
    let warning = if valid_duration {
        String::new()
    } else {
        format!("segment_duration_out_of_range:{duration_ms}")
    };
    SegmentBuildReport {
        valid_duration,
        duration_ms,
        segment,
        warning,
    }
}

pub fn build_transcript_segment(input: TranscriptSegmentInput) -> TranscriptSegmentRecord {
    build_segment_from_request(SegmentBuildRequest {
        segment_id: input.segment_id,
        session_id: input.session_id,
        input_language: Some(input.input_language),
        output_language: Some(input.output_language),
        start_time_ms: input.start_time_ms,
        end_time_ms: input.end_time_ms,
        input_text: Some(input.input_text),
        translated_text: Some(input.translated_text),
        trace_id: None,
        source_audio_path: None,
        translated_audio_path: None,
        pipeline_mode: None,
        capture_mode: None,
        asr_model_used: None,
        asr_device_used: None,
        asr_compute_type_used: None,
        translation_engine_used: None,
        model_fallback_used: None,
        error_message: None,
    })
    .segment
}
