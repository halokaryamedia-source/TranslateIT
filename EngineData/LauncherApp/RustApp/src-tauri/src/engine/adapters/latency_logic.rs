use serde::{Deserialize, Serialize};

const MAX_LATENCY_MS: i64 = 3_600_000;
const MAX_VAD_PRESET_CHARS: usize = 80;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LatencyLogicRequest {
    pub speech_start_ns: Option<i64>,
    pub speech_end_ns: Option<i64>,
    pub voice_start_proxy_ns: Option<i64>,
    pub actual_first_audio_buffer_played_ns: Option<i64>,
    pub playback_first_buffer_submit_ns: Option<i64>,
    pub playback_started_ns: Option<i64>,
    pub asr_start_ns: Option<i64>,
    pub asr_end_ns: Option<i64>,
    pub translation_start_ns: Option<i64>,
    pub translation_end_ns: Option<i64>,
    pub tts_start_ns: Option<i64>,
    pub tts_audio_ready_ns: Option<i64>,
    pub voice_completed_ns: Option<i64>,
    pub playback_request_ns: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LatencyLogicReport {
    pub measurement_version: String,
    pub legacy_metric_not_trusted: bool,
    pub measurement_status: String,
    pub speech_duration_ms: i64,
    pub delay_after_speech_end_ms: i64,
    pub total_realtime_ms: i64,
    pub asr_ms: i64,
    pub translation_ms: i64,
    pub tts_ms: i64,
    pub playback_enqueue_to_start_ms: i64,
    pub official_voice_latency_end_event: String,
    pub official_voice_latency_end_event_quality: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VadProfileRequest {
    pub requested_vad_preset: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct VadProfileReport {
    pub requested_vad_preset: String,
    pub selected_vad_preset: String,
    pub unsafe_vad_replaced: bool,
    pub profile_is_safe: bool,
}

pub fn build_latency_logic(request: LatencyLogicRequest) -> LatencyLogicReport {
    let first_voice = first_some(&[
        request.voice_start_proxy_ns,
        request.actual_first_audio_buffer_played_ns,
        request.playback_first_buffer_submit_ns,
        request.playback_started_ns,
    ]);
    let playback_start = first_some(&[request.playback_first_buffer_submit_ns, request.actual_first_audio_buffer_played_ns]);
    let end_event = if request.voice_start_proxy_ns.is_some() {
        "voice_start_proxy"
    } else if request.actual_first_audio_buffer_played_ns.is_some() {
        "actual_first_audio_buffer_played"
    } else if request.playback_first_buffer_submit_ns.is_some() {
        "playback_first_buffer_submit"
    } else {
        ""
    };
    LatencyLogicReport {
        measurement_version: "latency_meter_v2_rebuild_rust".to_string(),
        legacy_metric_not_trusted: true,
        measurement_status: if first_voice.is_some() { "MEASURED" } else { "PARTIAL" }.to_string(),
        speech_duration_ms: ns_to_ms(request.speech_start_ns, request.speech_end_ns).unwrap_or(0),
        delay_after_speech_end_ms: ns_to_ms(request.speech_end_ns, first_voice).unwrap_or(0),
        total_realtime_ms: ns_to_ms(request.speech_start_ns, first_voice).unwrap_or(0),
        asr_ms: ns_to_ms(request.asr_start_ns, request.asr_end_ns).unwrap_or(0),
        translation_ms: ns_to_ms(request.translation_start_ns, request.translation_end_ns).unwrap_or(0),
        tts_ms: ns_to_ms(request.tts_start_ns, request.tts_audio_ready_ns).unwrap_or(0),
        playback_enqueue_to_start_ms: ns_to_ms(request.playback_request_ns, playback_start).unwrap_or(0),
        official_voice_latency_end_event: end_event.to_string(),
        official_voice_latency_end_event_quality: if end_event.is_empty() { "missing" } else { "proxy" }.to_string(),
    }
}

pub fn build_vad_profile(request: VadProfileRequest) -> VadProfileReport {
    let requested = clean_preset(request.requested_vad_preset.as_deref().unwrap_or_default());
    let selected = resolve_safe_vad_preset(&requested);
    VadProfileReport {
        requested_vad_preset: requested.clone(),
        selected_vad_preset: selected.clone(),
        unsafe_vad_replaced: !requested.is_empty() && requested != selected,
        profile_is_safe: is_safe_preset(&selected),
    }
}

fn clean_preset(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|character| !character.is_control())
        .take(MAX_VAD_PRESET_CHARS)
        .collect::<String>()
}

fn resolve_safe_vad_preset(requested: &str) -> String {
    if requested == "Normal Room" || requested.is_empty() || !is_safe_preset(requested) {
        "Headset".to_string()
    } else {
        requested.to_string()
    }
}

fn is_safe_preset(name: &str) -> bool {
    matches!(name, "Headset" | "Noisy Room" | "Push to Talk")
}

fn ns_to_ms(start: Option<i64>, end: Option<i64>) -> Option<i64> {
    match (start, end) {
        (Some(s), Some(e)) => Some(((e.saturating_sub(s)).max(0) / 1_000_000).min(MAX_LATENCY_MS)),
        _ => None,
    }
}

fn first_some(values: &[Option<i64>]) -> Option<i64> {
    values.iter().copied().flatten().next()
}