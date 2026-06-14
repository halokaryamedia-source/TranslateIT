use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LatencyMetrics {
    pub audio_verify_ms: Option<f32>,
    pub speech_detection_ms: Option<f32>,
    pub asr_ms: Option<f32>,
    pub translation_ms: Option<f32>,
    pub tts_ms: Option<f32>,
    pub total_after_eos_ms: Option<f32>,
    pub speech_duration_ms: Option<f32>,
    pub delay_after_speech_end_ms: Option<f32>,
    pub total_realtime_ms: Option<f32>,
    pub missing_latency_ms: Option<f32>,
    pub main_bottleneck_stage: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityReport {
    pub accepted: bool,
    pub reason: String,
    pub confidence: Option<f32>,
    pub language_probability: Option<f32>,
    pub no_speech_probability: Option<f32>,
    pub average_log_probability: Option<f32>,
    pub compression_ratio: Option<f32>,
    pub audio_evidence: Option<AudioEvidence>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioEvidence {
    pub rms: f32,
    pub peak: f32,
    pub mean_abs: Option<f32>,
    pub peak_to_rms_ratio: Option<f32>,
    pub speech_to_noise_gap: f32,
    pub voiced_frame_ratio: f32,
    pub zero_crossing_rate: f32,
    pub frame_energy_concentration: Option<f32>,
    pub frame_active_ratio: Option<f32>,
    pub impulse_edge_ratio: Option<f32>,
    pub clipping_ratio: Option<f32>,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptSegmentPayload {
    pub segment_id: String,
    pub source_language: String,
    pub target_language: String,
    pub detected_language: Option<String>,
    pub original_text: String,
    pub normalized_source_text: Option<String>,
    pub translated_text: Option<String>,
    pub source_audio_path: Option<String>,
    pub translated_audio_path: Option<String>,
    pub translation_engine: Option<String>,
    pub asr_model: Option<String>,
    pub voice_profile_id: Option<String>,
    pub capture_mode: Option<String>,
    pub reject_reason_code: Option<String>,
    pub latency: LatencyMetrics,
    pub quality: QualityReport,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkerHealthSnapshot {
    pub worker_alive: bool,
    pub active_workers: Vec<String>,
    pub failed_workers: Vec<String>,
    pub stale_job_rejected_count: i64,
    pub last_exception: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedSessionPayload {
    pub schema_version: u32,
    pub session_id: String,
    pub created_unix_ms: u128,
    pub app_version: Option<String>,
    pub source_language: Option<String>,
    pub target_language: Option<String>,
    pub vad_preset: Option<String>,
    pub worker_health: Option<WorkerHealthSnapshot>,
    pub segments: Vec<TranscriptSegmentPayload>,
}
