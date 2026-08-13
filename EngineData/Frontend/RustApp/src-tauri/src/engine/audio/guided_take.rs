use serde::Serialize;
use std::sync::{Mutex, OnceLock};

pub const GUIDED_TAKE_SAMPLE_RATE_HZ: u32 = 32_000;
pub const GUIDED_TAKE_CHANNELS: u16 = 1;
pub const GUIDED_TAKE_BITS_PER_SAMPLE: u16 = 16;
const MAX_GUIDED_CAPTURE_MS: u64 = 60_000;

#[derive(Debug, Clone, Serialize)]
pub struct GuidedTakeReview {
    pub line_id: u32,
    pub duration_ms: u64,
    pub quality_blocker: String,
}

pub struct CapturedGuidedTake {
    pub line_id: u32,
    pub sample_rate_hz: u32,
    pub samples_mono: Vec<f32>,
}

struct ActiveGuidedTake {
    line_id: u32,
    sample_rate_hz: Option<u32>,
    channels: Option<u16>,
    samples_mono: Vec<f32>,
    source_format_changed: bool,
    safety_limit_reached: bool,
}

static ACTIVE_GUIDED_TAKE: OnceLock<Mutex<Option<ActiveGuidedTake>>> = OnceLock::new();

fn store() -> &'static Mutex<Option<ActiveGuidedTake>> {
    ACTIVE_GUIDED_TAKE.get_or_init(|| Mutex::new(None))
}

pub fn arm_guided_take(line_id: u32) -> Result<(), String> {
    if line_id == 0 {
        return Err("voice_lab:invalid_guided_line".to_string());
    }
    let mut guard = store()
        .lock()
        .map_err(|_| "voice_lab:guided_capture_state_unavailable".to_string())?;
    if guard.is_some() {
        return Err("voice_lab:guided_capture_already_active".to_string());
    }
    *guard = Some(ActiveGuidedTake {
        line_id,
        sample_rate_hz: None,
        channels: None,
        samples_mono: Vec::new(),
        source_format_changed: false,
        safety_limit_reached: false,
    });
    Ok(())
}

pub fn cancel_guided_take() {
    if let Ok(mut guard) = store().lock() {
        *guard = None;
    }
}

pub fn append_guided_f32(data: &[f32], rate: u32, channels: u16) {
    append_mono(rate, channels, data.chunks_exact(usize::from(channels.max(1))).map(|frame| {
        frame.iter().copied().map(safe_sample).sum::<f32>() / frame.len().max(1) as f32
    }));
}

pub fn append_guided_i16(data: &[i16], rate: u32, channels: u16) {
    append_mono(rate, channels, data.chunks_exact(usize::from(channels.max(1))).map(|frame| {
        frame.iter().map(|sample| *sample as f32 / 32_768.0).sum::<f32>() / frame.len().max(1) as f32
    }));
}

pub fn append_guided_u16(data: &[u16], rate: u32, channels: u16) {
    append_mono(rate, channels, data.chunks_exact(usize::from(channels.max(1))).map(|frame| {
        frame.iter().map(|sample| (*sample as f32 / 65_535.0) * 2.0 - 1.0).sum::<f32>() / frame.len().max(1) as f32
    }));
}

fn append_mono(rate: u32, channels: u16, samples: impl Iterator<Item = f32>) {
    if rate == 0 || channels == 0 {
        return;
    }
    let Ok(mut guard) = store().lock() else { return; };
    let Some(take) = guard.as_mut() else { return; };
    match (take.sample_rate_hz, take.channels) {
        (None, None) => {
            take.sample_rate_hz = Some(rate);
            take.channels = Some(channels);
        }
        (Some(old_rate), Some(old_channels)) if old_rate != rate || old_channels != channels => {
            take.source_format_changed = true;
            return;
        }
        _ => {}
    }
    if take.safety_limit_reached {
        return;
    }
    let max_samples = (u64::from(rate) * MAX_GUIDED_CAPTURE_MS / 1_000) as usize;
    for sample in samples {
        if take.samples_mono.len() >= max_samples {
            take.safety_limit_reached = true;
            break;
        }
        take.samples_mono.push(safe_sample(sample));
    }
}

pub fn take_guided_audio() -> Result<CapturedGuidedTake, String> {
    let take = store()
        .lock()
        .map_err(|_| "voice_lab:guided_capture_state_unavailable".to_string())?
        .take()
        .ok_or_else(|| "voice_lab:no_active_guided_capture".to_string())?;
    if take.source_format_changed {
        return Err("voice_lab:microphone_format_changed_during_take".to_string());
    }
    if take.safety_limit_reached {
        return Err("voice_lab:recording_safety_limit_reached".to_string());
    }
    let sample_rate_hz = take.sample_rate_hz.ok_or_else(|| "voice_lab:take_has_no_audio".to_string())?;
    if take.samples_mono.is_empty() {
        return Err("voice_lab:take_has_no_audio".to_string());
    }
    Ok(CapturedGuidedTake {
        line_id: take.line_id,
        sample_rate_hz,
        samples_mono: take.samples_mono,
    })
}

fn safe_sample(value: f32) -> f32 {
    if value.is_finite() { value.clamp(-1.0, 1.0) } else { 0.0 }
}
