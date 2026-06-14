use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use serde::Serialize;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::engine::runtime_state::RuntimeSessionStateReport;

#[derive(Debug, Clone, Serialize)]
pub struct LiveCaptureStatusReport {
    pub stream_active: bool,
    pub owner_id: Option<String>,
    pub session_id: Option<String>,
    pub device_name: Option<String>,
    pub sample_rate_hz: Option<u32>,
    pub channels: Option<u16>,
    pub sample_format: Option<String>,
    pub started_unix_ms: Option<u128>,
    pub active_age_ms: Option<u128>,
    pub frames_received: u64,
    pub callback_error_count: usize,
    pub latest_callback_error: Option<String>,
    pub blocker: String,
    pub note: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct LiveCaptureStartReport {
    pub ok: bool,
    pub status: LiveCaptureStatusReport,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct LiveCaptureStopReport {
    pub ok: bool,
    pub status: LiveCaptureStatusReport,
    pub message: String,
}

struct LiveCaptureRuntime {
    _stream: cpal::Stream,
    owner_id: String,
    session_id: String,
    device_name: Option<String>,
    sample_rate_hz: u32,
    channels: u16,
    sample_format: String,
    started_unix_ms: u128,
    frames_received: Arc<AtomicU64>,
    callback_errors: Arc<Mutex<Vec<String>>>,
}

static LIVE_CAPTURE_RUNTIME: OnceLock<Mutex<Option<LiveCaptureRuntime>>> = OnceLock::new();

pub fn start_live_capture_runtime(session_state: RuntimeSessionStateReport) -> LiveCaptureStartReport {
    let Some(session) = session_state.snapshot.as_ref() else {
        return blocked_start("live_capture:no_active_session", "Live capture cannot start because no runtime session is active.");
    };

    if !session.safe_to_stop {
        return blocked_start("live_capture:session_not_safe", "Live capture cannot start because the active runtime session is not safe to stop.");
    }

    let store = LIVE_CAPTURE_RUNTIME.get_or_init(|| Mutex::new(None));
    let Ok(mut guard) = store.lock() else {
        return blocked_start("live_capture:state_lock_failed", "Live capture state lock failed before stream creation.");
    };

    if guard.is_some() {
        let status = build_status_from_guard(guard.as_ref());
        return LiveCaptureStartReport {
            ok: false,
            status,
            message: "Live microphone stream is already active. Stop it before starting a new capture stream.".to_string(),
        };
    }

    let host = cpal::default_host();
    let Some(device) = host.default_input_device() else {
        return blocked_start("live_capture:no_default_input", "No default microphone input device was found.");
    };

    let device_name = device.name().ok();
    let Ok(default_config) = device.default_input_config() else {
        return blocked_start("live_capture:no_default_config", "Default microphone exists, but no default input config is available.");
    };

    let sample_format = default_config.sample_format();
    let stream_config: cpal::StreamConfig = default_config.clone().into();
    let sample_rate_hz = stream_config.sample_rate.0;
    let channels = stream_config.channels;
    let frames_received = Arc::new(AtomicU64::new(0));
    let callback_errors = Arc::new(Mutex::new(Vec::new()));

    let stream = match build_stream_for_format(
        &device,
        &stream_config,
        sample_format,
        Arc::clone(&frames_received),
        Arc::clone(&callback_errors),
    ) {
        Ok(stream) => stream,
        Err(error) => {
            return blocked_start("live_capture:stream_build_failed", &format!("Failed to build live microphone stream: {error}"));
        }
    };

    if let Err(error) = stream.play() {
        return blocked_start("live_capture:stream_play_failed", &format!("Failed to start live microphone stream: {error}"));
    }

    let runtime = LiveCaptureRuntime {
        _stream: stream,
        owner_id: session.owner_id.clone(),
        session_id: session.session_id.clone(),
        device_name,
        sample_rate_hz,
        channels,
        sample_format: format!("{sample_format:?}"),
        started_unix_ms: current_unix_ms(),
        frames_received,
        callback_errors,
    };

    *guard = Some(runtime);
    let status = build_status_from_guard(guard.as_ref());

    LiveCaptureStartReport {
        ok: true,
        status,
        message: "Live microphone stream started and is owned by the active Rust runtime session. ASR, translation, and TTS are still separate pending stages.".to_string(),
    }
}

pub fn stop_live_capture_runtime() -> LiveCaptureStopReport {
    let store = LIVE_CAPTURE_RUNTIME.get_or_init(|| Mutex::new(None));
    let Ok(mut guard) = store.lock() else {
        return LiveCaptureStopReport {
            ok: false,
            status: inactive_status("live_capture:state_lock_failed", "Live capture state lock failed while stopping."),
            message: "Live capture stop failed because state lock could not be acquired.".to_string(),
        };
    };

    if guard.is_none() {
        return LiveCaptureStopReport {
            ok: true,
            status: inactive_status("live_capture:not_active", "No live microphone stream was active."),
            message: "No live microphone stream was active. Stop remains safe.".to_string(),
        };
    }

    *guard = None;
    LiveCaptureStopReport {
        ok: true,
        status: inactive_status("live_capture:stopped", "Live microphone stream ownership was released."),
        message: "Live microphone stream stopped and ownership was released.".to_string(),
    }
}

pub fn live_capture_status() -> LiveCaptureStatusReport {
    let store = LIVE_CAPTURE_RUNTIME.get_or_init(|| Mutex::new(None));
    match store.lock() {
        Ok(guard) => build_status_from_guard(guard.as_ref()),
        Err(_) => inactive_status("live_capture:state_lock_failed", "Live capture state lock failed while reading status."),
    }
}

fn build_stream_for_format(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
    sample_format: cpal::SampleFormat,
    frames_received: Arc<AtomicU64>,
    callback_errors: Arc<Mutex<Vec<String>>>,
) -> Result<cpal::Stream, String> {
    let channels = config.channels;
    let error_log = Arc::clone(&callback_errors);
    let error_callback = move |error| {
        if let Ok(mut errors) = error_log.lock() {
            errors.push(error.to_string());
            if errors.len() > 20 {
                errors.remove(0);
            }
        }
    };

    match sample_format {
        cpal::SampleFormat::F32 => device
            .build_input_stream(
                config,
                move |data: &[f32], _| record_f32_frames(data, channels, &frames_received),
                error_callback,
                None,
            )
            .map_err(|error| error.to_string()),
        cpal::SampleFormat::I16 => device
            .build_input_stream(
                config,
                move |data: &[i16], _| record_i16_frames(data, channels, &frames_received),
                error_callback,
                None,
            )
            .map_err(|error| error.to_string()),
        cpal::SampleFormat::U16 => device
            .build_input_stream(
                config,
                move |data: &[u16], _| record_u16_frames(data, channels, &frames_received),
                error_callback,
                None,
            )
            .map_err(|error| error.to_string()),
        other => Err(format!("Unsupported default microphone sample format: {other:?}")),
    }
}

fn record_f32_frames(data: &[f32], channels: u16, frames_received: &Arc<AtomicU64>) {
    let channel_count = usize::from(channels.max(1));
    frames_received.fetch_add((data.len() / channel_count) as u64, Ordering::Relaxed);
}

fn record_i16_frames(data: &[i16], channels: u16, frames_received: &Arc<AtomicU64>) {
    let channel_count = usize::from(channels.max(1));
    frames_received.fetch_add((data.len() / channel_count) as u64, Ordering::Relaxed);
}

fn record_u16_frames(data: &[u16], channels: u16, frames_received: &Arc<AtomicU64>) {
    let channel_count = usize::from(channels.max(1));
    frames_received.fetch_add((data.len() / channel_count) as u64, Ordering::Relaxed);
}

fn build_status_from_guard(runtime: Option<&LiveCaptureRuntime>) -> LiveCaptureStatusReport {
    match runtime {
        Some(runtime) => {
            let active_age_ms = current_unix_ms().saturating_sub(runtime.started_unix_ms);
            let errors = runtime
                .callback_errors
                .lock()
                .ok()
                .map(|guard| guard.clone())
                .unwrap_or_default();
            LiveCaptureStatusReport {
                stream_active: true,
                owner_id: Some(runtime.owner_id.clone()),
                session_id: Some(runtime.session_id.clone()),
                device_name: runtime.device_name.clone(),
                sample_rate_hz: Some(runtime.sample_rate_hz),
                channels: Some(runtime.channels),
                sample_format: Some(runtime.sample_format.clone()),
                started_unix_ms: Some(runtime.started_unix_ms),
                active_age_ms: Some(active_age_ms),
                frames_received: runtime.frames_received.load(Ordering::Relaxed),
                callback_error_count: errors.len(),
                latest_callback_error: errors.last().cloned(),
                blocker: String::new(),
                note: format!(
                    "Live microphone stream is active. age_ms={}, sample_rate_hz={}, channels={}. ASR/translation/TTS remain separate pipeline stages.",
                    active_age_ms, runtime.sample_rate_hz, runtime.channels
                ),
            }
        }
        None => inactive_status("live_capture:not_active", "Live microphone stream is not active."),
    }
}

fn blocked_start(blocker: &str, message: &str) -> LiveCaptureStartReport {
    LiveCaptureStartReport {
        ok: false,
        status: inactive_status(blocker, message),
        message: message.to_string(),
    }
}

fn inactive_status(blocker: &str, note: &str) -> LiveCaptureStatusReport {
    LiveCaptureStatusReport {
        stream_active: false,
        owner_id: None,
        session_id: None,
        device_name: None,
        sample_rate_hz: None,
        channels: None,
        sample_format: None,
        started_unix_ms: None,
        active_age_ms: None,
        frames_received: 0,
        callback_error_count: 0,
        latest_callback_error: None,
        blocker: blocker.to_string(),
        note: note.to_string(),
    }
}

fn current_unix_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}
