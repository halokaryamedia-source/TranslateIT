use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LatencyMetrics {
    pub audio_verify_ms: Option<f32>,
    pub speech_detection_ms: Option<f32>,
    pub asr_ms: Option<f32>,
    pub translation_ms: Option<f32>,
    pub tts_ms: Option<f32>,
    pub total_after_eos_ms: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityReport {
    pub accepted: bool,
    pub reason: String,
    pub confidence: Option<f32>,
    pub language_probability: Option<f32>,
    pub audio_evidence: Option<AudioEvidence>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioEvidence {
    pub rms: f32,
    pub peak: f32,
    pub speech_to_noise_gap: f32,
    pub voiced_frame_ratio: f32,
    pub zero_crossing_rate: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptSegmentPayload {
    pub segment_id: String,
    pub source_language: String,
    pub target_language: String,
    pub original_text: String,
    pub translated_text: Option<String>,
    pub source_audio_path: Option<String>,
    pub translated_audio_path: Option<String>,
    pub latency: LatencyMetrics,
    pub quality: QualityReport,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedSessionPayload {
    pub schema_version: u32,
    pub session_id: String,
    pub created_unix_ms: u128,
    pub segments: Vec<TranscriptSegmentPayload>,
}
