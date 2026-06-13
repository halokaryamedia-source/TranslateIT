use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

const DEFAULT_SAFE_VAD_PRESET: &str = "Headset";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LatencyProfileRequest {
    pub requested_vad_preset: Option<String>,
    pub metric_groups: Option<BTreeMap<String, i64>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LatencyProfilePayload {
    pub requested_vad_preset: String,
    pub selected_vad_preset: String,
    pub unsafe_vad_replaced: bool,
    pub profile_is_safe: bool,
    pub largest_remaining_bottleneck_stage: String,
    pub largest_remaining_bottleneck_ms: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LatencyMetricRequest {
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
pub struct LatencyMetricSummary {
    pub measurement_version: String,
    pub legacy_metric_not_trusted: bool,
    pub measurement_status: String,
    pub speech_duration_ms: i64,
    pub delay_after_speech_end_ms: i64,
    pub total_realtime_ms: i64,
    pub speech_to_first_voice_ms: i64,
    pub voice_start_proxy_ms: i64,
    pub voice_completed_ms: i64,
    pub asr_ms: i64,
    pub translation_ms: i64,
    pub tts_ms: i64,
    pub playback_enqueue_to_start_ms: i64,
    pub official_voice_latency_end_event: String,
    pub official_voice_latency_end_event_quality: String,
    pub official_voice_latency_end_event_reason: String,
}

pub fn build_latency_profile_payload(request: LatencyProfileRequest) -> LatencyProfilePayload {
    let requested = request.requested_vad_preset.unwrap_or_default().trim().to_string();
    let selected = resolve_safe_vad_preset(if requested.is_empty() { None } else { Some(requested.as_str()) });
    let unsafe_vad_replaced = !requested.is_empty() && requested != selected;
    let metric_groups = request.metric_groups.unwrap_or_default();
    let bottleneck_stage = metric_groups
        .get("main_bottleneck_stage")
        .map(|value| value.to_string())
        .unwrap_or_else(|| "Unknown".to_string());
    let bottleneck_key = format!("{}_ms", bottleneck_stage.to_lowercase().replace(' ', "_"));
    let largest_remaining_bottleneck_ms = metric_groups.get(&bottleneck_key).copied();

    LatencyProfilePayload {
        requested_vad_preset: requested,
        selected_vad_preset: selected.clone(),
        unsafe_vad_replaced,
        profile_is_safe: is_safe_preset_name(&selected),
        largest_remaining_bottleneck_stage: bottleneck_stage,
        largest_remaining_bottleneck_ms,
    }
}

pub fn build_latency_metric_summary(request: LatencyMetricRequest) -> LatencyMetricSummary {
    let first_voice = first_some(&[
        request.voice_start_proxy_ns,
        request.actual_first_audio_buffer_played_ns,
        request.playback_first_buffer_submit_ns,
        request.playback_started_ns,
    ]);
    let playback_start = first_some(&[
        request.playback_first_buffer_submit_ns,
        request.actual_first_audio_buffer_played_ns,
    ]);
    let official_event = if request.voice_start_proxy_ns.is_some() {
        "voice_start_proxy"
    } else if request.actual_first_audio_buffer_played_ns.is_some() {
        "actual_first_audio_buffer_played"
    } else if request.playback_first_buffer_submit_ns.is_some() {
        "playback_first_buffer_submit"
    } else {
        ""
    };
    let quality = if official_event.is_empty() { "missing" } else { "proxy" };
    let reason = if official_event.is_empty() {
        "first-voice timestamp not available from playback backend"
    } else {
        ""
    };

    LatencyMetricSummary {
        measurement_version: "latency_meter_v2_rebuild_rust".to_string(),
        legacy_metric_not_trusted: true,
        measurement_status: if first_voice.is_some() { "MEASURED" } else { "PARTIAL" }.to_string(),
        speech_duration_ms: ns_to_ms(request.speech_start_ns, request.speech_end_ns).unwrap_or(0),
        delay_after_speech_end_ms: ns_to_ms(request.speech_end_ns, first_voice).unwrap_or(0),
        total_realtime_ms: ns_to_ms(request.speech_start_ns, first_voice).unwrap_or(0),
        speech_to_first_voice_ms: ns_to_ms(request.speech_start_ns, first_voice).unwrap_or(0),
        voice_start_proxy_ms: ns_to_ms(request.speech_start_ns, request.voice_start_proxy_ns).unwrap_or(0),
        voice_completed_ms: ns_to_ms(request.tts_start_ns, request.voice_completed_ns.or(request.tts_audio_ready_ns)).unwrap_or(0),
        asr_ms: ns_to_ms(request.asr_start_ns, request.asr_end_ns).unwrap_or(0),
        translation_ms: ns_to_ms(request.translation_start_ns, request.translation_end_ns).unwrap_or(0),
        tts_ms: ns_to_ms(request.tts_start_ns, request.tts_audio_ready_ns).unwrap_or(0),
        playback_enqueue_to_start_ms: ns_to_ms(request.playback_request_ns, playback_start).unwrap_or(0),
        official_voice_latency_end_event: official_event.to_string(),
        official_voice_latency_end_event_quality: quality.to_string(),
        official_voice_latency_end_event_reason: reason.to_string(),
    }
}

pub fn resolve_safe_vad_preset(requested_name: Option<&str>) -> String {
    let requested = requested_name.unwrap_or_default().trim();
    if requested == "Normal Room" {
        return DEFAULT_SAFE_VAD_PRESET.to_string();
    }
    if !requested.is_empty() && is_safe_preset_name(requested) {
        return requested.to_string();
    }
    DEFAULT_SAFE_VAD_PRESET.to_string()
}

fn is_safe_preset_name(name: &str) -> bool {
    matches!(name, "Headset" | "Noisy Room" | "Push to Talk")
}

fn ns_to_ms(start_ns: Option<i64>, end_ns: Option<i64>) -> Option<i64> {
    match (start_ns, end_ns) {
        (Some(start), Some(end)) => Some(((end - start).max(0)) / 1_000_000),
        _ => None,
    }
}

fn first_some(values: &[Option<i64>]) -> Option<i64> {
    values.iter().copied().flatten().next()
}
