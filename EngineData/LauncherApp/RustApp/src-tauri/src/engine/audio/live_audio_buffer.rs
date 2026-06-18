use serde::Serialize;
use std::sync::{Mutex, OnceLock};

use super::evidence::AudioEvidenceReport;
use super::vad::{evaluate_vad_gate, VadGateConfig, VadGateResult};
use super::{AudioFrame, TARGET_CHANNELS, TARGET_SAMPLE_RATE_HZ};

const MAX_BUFFER_MS: u32 = 2_000;
const MIN_VAD_MS: u32 = 160;
const MIN_SEGMENT_MS: u32 = 320;
const MAX_SEGMENT_MS: u32 = 1_500;

#[derive(Debug, Clone, Serialize)]
pub struct LiveAudioBufferStatusReport {
    pub has_audio: bool,
    pub sample_rate_hz: Option<u32>,
    pub source_channels: Option<u16>,
    pub buffer_channels: u16,
    pub target_sample_rate_hz: u32,
    pub target_channels: u16,
    pub buffered_samples: usize,
    pub max_buffer_samples: usize,
    pub buffered_duration_ms: u32,
    pub frames_received: u64,
    pub requires_resample_to_target: bool,
    pub source_downmixed_to_mono: bool,
    pub ready_for_vad: bool,
    pub ready_for_segment_pipeline: bool,
    pub ready_for_target_asr_frame: bool,
    pub evidence: AudioEvidenceReport,
    pub vad_result: VadGateResult,
    pub blocker: String,
    pub note: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct LiveTargetSegmentReport {
    pub ready: bool,
    pub source_sample_rate_hz: Option<u32>,
    pub source_channels: Option<u16>,
    pub target_sample_rate_hz: u32,
    pub target_channels: u16,
    pub source_duration_ms: u32,
    pub target_duration_ms: u32,
    pub source_sample_count: usize,
    pub target_sample_count: usize,
    pub resampled: bool,
    pub downmixed_to_mono: bool,
    pub evidence: AudioEvidenceReport,
    pub vad_result: VadGateResult,
    pub frame: Option<AudioFrame>,
    pub blocker: String,
    pub note: String,
}

#[derive(Debug, Clone)]
struct LiveAudioWindow {
    sample_rate_hz: u32,
    source_channels: u16,
    max_buffer_samples: usize,
    samples_mono: Vec<f32>,
    frames_received: u64,
}

static LIVE_AUDIO_WINDOW: OnceLock<Mutex<Option<LiveAudioWindow>>> = OnceLock::new();

pub fn reset_live_audio_buffer(
    sample_rate_hz: u32,
    source_channels: u16,
) -> LiveAudioBufferStatusReport {
    let max_buffer_samples = max_buffer_samples(sample_rate_hz);
    let window = LiveAudioWindow {
        sample_rate_hz,
        source_channels,
        max_buffer_samples,
        samples_mono: Vec::with_capacity(max_buffer_samples.min(96_000)),
        frames_received: 0,
    };

    let store = LIVE_AUDIO_WINDOW.get_or_init(|| Mutex::new(None));
    if let Ok(mut guard) = store.lock() {
        *guard = Some(window);
    }

    live_audio_buffer_status()
}

pub fn clear_live_audio_buffer() -> LiveAudioBufferStatusReport {
    let store = LIVE_AUDIO_WINDOW.get_or_init(|| Mutex::new(None));
    if let Ok(mut guard) = store.lock() {
        *guard = None;
    }
    inactive_status(
        "live_audio_buffer:cleared",
        "Live audio rolling buffer was cleared.",
    )
}

pub fn append_live_f32_samples(samples: &[f32], sample_rate_hz: u32, source_channels: u16) {
    append_mono_samples(
        &downmix_f32(samples, source_channels),
        sample_rate_hz,
        source_channels,
    );
}

pub fn append_live_i16_samples(samples: &[i16], sample_rate_hz: u32, source_channels: u16) {
    let converted = samples
        .iter()
        .map(|sample| (*sample as f32 / i16::MAX as f32).clamp(-1.0, 1.0))
        .collect::<Vec<_>>();
    append_mono_samples(
        &downmix_f32(&converted, source_channels),
        sample_rate_hz,
        source_channels,
    );
}

pub fn append_live_u16_samples(samples: &[u16], sample_rate_hz: u32, source_channels: u16) {
    let converted = samples
        .iter()
        .map(|sample| ((*sample as f32 / u16::MAX as f32) * 2.0 - 1.0).clamp(-1.0, 1.0))
        .collect::<Vec<_>>();
    append_mono_samples(
        &downmix_f32(&converted, source_channels),
        sample_rate_hz,
        source_channels,
    );
}

pub fn live_audio_buffer_status() -> LiveAudioBufferStatusReport {
    let store = LIVE_AUDIO_WINDOW.get_or_init(|| Mutex::new(None));
    match store.lock() {
        Ok(guard) => build_status(guard.as_ref()),
        Err(_) => inactive_status(
            "live_audio_buffer:state_lock_failed",
            "Live audio buffer state lock failed while reading status.",
        ),
    }
}

pub fn live_target_segment_snapshot() -> LiveTargetSegmentReport {
    let store = LIVE_AUDIO_WINDOW.get_or_init(|| Mutex::new(None));
    match store.lock() {
        Ok(guard) => build_target_segment(guard.as_ref()),
        Err(_) => inactive_segment(
            "live_target_segment:state_lock_failed",
            "Live target segment state lock failed while reading buffer.",
        ),
    }
}

fn append_mono_samples(samples_mono: &[f32], sample_rate_hz: u32, source_channels: u16) {
    if samples_mono.is_empty() {
        return;
    }

    let store = LIVE_AUDIO_WINDOW.get_or_init(|| Mutex::new(None));
    let Ok(mut guard) = store.lock() else {
        return;
    };

    if guard.is_none() {
        *guard = Some(LiveAudioWindow {
            sample_rate_hz,
            source_channels,
            max_buffer_samples: max_buffer_samples(sample_rate_hz),
            samples_mono: Vec::new(),
            frames_received: 0,
        });
    }

    let Some(window) = guard.as_mut() else {
        return;
    };

    if window.sample_rate_hz != sample_rate_hz || window.source_channels != source_channels {
        window.sample_rate_hz = sample_rate_hz;
        window.source_channels = source_channels;
        window.max_buffer_samples = max_buffer_samples(sample_rate_hz);
        window.samples_mono.clear();
        window.frames_received = 0;
    }

    window.frames_received = window
        .frames_received
        .saturating_add(samples_mono.len() as u64);
    window
        .samples_mono
        .extend(samples_mono.iter().map(|sample| sample.clamp(-1.0, 1.0)));

    if window.samples_mono.len() > window.max_buffer_samples {
        let excess = window.samples_mono.len() - window.max_buffer_samples;
        window.samples_mono.drain(0..excess);
    }
}

fn build_status(window: Option<&LiveAudioWindow>) -> LiveAudioBufferStatusReport {
    let Some(window) = window else {
        return inactive_status(
            "live_audio_buffer:not_active",
            "Live audio rolling buffer is not active.",
        );
    };

    let buffered_samples = window.samples_mono.len();
    let buffered_duration_ms = duration_ms(buffered_samples, window.sample_rate_hz);
    let evidence = AudioEvidenceReport::from_samples(&window.samples_mono);
    let vad_result = evaluate_vad_gate(evidence.clone(), &VadGateConfig::default());
    let requires_resample_to_target = window.sample_rate_hz != TARGET_SAMPLE_RATE_HZ;
    let source_downmixed_to_mono = window.source_channels != TARGET_CHANNELS;
    let ready_for_vad = buffered_duration_ms >= MIN_VAD_MS && vad_result.accepted;
    let ready_for_segment_pipeline = ready_for_vad && buffered_duration_ms >= MIN_SEGMENT_MS;
    let ready_for_target_asr_frame = ready_for_segment_pipeline;

    let blocker = if !ready_for_vad && buffered_duration_ms < MIN_VAD_MS {
        "live_audio_buffer:not_enough_audio_for_vad".to_string()
    } else if !ready_for_vad {
        format!("live_audio_buffer:vad_rejected:{}", vad_result.reason)
    } else if !ready_for_segment_pipeline {
        "live_audio_buffer:not_enough_audio_for_segment".to_string()
    } else {
        String::new()
    };

    let note = if ready_for_target_asr_frame {
        format!(
            "Live audio buffer is ready for target ASR frame extraction. duration_ms={}, source_rate={}, resample_required={}, source_downmixed_to_mono={}, rms={:.5}, peak={:.5}",
            buffered_duration_ms,
            window.sample_rate_hz,
            requires_resample_to_target,
            source_downmixed_to_mono,
            evidence.rms,
            evidence.peak
        )
    } else if ready_for_vad {
        format!(
            "Live audio has passed VAD, but segment duration is not ready yet. duration_ms={}, blocker={}",
            buffered_duration_ms, blocker
        )
    } else {
        format!(
            "Live audio buffer is collecting microphone audio. duration_ms={}, blocker={}",
            buffered_duration_ms, blocker
        )
    };

    LiveAudioBufferStatusReport {
        has_audio: buffered_samples > 0,
        sample_rate_hz: Some(window.sample_rate_hz),
        source_channels: Some(window.source_channels),
        buffer_channels: TARGET_CHANNELS,
        target_sample_rate_hz: TARGET_SAMPLE_RATE_HZ,
        target_channels: TARGET_CHANNELS,
        buffered_samples,
        max_buffer_samples: window.max_buffer_samples,
        buffered_duration_ms,
        frames_received: window.frames_received,
        requires_resample_to_target,
        source_downmixed_to_mono,
        ready_for_vad,
        ready_for_segment_pipeline,
        ready_for_target_asr_frame,
        evidence,
        vad_result,
        blocker,
        note,
    }
}

fn build_target_segment(window: Option<&LiveAudioWindow>) -> LiveTargetSegmentReport {
    let Some(window) = window else {
        return inactive_segment(
            "live_target_segment:no_audio_buffer",
            "No live audio buffer exists yet.",
        );
    };

    let status = build_status(Some(window));
    if !status.ready_for_target_asr_frame {
        return blocked_segment(
            &status.blocker,
            &status.note,
            Some(window),
            &status.evidence,
            &status.vad_result,
        );
    }

    let source_take_samples =
        samples_for_duration(window.sample_rate_hz, MAX_SEGMENT_MS).min(window.samples_mono.len());
    let source_start = window
        .samples_mono
        .len()
        .saturating_sub(source_take_samples);
    let source_samples = window.samples_mono[source_start..].to_vec();
    let source_duration_ms = duration_ms(source_samples.len(), window.sample_rate_hz);
    let target_samples = if window.sample_rate_hz == TARGET_SAMPLE_RATE_HZ {
        source_samples.clone()
    } else {
        resample_linear(
            &source_samples,
            window.sample_rate_hz,
            TARGET_SAMPLE_RATE_HZ,
        )
    };
    let target_duration_ms = duration_ms(target_samples.len(), TARGET_SAMPLE_RATE_HZ);
    let evidence = AudioEvidenceReport::from_samples(&target_samples);
    let vad_result = evaluate_vad_gate(evidence.clone(), &VadGateConfig::default());

    if target_duration_ms < MIN_SEGMENT_MS || !vad_result.accepted {
        let reason = if target_duration_ms < MIN_SEGMENT_MS {
            "live_target_segment:target_segment_too_short"
        } else {
            "live_target_segment:target_vad_rejected"
        };
        return LiveTargetSegmentReport {
            ready: false,
            source_sample_rate_hz: Some(window.sample_rate_hz),
            source_channels: Some(window.source_channels),
            target_sample_rate_hz: TARGET_SAMPLE_RATE_HZ,
            target_channels: TARGET_CHANNELS,
            source_duration_ms,
            target_duration_ms,
            source_sample_count: source_samples.len(),
            target_sample_count: target_samples.len(),
            resampled: window.sample_rate_hz != TARGET_SAMPLE_RATE_HZ,
            downmixed_to_mono: window.source_channels != TARGET_CHANNELS,
            evidence,
            vad_result,
            frame: None,
            blocker: reason.to_string(),
            note: "Target ASR frame extraction failed final target-format checks.".to_string(),
        };
    }

    let frame = AudioFrame {
        sample_rate_hz: TARGET_SAMPLE_RATE_HZ,
        channels: TARGET_CHANNELS,
        samples: target_samples.clone(),
    };

    LiveTargetSegmentReport {
        ready: true,
        source_sample_rate_hz: Some(window.sample_rate_hz),
        source_channels: Some(window.source_channels),
        target_sample_rate_hz: TARGET_SAMPLE_RATE_HZ,
        target_channels: TARGET_CHANNELS,
        source_duration_ms,
        target_duration_ms,
        source_sample_count: source_samples.len(),
        target_sample_count: target_samples.len(),
        resampled: window.sample_rate_hz != TARGET_SAMPLE_RATE_HZ,
        downmixed_to_mono: window.source_channels != TARGET_CHANNELS,
        evidence,
        vad_result,
        frame: Some(frame),
        blocker: String::new(),
        note: format!(
            "Target ASR frame is ready. source_ms={}, target_ms={}, target_samples={}, resampled={}, downmixed_to_mono={}",
            source_duration_ms,
            target_duration_ms,
            target_samples.len(),
            window.sample_rate_hz != TARGET_SAMPLE_RATE_HZ,
            window.source_channels != TARGET_CHANNELS
        ),
    }
}

fn downmix_f32(samples: &[f32], source_channels: u16) -> Vec<f32> {
    let channel_count = usize::from(source_channels.max(1));
    if channel_count == 1 {
        return samples
            .iter()
            .map(|sample| sample.clamp(-1.0, 1.0))
            .collect();
    }

    samples
        .chunks(channel_count)
        .map(|frame| {
            let sum = frame
                .iter()
                .map(|sample| sample.clamp(-1.0, 1.0))
                .sum::<f32>();
            sum / frame.len().max(1) as f32
        })
        .collect()
}

fn resample_linear(samples: &[f32], source_rate: u32, target_rate: u32) -> Vec<f32> {
    if samples.is_empty() || source_rate == 0 || target_rate == 0 {
        return Vec::new();
    }
    if source_rate == target_rate {
        return samples.to_vec();
    }

    let target_len =
        ((samples.len() as u64 * target_rate as u64) / source_rate as u64).max(1) as usize;
    if samples.len() == 1 {
        return vec![samples[0]; target_len];
    }

    let ratio = source_rate as f64 / target_rate as f64;
    (0..target_len)
        .map(|index| {
            let source_position = index as f64 * ratio;
            let lower = source_position.floor() as usize;
            let upper = (lower + 1).min(samples.len() - 1);
            let fraction = (source_position - lower as f64) as f32;
            let lower_sample = samples[lower];
            let upper_sample = samples[upper];
            (lower_sample + (upper_sample - lower_sample) * fraction).clamp(-1.0, 1.0)
        })
        .collect()
}

fn max_buffer_samples(sample_rate_hz: u32) -> usize {
    let safe_rate = sample_rate_hz.max(1);
    ((safe_rate as u64 * MAX_BUFFER_MS as u64) / 1_000) as usize
}

fn samples_for_duration(sample_rate_hz: u32, duration_ms: u32) -> usize {
    ((sample_rate_hz.max(1) as u64 * duration_ms as u64) / 1_000) as usize
}

fn duration_ms(sample_count: usize, sample_rate_hz: u32) -> u32 {
    if sample_rate_hz == 0 {
        return 0;
    }
    ((sample_count as u64 * 1_000) / sample_rate_hz as u64) as u32
}

fn inactive_status(blocker: &str, note: &str) -> LiveAudioBufferStatusReport {
    let evidence = AudioEvidenceReport::empty();
    let vad_result = VadGateResult {
        accepted: false,
        reason: blocker.to_string(),
        evidence: evidence.clone(),
    };

    LiveAudioBufferStatusReport {
        has_audio: false,
        sample_rate_hz: None,
        source_channels: None,
        buffer_channels: TARGET_CHANNELS,
        target_sample_rate_hz: TARGET_SAMPLE_RATE_HZ,
        target_channels: TARGET_CHANNELS,
        buffered_samples: 0,
        max_buffer_samples: 0,
        buffered_duration_ms: 0,
        frames_received: 0,
        requires_resample_to_target: false,
        source_downmixed_to_mono: false,
        ready_for_vad: false,
        ready_for_segment_pipeline: false,
        ready_for_target_asr_frame: false,
        evidence,
        vad_result,
        blocker: blocker.to_string(),
        note: note.to_string(),
    }
}

fn inactive_segment(blocker: &str, note: &str) -> LiveTargetSegmentReport {
    let evidence = AudioEvidenceReport::empty();
    let vad_result = VadGateResult {
        accepted: false,
        reason: blocker.to_string(),
        evidence: evidence.clone(),
    };
    LiveTargetSegmentReport {
        ready: false,
        source_sample_rate_hz: None,
        source_channels: None,
        target_sample_rate_hz: TARGET_SAMPLE_RATE_HZ,
        target_channels: TARGET_CHANNELS,
        source_duration_ms: 0,
        target_duration_ms: 0,
        source_sample_count: 0,
        target_sample_count: 0,
        resampled: false,
        downmixed_to_mono: false,
        evidence,
        vad_result,
        frame: None,
        blocker: blocker.to_string(),
        note: note.to_string(),
    }
}

fn blocked_segment(
    blocker: &str,
    note: &str,
    window: Option<&LiveAudioWindow>,
    evidence: &AudioEvidenceReport,
    vad_result: &VadGateResult,
) -> LiveTargetSegmentReport {
    LiveTargetSegmentReport {
        ready: false,
        source_sample_rate_hz: window.map(|value| value.sample_rate_hz),
        source_channels: window.map(|value| value.source_channels),
        target_sample_rate_hz: TARGET_SAMPLE_RATE_HZ,
        target_channels: TARGET_CHANNELS,
        source_duration_ms: window
            .map(|value| duration_ms(value.samples_mono.len(), value.sample_rate_hz))
            .unwrap_or(0),
        target_duration_ms: 0,
        source_sample_count: window.map(|value| value.samples_mono.len()).unwrap_or(0),
        target_sample_count: 0,
        resampled: window
            .map(|value| value.sample_rate_hz != TARGET_SAMPLE_RATE_HZ)
            .unwrap_or(false),
        downmixed_to_mono: window
            .map(|value| value.source_channels != TARGET_CHANNELS)
            .unwrap_or(false),
        evidence: evidence.clone(),
        vad_result: vad_result.clone(),
        frame: None,
        blocker: blocker.to_string(),
        note: note.to_string(),
    }
}
