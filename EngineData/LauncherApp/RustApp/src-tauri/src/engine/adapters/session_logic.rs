use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionMetricRequest {
    pub segment_id: String,
    pub quality_status: Option<String>,
    pub speech_duration_ms: Option<i64>,
    pub delay_after_speech_end_ms: Option<i64>,
    pub total_latency_ms: Option<i64>,
    pub endpoint_wait_ms: Option<i64>,
    pub vad_speech_detect_ms: Option<i64>,
    pub asr_latency_ms: Option<i64>,
    pub asr_ms: Option<i64>,
    pub translation_latency_ms: Option<i64>,
    pub translation_ms: Option<i64>,
    pub tts_voice_start_proxy_ms: Option<i64>,
    pub tts_playback_start_ms: Option<i64>,
    pub tts_direct_speak_called_ms: Option<i64>,
    pub tts_voice_generate_ms: Option<i64>,
    pub speech_end_to_voice_proxy_ms: Option<i64>,
    pub tts_queue_depth: Option<i64>,
    pub tts_backend_selected: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct IssueSignals {
    pub status: String,
    pub primary_stage: String,
    pub primary_reason: String,
    pub audio_verify: String,
    pub stt: String,
    pub translate: String,
    pub tts: String,
    pub speech_end_to_voice_proxy_ms: Option<i64>,
    pub missing_latency_ms: i64,
    pub tts_queue_depth: Option<i64>,
    pub voice_signal_state: String,
    pub triage_points: Vec<String>,
    pub triage_hint: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SessionMetricReport {
    pub segment_id: String,
    pub speech_duration_ms: i64,
    pub delay_after_speech_end_ms: i64,
    pub total_latency_ms: i64,
    pub input_latency_budget_ms: i64,
    pub output_latency_budget_ms: i64,
    pub io_latency_budget_ms: i64,
    pub component_total_delay_ms: i64,
    pub pipeline_component_total_ms: i64,
    pub main_bottleneck_stage: String,
    pub main_bottleneck_reason: String,
    pub audio_verify_bottleneck: String,
    pub stt_bottleneck: String,
    pub translate_bottleneck: String,
    pub tts_bottleneck: String,
    pub issue_signals: IssueSignals,
    pub issue_summary: String,
    pub audio_verify_ms: i64,
    pub stt_ms: i64,
    pub translate_ms: i64,
    pub tts_ms: i64,
    pub speech_end_to_voice_proxy_ms: Option<i64>,
    pub missing_latency_ms: i64,
    pub app_vs_stopwatch_delta_ms: i64,
    pub missing_latency_assigned_to: String,
    pub raw_component_total_ms: i64,
    pub calibrated_total_ms: i64,
    pub speech_start_to_first_voice_ms: i64,
    pub total_after_eos_ms: i64,
    pub stopwatch_alignment_delta_ms: i64,
    pub legacy_metric_not_trusted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkerHealthRequest {
    pub segment_id: String,
    pub worker_alive: bool,
    pub active_workers: Vec<String>,
    pub failed_workers: Vec<String>,
    pub stale_job_rejected_count: i64,
    pub last_exception: Option<String>,
    pub last_job_started_time: Option<String>,
    pub last_job_finished_time: Option<String>,
    pub last_heartbeat_time: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct WorkerHealthReport {
    pub segment_id: String,
    pub status: String,
    pub worker_alive: bool,
    pub active_workers: Vec<String>,
    pub failed_workers: Vec<String>,
    pub stale_job_rejected_count: i64,
    pub last_exception: String,
    pub last_job_started_time: String,
    pub last_job_finished_time: String,
    pub last_heartbeat_time: String,
    pub worker_issue_status: String,
    pub worker_issue_reason: String,
    pub worker_health_note: String,
    pub safe_to_restart: bool,
}

pub fn build_session_metric_report(request: SessionMetricRequest) -> SessionMetricReport {
    let speech_duration_ms = positive(request.speech_duration_ms);
    let delay_after_speech_end_ms = positive(request.delay_after_speech_end_ms);
    let total_latency_ms = positive(request.total_latency_ms);
    let audio_verify_ms = positive(request.endpoint_wait_ms).max(positive(request.vad_speech_detect_ms));
    let stt_ms = positive(request.asr_latency_ms).max(positive(request.asr_ms));
    let translate_ms = positive(request.translation_latency_ms).max(positive(request.translation_ms));
    let tts_ms = positive(request.tts_voice_start_proxy_ms)
        .max(positive(request.tts_playback_start_ms))
        .max(positive(request.tts_direct_speak_called_ms))
        .max(positive(request.tts_voice_generate_ms));
    let component_total = audio_verify_ms + stt_ms + translate_ms + tts_ms;
    let missing_latency_ms = (total_latency_ms - component_total).max(0);
    let input_latency_budget_ms = audio_verify_ms + stt_ms + translate_ms;
    let output_latency_budget_ms = request.speech_end_to_voice_proxy_ms.unwrap_or_else(|| {
        if total_latency_ms > 0 { (total_latency_ms - input_latency_budget_ms).max(0) } else { tts_ms }
    });
    let io_latency_budget_ms = input_latency_budget_ms + output_latency_budget_ms;
    let (main_stage, main_ms) = main_bottleneck(audio_verify_ms, stt_ms, translate_ms, tts_ms, component_total);
    let voice_signal_state = voice_out_state(request.tts_voice_start_proxy_ms, request.speech_end_to_voice_proxy_ms, request.tts_backend_selected.as_deref() == Some("sapi_direct_async"));
    let issue_signals = build_issue_signals(
        request.quality_status.as_deref().unwrap_or_default(),
        if component_total > 0 { "MEASURED" } else { "UNAVAILABLE" },
        &main_stage,
        if component_total > 0 { "Derived from preserved segment latency metrics" } else { "No measurable component recorded" },
        request.speech_end_to_voice_proxy_ms,
        missing_latency_ms,
        request.tts_queue_depth,
        &voice_signal_state,
        if audio_verify_ms > 0 { "endpoint_wait_ms" } else { "Not Run" },
        if stt_ms > 0 { "asr_latency_ms" } else { "Not Run" },
        if translate_ms > 0 { "translation_latency_ms" } else { "Not Run" },
        if tts_ms > 0 { "tts_voice_start_proxy_ms" } else { "Not Run" },
    );
    let issue_summary = issue_signals.triage_hint.clone();

    SessionMetricReport {
        segment_id: request.segment_id,
        speech_duration_ms,
        delay_after_speech_end_ms,
        total_latency_ms,
        input_latency_budget_ms,
        output_latency_budget_ms,
        io_latency_budget_ms,
        component_total_delay_ms: component_total,
        pipeline_component_total_ms: component_total,
        main_bottleneck_stage: main_stage.clone(),
        main_bottleneck_reason: if component_total > 0 { format!("Derived from preserved segment latency metrics: {main_stage}={main_ms}ms") } else { "No measurable component recorded".to_string() },
        audio_verify_bottleneck: if audio_verify_ms > 0 { "endpoint_wait_ms".to_string() } else { "Not Run".to_string() },
        stt_bottleneck: if stt_ms > 0 { "asr_latency_ms".to_string() } else { "Not Run".to_string() },
        translate_bottleneck: if translate_ms > 0 { "translation_latency_ms".to_string() } else { "Not Run".to_string() },
        tts_bottleneck: if tts_ms > 0 { "tts_voice_start_proxy_ms".to_string() } else { "Not Run".to_string() },
        issue_signals,
        issue_summary,
        audio_verify_ms,
        stt_ms,
        translate_ms,
        tts_ms,
        speech_end_to_voice_proxy_ms: request.speech_end_to_voice_proxy_ms,
        missing_latency_ms,
        app_vs_stopwatch_delta_ms: missing_latency_ms,
        missing_latency_assigned_to: if missing_latency_ms > 0 { "unattributed".to_string() } else { String::new() },
        raw_component_total_ms: component_total,
        calibrated_total_ms: total_latency_ms,
        speech_start_to_first_voice_ms: total_latency_ms,
        total_after_eos_ms: delay_after_speech_end_ms,
        stopwatch_alignment_delta_ms: 0,
        legacy_metric_not_trusted: true,
    }
}

pub fn build_worker_health(request: WorkerHealthRequest) -> WorkerHealthReport {
    let last_exception = request.last_exception.unwrap_or_default();
    let active_workers = request.active_workers;
    let failed_workers = request.failed_workers;
    let stale_count = request.stale_job_rejected_count.max(0);
    let safe_to_restart = failed_workers.is_empty() && last_exception.is_empty() && stale_count == 0 && request.worker_alive;
    let (status, reason) = if !last_exception.is_empty() {
        ("error", last_exception.clone())
    } else if !failed_workers.is_empty() {
        ("degraded", "One or more workers failed.".to_string())
    } else if stale_count > 0 {
        ("degraded", "Stale callbacks were rejected.".to_string())
    } else if !request.worker_alive && !active_workers.is_empty() {
        ("degraded", "Active workers are reported, but the worker loop is not alive.".to_string())
    } else {
        ("healthy", "Worker is healthy.".to_string())
    };
    WorkerHealthReport {
        segment_id: request.segment_id,
        status: "initialized".to_string(),
        worker_alive: request.worker_alive,
        active_workers,
        failed_workers,
        stale_job_rejected_count: stale_count,
        last_exception,
        last_job_started_time: request.last_job_started_time.unwrap_or_default(),
        last_job_finished_time: request.last_job_finished_time.unwrap_or_default(),
        last_heartbeat_time: request.last_heartbeat_time.unwrap_or_default(),
        worker_issue_status: status.to_string(),
        worker_issue_reason: reason,
        worker_health_note: "Use worker_issue_status and last_exception first when worker behavior looks inconsistent.".to_string(),
        safe_to_restart,
    }
}

fn build_issue_signals(
    quality_status: &str,
    measurement_status: &str,
    main_stage: &str,
    main_reason: &str,
    speech_end_to_voice_proxy_ms: Option<i64>,
    missing_latency_ms: i64,
    tts_queue_depth: Option<i64>,
    voice_signal_state: &str,
    audio_verify: &str,
    stt: &str,
    translate: &str,
    tts: &str,
) -> IssueSignals {
    let mut triage_points = Vec::new();
    if !quality_status.is_empty() { triage_points.push(format!("quality={quality_status}")); }
    if !measurement_status.is_empty() { triage_points.push(format!("measurement={measurement_status}")); }
    if !main_stage.is_empty() && main_stage != "Not Run" { triage_points.push(format!("bottleneck={main_stage}")); }
    if missing_latency_ms > 0 { triage_points.push(format!("missing_latency={missing_latency_ms}ms")); }
    if let Some(value) = speech_end_to_voice_proxy_ms { triage_points.push(format!("voice_proxy={value}ms")); }
    if let Some(queue_depth) = tts_queue_depth { if queue_depth > 0 { triage_points.push(format!("tts_queue_depth={queue_depth}")); } }
    if voice_signal_state != "unavailable" { triage_points.push(format!("voice_signal={voice_signal_state}")); }
    if triage_points.is_empty() { triage_points.push("no_issue_signals".to_string()); }
    let status = issue_status_label(quality_status, measurement_status);
    let triage_hint = triage_points.join("; ");
    IssueSignals {
        status,
        primary_stage: if main_stage.is_empty() { "Unknown".to_string() } else { main_stage.to_string() },
        primary_reason: if main_reason.is_empty() { "unavailable".to_string() } else { main_reason.to_string() },
        audio_verify: audio_verify.to_string(),
        stt: stt.to_string(),
        translate: translate.to_string(),
        tts: tts.to_string(),
        speech_end_to_voice_proxy_ms,
        missing_latency_ms,
        tts_queue_depth,
        voice_signal_state: voice_signal_state.to_string(),
        triage_points,
        triage_hint,
    }
}

fn issue_status_label(quality_status: &str, measurement_status: &str) -> String {
    let quality = quality_status.trim().to_lowercase();
    let measurement = measurement_status.trim().to_lowercase();
    if !quality.is_empty() && !matches!(quality.as_str(), "accepted" | "measured" | "ok") { return quality; }
    if matches!(measurement.as_str(), "measured" | "partial" | "unavailable") { return measurement; }
    if !quality.is_empty() { quality } else { "unknown".to_string() }
}

fn voice_out_state(voice_start_proxy_ms: Option<i64>, speech_end_to_voice_proxy_ms: Option<i64>, direct_playback: bool) -> String {
    if voice_start_proxy_ms.is_some() || speech_end_to_voice_proxy_ms.is_some() || direct_playback { "proxy".to_string() } else { "unavailable".to_string() }
}

fn main_bottleneck(audio: i64, stt: i64, translate: i64, tts: i64, component_total: i64) -> (String, i64) {
    if component_total <= 0 { return ("Not Run".to_string(), 0); }
    let mut best = ("Audio Verify", audio);
    for candidate in [("STT", stt), ("Translate", translate), ("TTS", tts)] {
        if candidate.1 > best.1 { best = candidate; }
    }
    (best.0.to_string(), best.1)
}

fn positive(value: Option<i64>) -> i64 {
    value.unwrap_or(0).max(0)
}
