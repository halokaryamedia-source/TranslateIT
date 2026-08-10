use std::collections::VecDeque;
use std::sync::{Condvar, Mutex, OnceLock};

use super::evidence::AudioEvidenceReport;
use super::vad::{evaluate_vad_gate, resolve_runtime_vad_profile, RuntimeVadProfile};
use super::{AudioFrame, TARGET_CHANNELS, TARGET_SAMPLE_RATE_HZ};
use crate::engine::runtime_state::runtime_generation_is_authoritative;

// Internal safety bounds only. They are not product speech-boundary policy.
// A long/overloaded utterance is dropped fail-closed rather than being emitted as a
// partial segment merely to satisfy these limits.
const MAX_IN_PROGRESS_UTTERANCE_MS: u32 = 60_000;
const MAX_PENDING_FINALIZED_UTTERANCES: usize = 2;

#[derive(Debug, Clone)]
pub struct FinalizedOutboundUtterance {
    pub session_id: String,
    pub generation: u64,
    pub utterance_id: u64,
    pub frame: AudioFrame,
    pub speech_duration_ms: u32,
    pub total_duration_ms: u32,
}

#[derive(Debug)]
struct FinalizedProducerState {
    session_id: String,
    generation: u64,
    sample_rate_hz: u32,
    profile: RuntimeVadProfile,
    pre_roll: VecDeque<f32>,
    in_utterance: bool,
    current_samples: Vec<f32>,
    speech_samples: usize,
    trailing_silence_samples: usize,
    overflowed: bool,
    next_utterance_id: u64,
    pending: VecDeque<FinalizedOutboundUtterance>,
}

struct FinalizedProducerSync {
    state: Mutex<Option<FinalizedProducerState>>,
    ready: Condvar,
}

static FINALIZED_PRODUCER: OnceLock<FinalizedProducerSync> = OnceLock::new();

fn producer_sync() -> &'static FinalizedProducerSync {
    FINALIZED_PRODUCER.get_or_init(|| FinalizedProducerSync {
        state: Mutex::new(None),
        ready: Condvar::new(),
    })
}

pub fn reset_finalized_outbound_utterance_producer(
    session_id: &str,
    generation: u64,
    sample_rate_hz: u32,
) {
    if sample_rate_hz == 0 {
        clear_finalized_outbound_utterance_producer();
        return;
    }

    let sync = producer_sync();
    if let Ok(mut guard) = sync.state.lock() {
        *guard = Some(FinalizedProducerState {
            session_id: session_id.trim().to_string(),
            generation,
            sample_rate_hz,
            profile: resolve_runtime_vad_profile("Realtime"),
            pre_roll: VecDeque::new(),
            in_utterance: false,
            current_samples: Vec::new(),
            speech_samples: 0,
            trailing_silence_samples: 0,
            overflowed: false,
            next_utterance_id: 1,
            pending: VecDeque::new(),
        });
        sync.ready.notify_all();
    }
}

pub fn clear_finalized_outbound_utterance_producer() {
    let sync = producer_sync();
    if let Ok(mut guard) = sync.state.lock() {
        *guard = None;
        sync.ready.notify_all();
    }
}

pub fn observe_finalized_outbound_f32_samples(
    samples: &[f32],
    sample_rate_hz: u32,
    source_channels: u16,
) {
    let mono = downmix_f32(samples, source_channels);
    observe_finalized_outbound_mono_samples(&mono, sample_rate_hz);
}

pub fn observe_finalized_outbound_i16_samples(
    samples: &[i16],
    sample_rate_hz: u32,
    source_channels: u16,
) {
    let converted = samples
        .iter()
        .map(|sample| (*sample as f32 / i16::MAX as f32).clamp(-1.0, 1.0))
        .collect::<Vec<_>>();
    let mono = downmix_f32(&converted, source_channels);
    observe_finalized_outbound_mono_samples(&mono, sample_rate_hz);
}

pub fn observe_finalized_outbound_u16_samples(
    samples: &[u16],
    sample_rate_hz: u32,
    source_channels: u16,
) {
    let converted = samples
        .iter()
        .map(|sample| ((*sample as f32 / u16::MAX as f32) * 2.0 - 1.0).clamp(-1.0, 1.0))
        .collect::<Vec<_>>();
    let mono = downmix_f32(&converted, source_channels);
    observe_finalized_outbound_mono_samples(&mono, sample_rate_hz);
}

pub fn observe_finalized_outbound_mono_samples(samples: &[f32], sample_rate_hz: u32) {
    if samples.is_empty() || sample_rate_hz == 0 {
        return;
    }

    let sync = producer_sync();
    let Ok(mut guard) = sync.state.lock() else {
        return;
    };

    let Some(state) = guard.as_ref() else {
        return;
    };
    let generation = state.generation;
    if !runtime_generation_is_authoritative(generation) {
        *guard = None;
        sync.ready.notify_all();
        return;
    }

    let Some(state) = guard.as_mut() else {
        return;
    };
    if state.sample_rate_hz != sample_rate_hz {
        state.sample_rate_hz = sample_rate_hz;
        state.pre_roll.clear();
        reset_current_utterance(state);
    }

    let safe_samples = samples
        .iter()
        .map(|sample| safe_sample(*sample))
        .collect::<Vec<_>>();
    let evidence = AudioEvidenceReport::from_samples(&safe_samples);
    let gate = evaluate_vad_gate(evidence.clone(), &state.profile.gate);
    let speech_like = gate.accepted;

    let queued = ingest_observation(state, &safe_samples, &evidence, speech_like);
    if queued {
        sync.ready.notify_one();
    }
}

pub fn wait_take_finalized_outbound_utterance(
    generation: u64,
) -> Option<FinalizedOutboundUtterance> {
    let sync = producer_sync();
    let mut guard = sync.state.lock().ok()?;

    loop {
        if !runtime_generation_is_authoritative(generation) {
            *guard = None;
            sync.ready.notify_all();
            return None;
        }

        let Some(state) = guard.as_mut() else {
            return None;
        };
        if state.generation != generation {
            return None;
        }
        if let Some(utterance) = state.pending.pop_front() {
            return Some(utterance);
        }

        guard = sync.ready.wait(guard).ok()?;
    }
}

fn ingest_observation(
    state: &mut FinalizedProducerState,
    samples: &[f32],
    evidence: &AudioEvidenceReport,
    speech_like: bool,
) -> bool {
    if !state.in_utterance {
        if speech_like {
            state.in_utterance = true;
            state.current_samples.reserve(state.pre_roll.len() + samples.len());
            state.current_samples.extend(state.pre_roll.drain(..));
            state.current_samples.extend_from_slice(samples);
            state.speech_samples = samples.len();
            state.trailing_silence_samples = 0;
            state.overflowed = false;
        } else {
            append_pre_roll(state, samples);
        }
        return false;
    }

    if !state.overflowed {
        state.current_samples.extend_from_slice(samples);
        if duration_ms(state.current_samples.len(), state.sample_rate_hz)
            > MAX_IN_PROGRESS_UTTERANCE_MS
        {
            // Never turn this safety bound into a forced speech boundary. Discard the
            // overlong in-progress payload and wait for a natural silence reset.
            state.current_samples.clear();
            state.overflowed = true;
        }
    }

    if speech_like {
        state.speech_samples = state.speech_samples.saturating_add(samples.len());
        state.trailing_silence_samples = 0;
        return false;
    }

    state.trailing_silence_samples = state
        .trailing_silence_samples
        .saturating_add(samples.len());
    let speech_duration_ms = duration_ms(state.speech_samples, state.sample_rate_hz);
    let silence_duration_ms = duration_ms(state.trailing_silence_samples, state.sample_rate_hz);
    let required_silence_ms = adaptive_end_silence_ms(&state.profile, evidence);

    if silence_duration_ms < required_silence_ms {
        return false;
    }

    if speech_duration_ms < state.profile.minimum_speech_duration_ms || state.overflowed {
        reset_current_utterance(state);
        return false;
    }

    finalize_current_utterance(state, speech_duration_ms)
}

fn finalize_current_utterance(
    state: &mut FinalizedProducerState,
    speech_duration_ms: u32,
) -> bool {
    if state.pending.len() >= MAX_PENDING_FINALIZED_UTTERANCES {
        reset_current_utterance(state);
        return false;
    }
    if !runtime_generation_is_authoritative(state.generation) {
        reset_current_utterance(state);
        return false;
    }

    let speech_end = state
        .current_samples
        .len()
        .saturating_sub(state.trailing_silence_samples.min(state.current_samples.len()));
    if speech_end == 0 {
        reset_current_utterance(state);
        return false;
    }

    let speech_evidence = AudioEvidenceReport::from_samples(&state.current_samples[..speech_end]);
    let speech_gate = evaluate_vad_gate(speech_evidence, &state.profile.gate);
    if !speech_gate.accepted {
        reset_current_utterance(state);
        return false;
    }

    let source_samples = std::mem::take(&mut state.current_samples);
    let target_samples = if state.sample_rate_hz == TARGET_SAMPLE_RATE_HZ {
        source_samples
    } else {
        resample_linear(&source_samples, state.sample_rate_hz, TARGET_SAMPLE_RATE_HZ)
    };
    if target_samples.is_empty() {
        reset_current_utterance(state);
        return false;
    }

    let utterance_id = state.next_utterance_id;
    state.next_utterance_id = state.next_utterance_id.saturating_add(1);
    let total_duration_ms = duration_ms(target_samples.len(), TARGET_SAMPLE_RATE_HZ);
    state.pending.push_back(FinalizedOutboundUtterance {
        session_id: state.session_id.clone(),
        generation: state.generation,
        utterance_id,
        frame: AudioFrame {
            sample_rate_hz: TARGET_SAMPLE_RATE_HZ,
            channels: TARGET_CHANNELS,
            samples: target_samples,
        },
        speech_duration_ms,
        total_duration_ms,
    });

    reset_current_utterance(state);
    true
}

fn adaptive_end_silence_ms(profile: &RuntimeVadProfile, evidence: &AudioEvidenceReport) -> u32 {
    let base = profile.minimum_silence_duration_ms.max(1);
    let rms_ratio = if profile.gate.min_rms > 0.0 {
        evidence.rms / profile.gate.min_rms
    } else {
        0.0
    };
    let peak_ratio = if profile.gate.min_peak > 0.0 {
        evidence.peak / profile.gate.min_peak
    } else {
        0.0
    };
    let boundary_ambiguity = rms_ratio.max(peak_ratio).clamp(0.0, 1.0);
    let adaptive_extra = (base as f32 * boundary_ambiguity).round() as u32;
    base.saturating_add(adaptive_extra)
        .min(profile.target_chunk_min_ms.max(base))
}

fn append_pre_roll(state: &mut FinalizedProducerState, samples: &[f32]) {
    state.pre_roll.extend(samples.iter().copied());
    let max_samples = samples_for_duration(state.sample_rate_hz, state.profile.pre_roll_audio_ms);
    while state.pre_roll.len() > max_samples {
        let _ = state.pre_roll.pop_front();
    }
}

fn reset_current_utterance(state: &mut FinalizedProducerState) {
    state.in_utterance = false;
    state.current_samples.clear();
    state.speech_samples = 0;
    state.trailing_silence_samples = 0;
    state.overflowed = false;
    state.pre_roll.clear();
}

fn downmix_f32(samples: &[f32], source_channels: u16) -> Vec<f32> {
    let channel_count = usize::from(source_channels.max(1));
    if channel_count == 1 {
        return samples.iter().map(|sample| safe_sample(*sample)).collect();
    }

    samples
        .chunks(channel_count)
        .map(|frame| {
            let sum = frame.iter().map(|sample| safe_sample(*sample)).sum::<f32>();
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

fn samples_for_duration(sample_rate_hz: u32, duration_ms: u32) -> usize {
    ((sample_rate_hz.max(1) as u64 * duration_ms as u64) / 1_000) as usize
}

fn duration_ms(sample_count: usize, sample_rate_hz: u32) -> u32 {
    if sample_rate_hz == 0 {
        return 0;
    }
    ((sample_count as u64 * 1_000) / sample_rate_hz as u64) as u32
}

fn safe_sample(value: f32) -> f32 {
    if value.is_finite() {
        value.clamp(-1.0, 1.0)
    } else {
        0.0
    }
}
