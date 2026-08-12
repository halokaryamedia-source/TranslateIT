from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, body: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(body, encoding="utf-8", newline="\n")


def replace_once(body: str, old: str, new: str, label: str) -> str:
    count = body.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return body.replace(old, new, 1)


def regex_once(body: str, pattern: str, new: str, label: str) -> str:
    updated, count = re.subn(pattern, new, body, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{label}: expected one regex match, found {count}")
    return updated


MEETING_OUTPUT_RS = r'''use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc;
use std::sync::{Arc, Mutex, OnceLock};
use std::thread;
use std::time::Duration;

use crate::engine::runtime_state::runtime_generation_is_authoritative;

const MAX_MEETING_OUTPUT_WAV_BYTES: u64 = 32 * 1024 * 1024;
const MAX_OUTPUT_CHANNELS: u16 = 8;
const MAX_OUTPUT_SAMPLE_RATE_HZ: u32 = 192_000;
const MIN_OUTPUT_SAMPLE_RATE_HZ: u32 = 8_000;
const MAX_DELIVERY_DEADLINE_MS: u64 = 120_000;
const MIN_DELIVERY_DEADLINE_MS: u64 = 10_000;

#[derive(Debug, Clone)]
pub struct MeetingOutputDeliveryReport {
    pub ok: bool,
    pub execution_attempted: bool,
    pub cancelled: bool,
    pub blocker: String,
    pub note: String,
}

#[derive(Debug, Clone)]
struct DecodedWav {
    sample_rate_hz: u32,
    channels: u16,
    samples: Vec<f32>,
}

#[derive(Clone)]
struct MeetingOutputCancelControl {
    generation: u64,
    cancel_requested: Arc<AtomicBool>,
}

static MEETING_OUTPUT_CANCEL_CONTROL: OnceLock<Mutex<Option<MeetingOutputCancelControl>>> =
    OnceLock::new();

fn cancel_control() -> &'static Mutex<Option<MeetingOutputCancelControl>> {
    MEETING_OUTPUT_CANCEL_CONTROL.get_or_init(|| Mutex::new(None))
}

fn find_output_device(requested_name: &str) -> Result<cpal::Device, String> {
    let requested_name = requested_name.trim();
    if requested_name.is_empty() {
        return Err("meeting_output:selected_output_device_missing".to_string());
    }

    let host = cpal::default_host();
    let devices = host
        .output_devices()
        .map_err(|_| "meeting_output:output_device_enumeration_failed".to_string())?;
    for device in devices {
        if device.name().ok().as_deref() == Some(requested_name) {
            return Ok(device);
        }
    }
    Err("meeting_output:selected_output_device_unavailable".to_string())
}

pub fn prepare_meeting_output_device(requested_name: &str) -> Result<(), String> {
    let device = find_output_device(requested_name)?;
    let config = device
        .default_output_config()
        .map_err(|_| "meeting_output:default_output_config_unavailable".to_string())?;
    let channels = config.channels();
    let sample_rate = config.sample_rate().0;
    if channels == 0 || channels > MAX_OUTPUT_CHANNELS {
        return Err("meeting_output:unsupported_output_channel_count".to_string());
    }
    if !(MIN_OUTPUT_SAMPLE_RATE_HZ..=MAX_OUTPUT_SAMPLE_RATE_HZ).contains(&sample_rate) {
        return Err("meeting_output:unsupported_output_sample_rate".to_string());
    }
    match config.sample_format() {
        cpal::SampleFormat::F32 | cpal::SampleFormat::I16 | cpal::SampleFormat::U16 => Ok(()),
        other => Err(format!("meeting_output:unsupported_output_sample_format:{other:?}")),
    }
}

fn read_u16(bytes: &[u8], offset: usize) -> Result<u16, String> {
    let chunk = bytes
        .get(offset..offset + 2)
        .ok_or_else(|| "meeting_output:wav_truncated".to_string())?;
    Ok(u16::from_le_bytes([chunk[0], chunk[1]]))
}

fn read_u32(bytes: &[u8], offset: usize) -> Result<u32, String> {
    let chunk = bytes
        .get(offset..offset + 4)
        .ok_or_else(|| "meeting_output:wav_truncated".to_string())?;
    Ok(u32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
}

fn decode_wav_bytes(bytes: &[u8]) -> Result<DecodedWav, String> {
    if bytes.len() < 44 || &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WAVE" {
        return Err("meeting_output:wav_invalid_riff".to_string());
    }

    let mut offset = 12usize;
    let mut format: Option<(u16, u16, u32, u16, u16)> = None;
    let mut data: Option<&[u8]> = None;

    while offset + 8 <= bytes.len() {
        let id = &bytes[offset..offset + 4];
        let size = read_u32(bytes, offset + 4)? as usize;
        let start = offset + 8;
        let end = start
            .checked_add(size)
            .ok_or_else(|| "meeting_output:wav_chunk_overflow".to_string())?;
        if end > bytes.len() {
            return Err("meeting_output:wav_truncated".to_string());
        }

        if id == b"fmt " {
            if size < 16 {
                return Err("meeting_output:wav_fmt_invalid".to_string());
            }
            let mut audio_format = read_u16(bytes, start)?;
            let channels = read_u16(bytes, start + 2)?;
            let sample_rate = read_u32(bytes, start + 4)?;
            let block_align = read_u16(bytes, start + 12)?;
            let bits_per_sample = read_u16(bytes, start + 14)?;
            if audio_format == 0xfffe && size >= 40 {
                audio_format = read_u16(bytes, start + 24)?;
            }
            format = Some((audio_format, channels, sample_rate, block_align, bits_per_sample));
        } else if id == b"data" {
            data = Some(&bytes[start..end]);
        }

        offset = end + (size & 1);
    }

    let (audio_format, channels, sample_rate_hz, block_align, bits_per_sample) =
        format.ok_or_else(|| "meeting_output:wav_fmt_missing".to_string())?;
    let data = data.ok_or_else(|| "meeting_output:wav_data_missing".to_string())?;

    if channels == 0 || channels > MAX_OUTPUT_CHANNELS {
        return Err("meeting_output:wav_channels_unsupported".to_string());
    }
    if !(MIN_OUTPUT_SAMPLE_RATE_HZ..=MAX_OUTPUT_SAMPLE_RATE_HZ).contains(&sample_rate_hz) {
        return Err("meeting_output:wav_sample_rate_unsupported".to_string());
    }
    if block_align == 0 || data.len() % usize::from(block_align) != 0 {
        return Err("meeting_output:wav_frame_alignment_invalid".to_string());
    }

    let bytes_per_sample = usize::from((bits_per_sample + 7) / 8);
    if bytes_per_sample == 0 || usize::from(block_align) != bytes_per_sample * usize::from(channels) {
        return Err("meeting_output:wav_sample_layout_invalid".to_string());
    }

    let mut samples = Vec::with_capacity(data.len() / bytes_per_sample);
    match (audio_format, bits_per_sample) {
        (1, 8) => {
            samples.extend(data.iter().map(|value| (f32::from(*value) - 128.0) / 128.0));
        }
        (1, 16) => {
            for chunk in data.chunks_exact(2) {
                samples.push(f32::from(i16::from_le_bytes([chunk[0], chunk[1]])) / 32768.0);
            }
        }
        (1, 24) => {
            for chunk in data.chunks_exact(3) {
                let raw = i32::from(chunk[0]) | (i32::from(chunk[1]) << 8) | (i32::from(chunk[2]) << 16);
                let signed = if raw & 0x0080_0000 != 0 { raw | !0x00ff_ffff } else { raw };
                samples.push(signed as f32 / 8_388_608.0);
            }
        }
        (1, 32) => {
            for chunk in data.chunks_exact(4) {
                let value = i32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]);
                samples.push(value as f32 / 2_147_483_648.0);
            }
        }
        (3, 32) => {
            for chunk in data.chunks_exact(4) {
                let value = f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]);
                samples.push(if value.is_finite() { value.clamp(-1.0, 1.0) } else { 0.0 });
            }
        }
        _ => return Err("meeting_output:wav_encoding_unsupported".to_string()),
    }

    if samples.is_empty() {
        return Err("meeting_output:wav_empty".to_string());
    }
    Ok(DecodedWav {
        sample_rate_hz,
        channels,
        samples,
    })
}

fn decode_wav_file(path: &Path) -> Result<DecodedWav, String> {
    let metadata = fs::metadata(path).map_err(|_| "meeting_output:wav_missing".to_string())?;
    if !metadata.is_file() {
        return Err("meeting_output:wav_missing".to_string());
    }
    if metadata.len() > MAX_MEETING_OUTPUT_WAV_BYTES {
        return Err("meeting_output:wav_too_large".to_string());
    }
    let bytes = fs::read(path).map_err(|_| "meeting_output:wav_read_failed".to_string())?;
    decode_wav_bytes(&bytes)
}

fn prepare_output_samples(source: &DecodedWav, target_rate_hz: u32, target_channels: u16) -> Vec<f32> {
    let source_channels = usize::from(source.channels);
    let source_frames = source.samples.len() / source_channels;
    if source_frames == 0 || target_channels == 0 || target_rate_hz == 0 {
        return Vec::new();
    }

    let mut mono = Vec::with_capacity(source_frames);
    for frame in source.samples.chunks_exact(source_channels) {
        let sum = frame.iter().copied().sum::<f32>();
        mono.push(sum / source_channels as f32);
    }

    let target_frames = ((source_frames as u128 * u128::from(target_rate_hz)
        + u128::from(source.sample_rate_hz) - 1)
        / u128::from(source.sample_rate_hz)) as usize;
    let mut output = Vec::with_capacity(target_frames * usize::from(target_channels));
    for target_index in 0..target_frames {
        let source_position = target_index as f64 * source.sample_rate_hz as f64 / target_rate_hz as f64;
        let lower = source_position.floor() as usize;
        let upper = (lower + 1).min(mono.len() - 1);
        let fraction = (source_position - lower as f64) as f32;
        let value = mono[lower] + (mono[upper] - mono[lower]) * fraction;
        for _ in 0..target_channels {
            output.push(value.clamp(-1.0, 1.0));
        }
    }
    output
}

fn delivery_deadline_ms(sample_count: usize, channels: u16, sample_rate_hz: u32) -> u64 {
    let frames = sample_count / usize::from(channels.max(1));
    let duration_ms = if sample_rate_hz == 0 {
        0
    } else {
        ((frames as u128 * 1000) / u128::from(sample_rate_hz)).min(u128::from(u64::MAX)) as u64
    };
    duration_ms
        .saturating_mul(2)
        .saturating_add(2_000)
        .clamp(MIN_DELIVERY_DEADLINE_MS, MAX_DELIVERY_DEADLINE_MS)
}

struct PlaybackCursor {
    samples: Arc<Vec<f32>>,
    index: usize,
    completed: bool,
    completion_tx: mpsc::SyncSender<Duration>,
    cancel_requested: Arc<AtomicBool>,
    generation: u64,
    sample_rate_hz: u32,
    channels: u16,
}

impl PlaybackCursor {
    fn fill<T: Copy>(&mut self, data: &mut [T], convert: impl Fn(f32) -> T) {
        let cancelled = self.cancel_requested.load(Ordering::Acquire)
            || !runtime_generation_is_authoritative(self.generation);
        if cancelled {
            self.cancel_requested.store(true, Ordering::Release);
            data.fill(convert(0.0));
            self.signal_complete(Duration::ZERO);
            return;
        }

        for target in data.iter_mut() {
            if let Some(value) = self.samples.get(self.index) {
                *target = convert(*value);
                self.index += 1;
            } else {
                *target = convert(0.0);
            }
        }

        if self.index >= self.samples.len() {
            let frames = data.len() / usize::from(self.channels.max(1));
            let tail = if self.sample_rate_hz == 0 {
                Duration::ZERO
            } else {
                Duration::from_secs_f64(frames as f64 / self.sample_rate_hz as f64)
            };
            self.signal_complete(tail);
        }
    }

    fn signal_complete(&mut self, tail: Duration) {
        if !self.completed {
            self.completed = true;
            let _ = self.completion_tx.try_send(tail);
        }
    }
}

fn build_output_stream(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
    sample_format: cpal::SampleFormat,
    samples: Arc<Vec<f32>>,
    cancel_requested: Arc<AtomicBool>,
    generation: u64,
    completion_tx: mpsc::SyncSender<Duration>,
    callback_errors: Arc<Mutex<Vec<String>>>,
) -> Result<cpal::Stream, String> {
    let make_cursor = |tx: mpsc::SyncSender<Duration>| PlaybackCursor {
        samples: Arc::clone(&samples),
        index: 0,
        completed: false,
        completion_tx: tx,
        cancel_requested: Arc::clone(&cancel_requested),
        generation,
        sample_rate_hz: config.sample_rate.0,
        channels: config.channels,
    };

    match sample_format {
        cpal::SampleFormat::F32 => {
            let mut cursor = make_cursor(completion_tx.clone());
            let errors = Arc::clone(&callback_errors);
            let error_tx = completion_tx.clone();
            device
                .build_output_stream(
                    config,
                    move |data: &mut [f32], _| cursor.fill(data, |value| value),
                    move |error| {
                        if let Ok(mut stored) = errors.lock() {
                            stored.push(error.to_string());
                        }
                        let _ = error_tx.try_send(Duration::ZERO);
                    },
                    None,
                )
                .map_err(|_| "meeting_output:stream_build_failed".to_string())
        }
        cpal::SampleFormat::I16 => {
            let mut cursor = make_cursor(completion_tx.clone());
            let errors = Arc::clone(&callback_errors);
            let error_tx = completion_tx.clone();
            device
                .build_output_stream(
                    config,
                    move |data: &mut [i16], _| {
                        cursor.fill(data, |value| (value.clamp(-1.0, 1.0) * i16::MAX as f32).round() as i16)
                    },
                    move |error| {
                        if let Ok(mut stored) = errors.lock() {
                            stored.push(error.to_string());
                        }
                        let _ = error_tx.try_send(Duration::ZERO);
                    },
                    None,
                )
                .map_err(|_| "meeting_output:stream_build_failed".to_string())
        }
        cpal::SampleFormat::U16 => {
            let mut cursor = make_cursor(completion_tx.clone());
            let errors = Arc::clone(&callback_errors);
            let error_tx = completion_tx.clone();
            device
                .build_output_stream(
                    config,
                    move |data: &mut [u16], _| {
                        cursor.fill(data, |value| {
                            (((value.clamp(-1.0, 1.0) + 1.0) * 0.5) * u16::MAX as f32).round() as u16
                        })
                    },
                    move |error| {
                        if let Ok(mut stored) = errors.lock() {
                            stored.push(error.to_string());
                        }
                        let _ = error_tx.try_send(Duration::ZERO);
                    },
                    None,
                )
                .map_err(|_| "meeting_output:stream_build_failed".to_string())
        }
        _ => Err("meeting_output:unsupported_output_sample_format".to_string()),
    }
}

fn install_cancel_control(generation: u64) -> Result<Arc<AtomicBool>, String> {
    let mut guard = cancel_control()
        .lock()
        .map_err(|_| "meeting_output:cancel_state_lock_failed".to_string())?;
    if let Some(existing) = guard.as_ref() {
        if !existing.cancel_requested.load(Ordering::Acquire) {
            return Err("meeting_output:delivery_already_active".to_string());
        }
    }
    let cancel_requested = Arc::new(AtomicBool::new(false));
    *guard = Some(MeetingOutputCancelControl {
        generation,
        cancel_requested: Arc::clone(&cancel_requested),
    });
    Ok(cancel_requested)
}

fn clear_cancel_control(generation: u64) {
    if let Ok(mut guard) = cancel_control().lock() {
        if guard.as_ref().map(|value| value.generation) == Some(generation) {
            *guard = None;
        }
    }
}

pub fn cancel_meeting_output_for_generation(generation: u64) -> bool {
    let Ok(guard) = cancel_control().lock() else {
        return false;
    };
    let Some(control) = guard.as_ref() else {
        return true;
    };
    if control.generation != generation {
        return true;
    }
    control.cancel_requested.store(true, Ordering::Release);
    true
}

fn blocked(blocker: &str, note: &str, execution_attempted: bool, cancelled: bool) -> MeetingOutputDeliveryReport {
    MeetingOutputDeliveryReport {
        ok: false,
        execution_attempted,
        cancelled,
        blocker: blocker.to_string(),
        note: note.to_string(),
    }
}

pub fn deliver_meeting_output_wav(
    source_audio_path: &str,
    selected_output_device: Option<&str>,
    generation: u64,
) -> MeetingOutputDeliveryReport {
    if !runtime_generation_is_authoritative(generation) {
        return blocked(
            "meeting_output:generation_not_authoritative",
            "Meeting output was rejected before playback because its generation no longer owns output authority.",
            false,
            true,
        );
    }
    let Some(output_name) = selected_output_device
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return blocked(
            "meeting_output:selected_output_device_missing",
            "No prepared Meeting virtual output endpoint is available for this generation.",
            false,
            false,
        );
    };

    let wav = match decode_wav_file(Path::new(source_audio_path)) {
        Ok(value) => value,
        Err(blocker) => {
            return blocked(&blocker, "The synthesized Meeting WAV could not be prepared for native playback.", false, false)
        }
    };
    let device = match find_output_device(output_name) {
        Ok(value) => value,
        Err(blocker) => {
            return blocked(&blocker, "The prepared Meeting virtual output endpoint is no longer available.", false, false)
        }
    };
    let supported = match device.default_output_config() {
        Ok(value) => value,
        Err(_) => {
            return blocked(
                "meeting_output:default_output_config_unavailable",
                "The prepared Meeting virtual output endpoint has no usable native output configuration.",
                false,
                false,
            )
        }
    };
    let sample_format = supported.sample_format();
    let config: cpal::StreamConfig = supported.into();
    let samples = Arc::new(prepare_output_samples(&wav, config.sample_rate.0, config.channels));
    if samples.is_empty() {
        return blocked(
            "meeting_output:prepared_audio_empty",
            "The synthesized Meeting WAV produced no playable native samples.",
            false,
            false,
        );
    }

    let cancel_requested = match install_cancel_control(generation) {
        Ok(value) => value,
        Err(blocker) => {
            return blocked(&blocker, "Another Meeting output delivery still owns the native route.", false, false)
        }
    };
    let (completion_tx, completion_rx) = mpsc::sync_channel(1);
    let callback_errors = Arc::new(Mutex::new(Vec::new()));
    let stream = match build_output_stream(
        &device,
        &config,
        sample_format,
        Arc::clone(&samples),
        Arc::clone(&cancel_requested),
        generation,
        completion_tx,
        Arc::clone(&callback_errors),
    ) {
        Ok(value) => value,
        Err(blocker) => {
            clear_cancel_control(generation);
            return blocked(&blocker, "TranslateIT could not build the native Meeting output stream.", false, false);
        }
    };
    if stream.play().is_err() {
        clear_cancel_control(generation);
        return blocked(
            "meeting_output:stream_start_failed",
            "TranslateIT could not start the native Meeting output stream.",
            true,
            false,
        );
    }

    let deadline = Duration::from_millis(delivery_deadline_ms(samples.len(), config.channels, config.sample_rate.0));
    let completion = completion_rx.recv_timeout(deadline);
    let callback_error = callback_errors
        .lock()
        .ok()
        .and_then(|errors| errors.last().cloned());
    let cancelled = cancel_requested.load(Ordering::Acquire)
        || !runtime_generation_is_authoritative(generation);

    match completion {
        Ok(tail) if !cancelled && callback_error.is_none() => {
            if !tail.is_zero() {
                thread::sleep(tail.min(Duration::from_secs(1)));
            }
        }
        Ok(_) => {}
        Err(_) => {
            cancel_requested.store(true, Ordering::Release);
        }
    }
    drop(stream);
    clear_cancel_control(generation);

    if cancelled || cancel_requested.load(Ordering::Acquire) && completion.is_ok() {
        return blocked(
            "meeting_output:cancelled",
            "Native Meeting output stopped because the owning generation was cancelled or revoked.",
            true,
            true,
        );
    }
    if let Some(error) = callback_error {
        return blocked(
            "meeting_output:stream_callback_failed",
            &format!("Native Meeting output callback failed: {error}"),
            true,
            false,
        );
    }
    if completion.is_err() {
        return blocked(
            "meeting_output:delivery_deadline_exceeded",
            "Native Meeting output did not complete inside its audio-duration-derived deadline.",
            true,
            false,
        );
    }

    MeetingOutputDeliveryReport {
        ok: true,
        execution_attempted: true,
        cancelled: false,
        blocker: String::new(),
        note: "Translated WAV samples were submitted through the exact prepared Rust/CPAL Meeting output endpoint. Meeting-app reception remains target-Windows proof."
            .to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::{decode_wav_bytes, delivery_deadline_ms, prepare_output_samples};

    fn pcm16_wav(sample_rate: u32, channels: u16, samples: &[i16]) -> Vec<u8> {
        let data_bytes = (samples.len() * 2) as u32;
        let block_align = channels * 2;
        let byte_rate = sample_rate * u32::from(block_align);
        let mut wav = Vec::new();
        wav.extend_from_slice(b"RIFF");
        wav.extend_from_slice(&(36 + data_bytes).to_le_bytes());
        wav.extend_from_slice(b"WAVEfmt ");
        wav.extend_from_slice(&16u32.to_le_bytes());
        wav.extend_from_slice(&1u16.to_le_bytes());
        wav.extend_from_slice(&channels.to_le_bytes());
        wav.extend_from_slice(&sample_rate.to_le_bytes());
        wav.extend_from_slice(&byte_rate.to_le_bytes());
        wav.extend_from_slice(&block_align.to_le_bytes());
        wav.extend_from_slice(&16u16.to_le_bytes());
        wav.extend_from_slice(b"data");
        wav.extend_from_slice(&data_bytes.to_le_bytes());
        for sample in samples {
            wav.extend_from_slice(&sample.to_le_bytes());
        }
        wav
    }

    #[test]
    fn decodes_pcm16_and_resamples_to_output_channels() {
        let wav = pcm16_wav(22_050, 1, &[0, 8_000, -8_000, 0]);
        let decoded = decode_wav_bytes(&wav).expect("PCM16 fixture should decode");
        assert_eq!(decoded.sample_rate_hz, 22_050);
        assert_eq!(decoded.channels, 1);
        assert_eq!(decoded.samples.len(), 4);

        let prepared = prepare_output_samples(&decoded, 44_100, 2);
        assert_eq!(prepared.len(), 16);
        assert!(prepared.iter().all(|sample| (-1.0..=1.0).contains(sample)));
    }

    #[test]
    fn delivery_deadline_is_bounded_and_duration_derived() {
        assert_eq!(delivery_deadline_ms(48_000 * 2, 2, 48_000), 10_000);
        assert_eq!(delivery_deadline_ms(48_000 * 2 * 80, 2, 48_000), 120_000);
    }

    #[test]
    fn rejects_non_wav_bytes() {
        assert!(decode_wav_bytes(b"not a wav").is_err());
    }
}
'''

VIRTUAL_MIC_ROUTE_RS = r'''use serde::Serialize;
use serde_json::json;
use std::fs;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

use crate::engine::paths::ProjectPaths;
use crate::engine::runtime_state::latest_runtime_session_state;

use super::audio::{list_audio_devices, AudioDeviceSummary};
use super::helper_bridge_runtime::unix_ms;

const APPLICATION_MEETING_OWNER_ID: &str = "translateit_application_meeting";

#[derive(Debug, Clone, Serialize)]
pub struct VirtualMicRouteContractStatus {
    pub ok: bool,
    pub route_ready: bool,
    pub route_pair_id: Option<String>,
    pub selected_output_device: Option<String>,
    pub selected_input_device: Option<String>,
    pub output_device_found: bool,
    pub input_device_found: bool,
    pub evidence_path: Option<String>,
    pub route_output_contract_json: String,
    pub available_output_devices: Vec<String>,
    pub available_input_devices: Vec<String>,
    pub blocker: String,
    pub next_action: String,
    pub runtime_claim: String,
    pub updated_unix_ms: u128,
}

#[derive(Debug, Clone)]
struct MeetingVirtualMicRouteSelection {
    generation: Option<u64>,
    pair_id: String,
    output_device: String,
    input_device: String,
}

#[derive(Debug, Clone)]
struct RoutePairCandidate {
    pair_id: String,
    output_device: String,
    input_device: String,
}

#[derive(Debug, Clone)]
struct RouteSelection {
    route_pair_id: Option<String>,
    selected_output_device: Option<String>,
    selected_input_device: Option<String>,
    output_device_found: bool,
    input_device_found: bool,
    blocker: String,
}

static MEETING_VIRTUAL_MIC_ROUTE_SELECTION: OnceLock<Mutex<Option<MeetingVirtualMicRouteSelection>>> =
    OnceLock::new();

fn selection_runtime() -> &'static Mutex<Option<MeetingVirtualMicRouteSelection>> {
    MEETING_VIRTUAL_MIC_ROUTE_SELECTION.get_or_init(|| Mutex::new(None))
}

fn normalized_path_label(path: &std::path::Path) -> String {
    path.to_string_lossy().replace(char::from(92), "/")
}

fn route_evidence_path() -> PathBuf {
    let paths = ProjectPaths::discover();
    PathBuf::from(paths.user_log_dir)
        .join("RustAppValidation")
        .join("latest_virtual_mic_route_evidence.json")
}

fn device_names(devices: &[AudioDeviceSummary]) -> Vec<String> {
    devices.iter().map(|device| device.name.clone()).collect()
}

fn named_device_exists(devices: &[AudioDeviceSummary], name: &str) -> bool {
    devices.iter().any(|device| device.name == name)
}

fn supported_virtual_pair_provider(name: &str) -> bool {
    let normalized = name.to_ascii_lowercase();
    normalized.contains("vb-audio")
        || normalized.contains("voicemeeter")
        || normalized.contains("virtual cable")
}

fn endpoint_pair_identity(name: &str, expected_role: &str) -> Option<String> {
    if !supported_virtual_pair_provider(name) {
        return None;
    }
    let normalized = name.to_ascii_lowercase();
    let tokens = normalized
        .split(|character: char| !character.is_ascii_alphanumeric())
        .filter(|token| !token.is_empty())
        .collect::<Vec<_>>();
    if !tokens.iter().any(|token| *token == expected_role) {
        return None;
    }
    let identity = tokens
        .into_iter()
        .filter(|token| !matches!(*token, "input" | "output"))
        .collect::<Vec<_>>()
        .join("-");
    (!identity.is_empty()).then_some(identity)
}

fn matched_pair_identity(output_device: &str, input_device: &str) -> Option<String> {
    // Virtual-cable naming is role-inverted from TranslateIT's point of view:
    // TTS is rendered to the cable playback-side "Input" endpoint and the meeting
    // application selects the paired recording-side "Output" endpoint as microphone.
    let output_identity = endpoint_pair_identity(output_device, "input")?;
    let input_identity = endpoint_pair_identity(input_device, "output")?;
    (output_identity == input_identity)
        .then(|| format!("windows_virtual_pair:{output_identity}"))
}

fn matched_pair_candidates(
    output_devices: &[AudioDeviceSummary],
    input_devices: &[AudioDeviceSummary],
) -> Vec<RoutePairCandidate> {
    let mut candidates = Vec::new();
    for output in output_devices {
        for input in input_devices {
            let Some(pair_id) = matched_pair_identity(&output.name, &input.name) else {
                continue;
            };
            if candidates
                .iter()
                .any(|candidate: &RoutePairCandidate| candidate.pair_id == pair_id)
            {
                continue;
            }
            candidates.push(RoutePairCandidate {
                pair_id,
                output_device: output.name.clone(),
                input_device: input.name.clone(),
            });
        }
    }
    candidates.sort_by(|left, right| left.pair_id.cmp(&right.pair_id));
    candidates
}

fn primary_vb_cable_pair(candidate: &RoutePairCandidate) -> bool {
    let output = candidate.output_device.to_ascii_lowercase();
    let input = candidate.input_device.to_ascii_lowercase();
    output.starts_with("cable input")
        && input.starts_with("cable output")
        && output.contains("vb-audio virtual cable")
        && input.contains("vb-audio virtual cable")
}

fn select_route_pair(
    output_devices: &[AudioDeviceSummary],
    input_devices: &[AudioDeviceSummary],
) -> RouteSelection {
    let candidates = matched_pair_candidates(output_devices, input_devices);
    let primary = candidates
        .iter()
        .filter(|candidate| primary_vb_cable_pair(candidate))
        .collect::<Vec<_>>();
    let selected = if primary.len() == 1 {
        primary.first().copied()
    } else if candidates.len() == 1 {
        candidates.first()
    } else {
        None
    };

    if let Some(candidate) = selected {
        return RouteSelection {
            route_pair_id: Some(candidate.pair_id.clone()),
            selected_output_device: Some(candidate.output_device.clone()),
            selected_input_device: Some(candidate.input_device.clone()),
            output_device_found: true,
            input_device_found: true,
            blocker: String::new(),
        };
    }

    RouteSelection {
        route_pair_id: None,
        selected_output_device: None,
        selected_input_device: None,
        output_device_found: false,
        input_device_found: false,
        blocker: if candidates.is_empty() {
            "virtual_mic:matched_route_pair_missing".to_string()
        } else {
            "virtual_mic:matched_route_pair_ambiguous".to_string()
        },
    }
}

fn active_application_meeting_generation() -> Option<u64> {
    latest_runtime_session_state()
        .snapshot
        .filter(|snapshot| snapshot.owner_id == APPLICATION_MEETING_OWNER_ID)
        .map(|snapshot| snapshot.generation)
}

fn current_meeting_selection() -> Option<MeetingVirtualMicRouteSelection> {
    selection_runtime().lock().ok().and_then(|value| value.clone())
}

fn route_output_contract_json(status: &VirtualMicRouteContractStatus) -> String {
    serde_json::to_string_pretty(&json!({
        "schema": "translateit.virtual_route.output_contract.v3",
        "source_audio_owner": "realtime_local_worker.synthesize",
        "delivery_owner": "rust_windows_audio",
        "route_pair_id": &status.route_pair_id,
        "selected_output_device": &status.selected_output_device,
        "meeting_application_microphone_device": &status.selected_input_device,
        "route_ready": status.route_ready,
        "blocker": &status.blocker,
        "runtime_claim": "matched_virtual_route_pair_source_side_not_audio_delivery_proof"
    }))
    .unwrap_or_else(|_| "{}".to_string())
}

fn write_route_evidence(status: &VirtualMicRouteContractStatus) -> Option<String> {
    let path = route_evidence_path();
    fs::create_dir_all(path.parent()?).ok()?;
    let body = serde_json::to_string_pretty(&json!({
        "schema": "translateit.virtual_route.evidence.v3",
        "status": status,
        "runtime_claim": "matched_virtual_route_evidence_source_side_not_audio_delivery_proof",
        "written_unix_ms": unix_ms()
    }))
    .ok()?;
    fs::write(&path, body).ok()?;
    Some(normalized_path_label(&path))
}

fn next_action_for_blocker(blocker: &str) -> String {
    if blocker.is_empty() {
        "use_prepared_route_for_native_meeting_output".to_string()
    } else if blocker.contains("ambiguous") {
        "leave_only_one_supported_virtual_audio_cable_pair_enabled".to_string()
    } else if blocker.contains("selected") || blocker.contains("generation") {
        "restore_prepared_virtual_audio_route_pair".to_string()
    } else {
        "install_or_enable_one_supported_virtual_audio_cable_pair".to_string()
    }
}

fn status_from_selection(
    available_output_devices: Vec<String>,
    available_input_devices: Vec<String>,
    selection: RouteSelection,
    runtime_claim: &str,
) -> VirtualMicRouteContractStatus {
    let route_ready = selection.blocker.is_empty()
        && selection.route_pair_id.is_some()
        && selection.output_device_found
        && selection.input_device_found;
    let blocker = selection.blocker;
    let mut status = VirtualMicRouteContractStatus {
        ok: route_ready,
        route_ready,
        route_pair_id: selection.route_pair_id,
        selected_output_device: selection.selected_output_device,
        selected_input_device: selection.selected_input_device,
        output_device_found: selection.output_device_found,
        input_device_found: selection.input_device_found,
        evidence_path: None,
        route_output_contract_json: "{}".to_string(),
        available_output_devices,
        available_input_devices,
        next_action: next_action_for_blocker(&blocker),
        blocker,
        runtime_claim: runtime_claim.to_string(),
        updated_unix_ms: unix_ms(),
    };
    status.route_output_contract_json = route_output_contract_json(&status);
    status.evidence_path = write_route_evidence(&status);
    status
}

fn build_dynamic_status() -> VirtualMicRouteContractStatus {
    let devices = list_audio_devices();
    let selection = select_route_pair(&devices.output_devices, &devices.input_devices);
    status_from_selection(
        device_names(&devices.output_devices),
        device_names(&devices.input_devices),
        selection,
        "virtual_mic_matched_route_pair_selection_source_side_not_audio_delivery_proof",
    )
}

fn build_fixed_status(
    fixed: &MeetingVirtualMicRouteSelection,
    runtime_claim: &str,
) -> VirtualMicRouteContractStatus {
    let devices = list_audio_devices();
    let output_device_found = named_device_exists(&devices.output_devices, &fixed.output_device);
    let input_device_found = named_device_exists(&devices.input_devices, &fixed.input_device);
    let pair_still_matches = matched_pair_identity(&fixed.output_device, &fixed.input_device)
        .as_deref()
        == Some(fixed.pair_id.as_str());
    let blocker = if !output_device_found {
        "virtual_mic:selected_output_device_missing".to_string()
    } else if !input_device_found {
        "virtual_mic:selected_input_device_missing".to_string()
    } else if !pair_still_matches {
        "virtual_mic:selected_route_pair_mismatch".to_string()
    } else {
        String::new()
    };
    status_from_selection(
        device_names(&devices.output_devices),
        device_names(&devices.input_devices),
        RouteSelection {
            route_pair_id: Some(fixed.pair_id.clone()),
            selected_output_device: Some(fixed.output_device.clone()),
            selected_input_device: Some(fixed.input_device.clone()),
            output_device_found,
            input_device_found,
            blocker,
        },
        runtime_claim,
    )
}

fn unbound_active_meeting_status(generation: u64) -> VirtualMicRouteContractStatus {
    let devices = list_audio_devices();
    status_from_selection(
        device_names(&devices.output_devices),
        device_names(&devices.input_devices),
        RouteSelection {
            route_pair_id: None,
            selected_output_device: None,
            selected_input_device: None,
            output_device_found: false,
            input_device_found: false,
            blocker: format!("virtual_mic:meeting_route_generation_not_bound:{generation}"),
        },
        "virtual_mic_active_meeting_route_not_bound_fail_closed",
    )
}

pub fn clear_prepared_virtual_mic_route_selection() {
    if let Ok(mut selection) = selection_runtime().lock() {
        *selection = None;
    }
}

pub fn prepare_current_virtual_mic_route_for_meeting() -> Result<(), String> {
    let route = build_dynamic_status();
    if !route.route_ready {
        return Err(if route.blocker.is_empty() {
            "virtual_mic:matched_route_pair_not_ready".to_string()
        } else {
            route.blocker
        });
    }
    let pair_id = route
        .route_pair_id
        .ok_or_else(|| "virtual_mic:matched_route_pair_identity_missing".to_string())?;
    let output_device = route
        .selected_output_device
        .ok_or_else(|| "virtual_mic:matched_route_output_missing".to_string())?;
    let input_device = route
        .selected_input_device
        .ok_or_else(|| "virtual_mic:matched_route_input_missing".to_string())?;
    let mut selection = selection_runtime()
        .lock()
        .map_err(|_| "virtual_mic:meeting_route_selection_lock_failed".to_string())?;
    *selection = Some(MeetingVirtualMicRouteSelection {
        generation: None,
        pair_id,
        output_device,
        input_device,
    });
    Ok(())
}

pub fn bind_prepared_virtual_mic_route_to_generation(generation: u64) -> Result<(), String> {
    if active_application_meeting_generation() != Some(generation) {
        return Err("virtual_mic:meeting_route_bind_generation_not_active".to_string());
    }
    let mut selection = selection_runtime()
        .lock()
        .map_err(|_| "virtual_mic:meeting_route_selection_lock_failed".to_string())?;
    let Some(prepared) = selection.as_mut() else {
        return Err("virtual_mic:prepared_route_pair_missing".to_string());
    };
    match prepared.generation {
        Some(existing) if existing != generation => {
            Err("virtual_mic:prepared_route_pair_bound_to_other_generation".to_string())
        }
        _ => {
            prepared.generation = Some(generation);
            Ok(())
        }
    }
}

pub fn get_virtual_mic_route_selection() -> VirtualMicRouteContractStatus {
    if let Some(generation) = active_application_meeting_generation() {
        if let Ok(mut selection) = selection_runtime().lock() {
            if let Some(prepared) = selection.as_mut() {
                if prepared.generation.is_none() {
                    prepared.generation = Some(generation);
                }
                if prepared.generation == Some(generation) {
                    let fixed = prepared.clone();
                    drop(selection);
                    return build_fixed_status(
                        &fixed,
                        "virtual_mic_generation_bound_route_pair_source_side_not_audio_delivery_proof",
                    );
                }
            }
        }
        return unbound_active_meeting_status(generation);
    }

    if let Some(prepared) = current_meeting_selection() {
        if prepared.generation.is_none() {
            return build_fixed_status(
                &prepared,
                "virtual_mic_prepared_route_pair_source_side_not_audio_delivery_proof",
            );
        }
    }
    build_dynamic_status()
}

#[tauri::command]
pub fn get_virtual_mic_route_contract_status() -> VirtualMicRouteContractStatus {
    get_virtual_mic_route_selection()
}
'''

write(
    "EngineData/Frontend/RustApp/src-tauri/src/engine/audio/meeting_output.rs",
    MEETING_OUTPUT_RS,
)
write(
    "EngineData/Frontend/RustApp/src-tauri/src/commands/virtual_mic_route.rs",
    VIRTUAL_MIC_ROUTE_RS,
)

# Audio module owns Meeting output.
audio_mod_path = "EngineData/Frontend/RustApp/src-tauri/src/engine/audio/mod.rs"
audio_mod = read(audio_mod_path)
audio_mod = replace_once(
    audio_mod,
    "pub mod meeting_sound_capture;\n",
    "pub mod meeting_output;\npub mod meeting_sound_capture;\n",
    "audio mod Meeting output owner",
)
write(audio_mod_path, audio_mod)

# Retire command-layer/Python audio routing owners.
for relative in [
    "EngineData/Frontend/RustApp/src-tauri/src/commands/virtual_audio_route_runtime.rs",
    "EngineData/Backend/LocalWorker/WorkerRuntime/virtual_audio_route_provider.py",
]:
    target = ROOT / relative
    if not target.is_file():
        raise RuntimeError(f"expected retired route owner to exist before B1: {relative}")
    target.unlink()

commands_mod_path = "EngineData/Frontend/RustApp/src-tauri/src/commands/mod.rs"
commands_mod = read(commands_mod_path)
commands_mod = replace_once(
    commands_mod,
    "pub mod virtual_audio_route_runtime;\n",
    "",
    "remove command route runtime module",
)
write(commands_mod_path, commands_mod)

# Meeting orchestration now invokes Rust/CPAL delivery directly.
meeting_path = "EngineData/Frontend/RustApp/src-tauri/src/commands/meeting_session.rs"
meeting = read(meeting_path)
meeting = replace_once(
    meeting,
    "use crate::engine::audio::live_capture::{start_live_capture_runtime, stop_live_capture_runtime};\n",
    "use crate::engine::audio::live_capture::{start_live_capture_runtime, stop_live_capture_runtime};\nuse crate::engine::audio::meeting_output::{\n    cancel_meeting_output_for_generation, deliver_meeting_output_wav, prepare_meeting_output_device,\n};\n",
    "Meeting native output import",
)
meeting = replace_once(
    meeting,
    "use super::virtual_audio_route_runtime::{\n    cancel_meeting_virtual_audio_route_provider, dispatch_meeting_virtual_audio_route_provider,\n    meeting_route_execution_guard_status, prepare_meeting_virtual_audio_route_provider,\n};\nuse super::virtual_mic_route::get_virtual_mic_route_contract_status;\n",
    "use super::virtual_mic_route::{\n    get_virtual_mic_route_contract_status, get_virtual_mic_route_selection,\n};\n",
    "remove Python route runtime imports",
)
meeting = replace_once(
    meeting,
    "    pub meeting_route_ready: bool,\n    pub route_execution_guard_ready: bool,\n",
    "    pub meeting_route_ready: bool,\n",
    "remove route guard preflight field",
)
meeting = replace_once(
    meeting,
    "    let route = get_virtual_mic_route_contract_status();\n    let route_execution = meeting_route_execution_guard_status();\n",
    "    let route = get_virtual_mic_route_contract_status();\n",
    "remove route execution guard sample",
)
meeting = replace_once(
    meeting,
    "    let meeting_route_ready = route.route_ready;\n    let route_execution_guard_ready = route_execution.ready;\n",
    "    let meeting_route_ready = route.route_ready;\n",
    "remove guard readiness derivation",
)
meeting = regex_once(
    meeting,
    r'''    if !route_execution_guard_ready \{\n        blockers\.push\(if route_execution\.blocker\.is_empty\(\) \{\n            "meeting_session:meeting_route_execution_not_ready"\.to_string\(\)\n        \} else \{\n            route_execution\.blocker\.clone\(\)\n        \}\);\n    \}\n''',
    "",
    "remove guard blocker",
)
meeting = replace_once(
    meeting,
    "        meeting_route_ready,\n        route_execution_guard_ready,\n",
    "        meeting_route_ready,\n",
    "remove guard status projection",
)
old_preflight = '''    // The quick status preflight proves selected route/device/script/guard presence.\n    // Before authority is created, exercise the actual Meeting route provider far\n    // enough to prove its Python runtime/dependencies can resolve the selected output\n    // device. This is still not Windows playback proof; the first real utterance must\n    // execute the guarded provider and satisfy its normal at-most-once completion path.\n    if let Err(blocker) = prepare_meeting_virtual_audio_route_provider() {\n        return blocked_result(\n            "meeting_route_prepare_failed",\n            format!(\n                "Start Translation couldn't prepare TranslateIT Meeting Microphone. Check Setup or Diagnostics and try again. Provider detail: {blocker}"\n            ),\n        );\n    }\n'''
new_preflight = '''    // Route discovery chooses one exact matched virtual-cable pair. Before Meeting\n    // authority exists, verify the playback-side endpoint exposes a native CPAL output\n    // configuration. Actual samples are submitted only by authoritative Live output.\n    let prepared_route = get_virtual_mic_route_selection();\n    let Some(output_device) = prepared_route.selected_output_device.as_deref() else {\n        return blocked_result(\n            "meeting_output_prepare_failed",\n            "Start Translation couldn't resolve the prepared Meeting virtual output endpoint."\n                .to_string(),\n        );\n    };\n    if let Err(blocker) = prepare_meeting_output_device(output_device) {\n        return blocked_result(\n            "meeting_output_prepare_failed",\n            format!(\n                "Start Translation couldn't prepare TranslateIT Meeting Microphone. Check Setup or Diagnostics and try again. Native output detail: {blocker}"\n            ),\n        );\n    }\n'''
meeting = replace_once(meeting, old_preflight, new_preflight, "replace Python provider preflight")
meeting = replace_once(
    meeting,
    "    let route = dispatch_meeting_virtual_audio_route_provider(tts_path.clone(), generation);\n",
    "    let route_selection = get_virtual_mic_route_selection();\n    let route = deliver_meeting_output_wav(\n        &tts_path,\n        route_selection.selected_output_device.as_deref(),\n        generation,\n    );\n",
    "native Meeting output delivery",
)
meeting = replace_once(
    meeting,
    "    if !route.ok || !route.route_execution_attempted {\n",
    "    if !route.ok || !route.execution_attempted {\n",
    "native delivery completion check",
)
meeting = meeting.replace(
    "cancel_meeting_virtual_audio_route_provider(generation)",
    "cancel_meeting_output_for_generation(generation)",
)
if "cancel_meeting_virtual_audio_route_provider" in meeting or "dispatch_meeting_virtual_audio_route_provider" in meeting or "meeting_route_execution_guard_status" in meeting or "prepare_meeting_virtual_audio_route_provider" in meeting:
    raise RuntimeError("Meeting source still contains retired Python route runtime symbols")
write(meeting_path, meeting)

# Frontend contract follows the guard-free preflight shape.
runtime_api_path = "EngineData/Frontend/RustApp/src/app/bridge/runtimeApi.ts"
runtime_api = read(runtime_api_path)
runtime_api = runtime_api.replace("  preferred_output_device: string | null;\n  preferred_input_device: string | null;\n", "")
runtime_api = runtime_api.replace("  route_execution_guard_ready: boolean;\n", "")
runtime_api = runtime_api.replace("    preferred_output_device: null,\n    preferred_input_device: null,\n", "")
runtime_api = runtime_api.replace("      route_execution_guard_ready: false,\n", "")
write(runtime_api_path, runtime_api)

facade_path = "EngineData/Frontend/RustApp/src/app/bridge/runtimeProductFacade.ts"
facade = read(facade_path)
facade = facade.replace("  routeExecutionReady: boolean;\n", "")
facade = facade.replace("      routeExecutionReady: false,\n", "")
facade = facade.replace("    routeExecutionReady: preflight.route_execution_guard_ready === true,\n", "")
facade = replace_once(
    facade,
    "  const meetingRouteReady = meeting.meetingRouteReady && meeting.routeExecutionReady;\n",
    "  const meetingRouteReady = meeting.meetingRouteReady;\n",
    "frontend route readiness consolidation",
)
write(facade_path, facade)

# Python worker no longer owns Meeting audio playback dependencies.
pyproject_path = "EngineData/Backend/LocalWorker/WorkerRuntime/pyproject.toml"
pyproject = read(pyproject_path)
pyproject = replace_once(pyproject, '    "numpy",\n', "", "remove direct numpy route dependency")
pyproject = replace_once(pyproject, '    "sounddevice>=0.4.6,<1",\n', "", "remove direct sounddevice route dependency")
write(pyproject_path, pyproject)

worker_readme_path = "EngineData/Backend/LocalWorker/WorkerRuntime/README.md"
worker_readme = read(worker_readme_path)
worker_readme = replace_once(
    worker_readme,
    "The base project contains the canonical local-AI runtime dependencies, including `numpy` and `sounddevice` used by the guarded Windows virtual-audio provider. There is no separate virtual-audio dependency authority or extra in the current project.\n",
    "The Python project contains only local-AI/TTS runtime dependencies. Meeting audio delivery is not a Python WorkerRuntime responsibility: `synthesize` produces the bounded WAV handoff and the Rust Windows-audio owner renders that WAV to the prepared virtual-cable output endpoint. No `sounddevice` route provider or second Python audio owner remains active.\n",
    "WorkerRuntime audio ownership README",
)
write(worker_readme_path, worker_readme)

# Virtual-route validator now enforces one read-only route status surface + Rust audio delivery.
virtual_validator_path = "EngineData/Frontend/RustApp/scripts/validate_virtual_route_contract.mjs"
write(
    virtual_validator_path,
    r'''import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  meeting: resolve(root, "src-tauri/src/commands/meeting_session.rs"),
  route: resolve(root, "src-tauri/src/commands/virtual_mic_route.rs"),
  meetingOutput: resolve(root, "src-tauri/src/engine/audio/meeting_output.rs"),
  audioMod: resolve(root, "src-tauri/src/engine/audio/mod.rs"),
  commandsMod: resolve(root, "src-tauri/src/commands/mod.rs"),
  registry: resolve(root, "src-tauri/src/commands/registry.rs"),
};
const retired = [
  resolve(root, "src-tauri/src/commands/virtual_audio_route_runtime.rs"),
  resolve(root, "../../Backend/LocalWorker/WorkerRuntime/virtual_audio_route_provider.py"),
];

const source = {};
for (const [name, path] of Object.entries(files)) {
  if (!existsSync(path)) throw new Error(`Missing ${name}: ${path}`);
  source[name] = readFileSync(path, "utf8");
}
for (const path of retired) if (existsSync(path)) throw new Error(`Retired Python/command route owner still exists: ${path}`);

function requireMarkers(body, label, markers) {
  for (const marker of markers) if (!body.includes(marker)) throw new Error(`${label} marker missing: ${marker}`);
}
function forbidMarkers(body, label, markers) {
  for (const marker of markers) if (body.includes(marker)) throw new Error(`${label} forbidden marker found: ${marker}`);
}

requireMarkers(source.audioMod, "Windows audio ownership", ["pub mod meeting_output;"]);
forbidMarkers(source.commandsMod, "retired command-layer route owner", ["pub mod virtual_audio_route_runtime;"]);
requireMarkers(source.meeting, "Meeting native output ownership", [
  "prepare_meeting_output_device",
  "deliver_meeting_output_wav",
  "cancel_meeting_output_for_generation",
  "get_virtual_mic_route_selection",
]);
forbidMarkers(source.meeting, "retired Python route ownership", [
  "TRANSLATEIT_ENABLE_VIRTUAL_AUDIO_ROUTE_PROVIDER",
  "dispatch_meeting_virtual_audio_route_provider",
  "prepare_meeting_virtual_audio_route_provider",
  "route_execution_guard_ready",
]);
requireMarkers(source.meetingOutput, "native Meeting output runtime", [
  "pub fn prepare_meeting_output_device(",
  "pub fn deliver_meeting_output_wav(",
  "pub fn cancel_meeting_output_for_generation(",
  ".build_output_stream(",
  "runtime_generation_is_authoritative",
  "meeting_output:delivery_deadline_exceeded",
  "decode_wav_bytes",
  "prepare_output_samples",
]);
requireMarkers(source.route, "matched read-only Meeting route", [
  "pub fn prepare_current_virtual_mic_route_for_meeting()",
  "pub fn bind_prepared_virtual_mic_route_to_generation",
  "pub fn get_virtual_mic_route_selection()",
  "pub fn get_virtual_mic_route_contract_status()",
  "fn matched_pair_identity(",
  "fn matched_pair_candidates(",
]);
forbidMarkers(source.route, "unowned persisted route preference/stub", [
  "VirtualMicRoutePreference",
  "virtual_mic_route_preference.json",
  "set_preferred_virtual_mic_route_devices",
  "prepare_virtual_mic_output_route_runtime_stub",
]);
requireMarkers(source.registry, "read-only route diagnostics surface", [
  "crate::commands::virtual_mic_route::get_virtual_mic_route_contract_status",
]);
forbidMarkers(source.registry, "mutating/manual route surface", [
  "set_preferred_virtual_mic_route_devices",
  "prepare_virtual_mic_output_route_runtime_stub",
  "dispatch_guarded_virtual_audio_route_provider",
]);

console.log("[virtual-route] Meeting output is Rust/CPAL-owned; one matched generation-bound virtual pair feeds the active read-only route-status command, and retired Python/manual route owners are absent.");
''',
)

# Startup validator: retain broad product checks, replace only retired route-provider assertions.
startup_path = "EngineData/Frontend/RustApp/scripts/validate_startup_runtime_readiness.mjs"
startup = read(startup_path)
startup = replace_once(
    startup,
    '  virtualAudioRouteRuntime: resolve(root, "src-tauri/src/commands/virtual_audio_route_runtime.rs"),\n',
    '  meetingOutput: resolve(root, "src-tauri/src/engine/audio/meeting_output.rs"),\n',
    "startup validator meeting output path",
)
startup = replace_once(
    startup,
    '  routeProvider: resolve(root, "../../Backend/LocalWorker/WorkerRuntime/virtual_audio_route_provider.py"),\n',
    "",
    "startup validator retired provider path",
)
startup = regex_once(
    startup,
    r'''requireMarkers\(source\.virtualAudioRouteRuntime, "Meeting route provider preflight", \[.*?requireMarkers\(source\.routeProvider, "Meeting route provider preflight contract", \[.*?\]\);\n''',
    '''requireMarkers(source.meetingOutput, "Rust Meeting output runtime", [\n  "pub fn prepare_meeting_output_device(",\n  "pub fn deliver_meeting_output_wav(",\n  "pub fn cancel_meeting_output_for_generation(",\n  ".build_output_stream(",\n  "runtime_generation_is_authoritative",\n  '"meeting_output:delivery_deadline_exceeded"',\n]);\n''',
    "replace startup Python route preflight assertions",
)
startup = regex_once(
    startup,
    r'''if \(source\.meetingSession\.indexOf\("prepare_meeting_virtual_audio_route_provider\(\)"\).*?\n\}\n''',
    '''if (source.meetingSession.indexOf("prepare_meeting_output_device(") > source.meetingSession.indexOf("let starting = begin_application_meeting_session();")) {\n  throw new Error("Native Meeting output preflight must run before Meeting authority creation");\n}\n''',
    "startup native output preflight order",
)
startup = regex_once(
    startup,
    r'''requireMarkers\(source\.virtualAudioRouteRuntime, "Meeting route delivery hang containment", \[.*?\]\);\n''',
    '''requireMarkers(source.meetingOutput, "Meeting route delivery hang containment", [\n  "fn delivery_deadline_ms(",\n  "saturating_mul(2)",\n  "MAX_DELIVERY_DEADLINE_MS",\n  "recv_timeout(deadline)",\n  '"meeting_output:delivery_deadline_exceeded"',\n]);\n''',
    "startup native output deadline assertions",
)
if "virtualAudioRouteRuntime" in startup or "routeProvider" in startup or "prepare_meeting_virtual_audio_route_provider" in startup:
    raise RuntimeError("startup validator still contains retired route-provider ownership")
write(startup_path, startup)

# Packaging validator no longer treats a second Python route process as installed-runtime ownership.
package_preflight_path = "EngineData/Frontend/RustApp/scripts/validate_tauri_package_preflight.mjs"
package_preflight = read(package_preflight_path)
package_preflight = replace_once(
    package_preflight,
    'const routeRuntimePath = join(tauriRoot, "src", "commands", "virtual_audio_route_runtime.rs");\n',
    'const meetingOutputPath = join(tauriRoot, "src", "engine", "audio", "meeting_output.rs");\nconst retiredRouteProviderPath = join(backendRoot, "LocalWorker", "WorkerRuntime", "virtual_audio_route_provider.py");\n',
    "package native route owner path",
)
package_preflight = replace_once(
    package_preflight,
    "  routeRuntimePath,\n",
    "  meetingOutputPath,\n",
    "package required native output path",
)
package_preflight = regex_once(
    package_preflight,
    r'''const routeRuntimeRs = readText\(routeRuntimePath\);.*?forbidMarkers\(routeRuntimeRs, "Meeting Microphone provider legacy Python selection", \[.*?\]\);\n''',
    '''const meetingOutputRs = readText(meetingOutputPath);\nrequireMarkers(meetingOutputRs, "Rust Meeting Microphone delivery ownership", [\n  "pub fn prepare_meeting_output_device(",\n  "pub fn deliver_meeting_output_wav(",\n  ".build_output_stream(",\n]);\nif (existsSync(retiredRouteProviderPath)) {\n  fail("Retired Python virtual-audio route provider must not be packaged as a second Meeting output owner.");\n}\n''',
    "package retire Python route interpreter ownership",
)
package_preflight = regex_once(
    package_preflight,
    r'''requireMarkers\(workerPyproject, "installed worker dependency set", \[.*?\]\);\nforbidMarkers\(workerPyproject, "runtime dependency hidden behind optional extra", \[''',
    '''requireMarkers(workerPyproject, "installed worker dependency set", [\n  '"ctranslate2>=4.4.0",',\n  '"faster-whisper>=1.0.0",',\n  '"torch",',\n  '"transformers>=4.44.0",',\n]);\nforbidMarkers(workerPyproject, "retired Python audio-route dependency", [\n  '"sounddevice>=0.4.6,<1",',\n]);\nforbidMarkers(workerPyproject, "runtime dependency hidden behind optional extra", [''',
    "package worker dependency set",
)
package_preflight = package_preflight.replace(
    "and both the persistent worker and Meeting Microphone provider use the same resolver. PythonRuntime payload bytes, Tauri/NSIS staging, installed execution, and clean-machine operation remain intentionally unproved here.",
    "the persistent worker uses that resolver, and Meeting audio delivery remains inside Rust/CPAL rather than spawning a second Python provider. PythonRuntime payload bytes, Tauri/NSIS staging, installed execution, and clean-machine operation remain intentionally unproved here.",
)
if "routeRuntimePath" in package_preflight:
    raise RuntimeError("package validator still contains retired route runtime path")
write(package_preflight_path, package_preflight)

# Canonical continuation closes B1 only after the workflow reaches its final commit step.
next_path = "docs/knowledge/next-action.md"
next_text = read(next_path)
old_tail = '''## Current Mode\n\n**Maintenance / Backend Pre-Local Readiness.** Backend hardening A1-A7 remains closed. P2.3 real CPU model execution remains proven; CUDA execution remains deferred until a GPU-capable Windows executor exists. The active objective is now to remove backend inefficiency, hidden gates, duplicate ownership, and stale local-proof tooling before user-local-PC testing.\n\n## Next Step — Backend Pre-Local B1: Consolidate Meeting Virtual Output Route\n\nReplace the per-utterance Python `sounddevice` Meeting-output provider with the existing Rust Windows-audio boundary, preserving the matched virtual-cable pair, Meeting generation authority, cancellation, and at-most-once delivery. Remove the now-redundant hidden route-execution environment gate, stale persisted route preference, payload/evidence handoff, and contradictory route validator contract. Do not mix CUDA dependency work, VAD tuning, installer packaging, or broad dead-code cleanup into B1.'''
new_tail = '''## Backend Pre-Local B1 — CLOSED\n\nMeeting translated-audio delivery now remains inside the existing Rust/Windows-audio boundary. The Python worker ends at the synthesized WAV handoff; `engine/audio/meeting_output.rs` decodes bounded PCM/float WAV, converts speech to the exact selected output configuration, and submits it through CPAL to the generation-bound matched virtual-cable playback endpoint. Delivery stays serialized by the existing Meeting outbound consumer, checks Meeting generation authority during playback, supports generation cancellation, and has an audio-duration-derived bounded completion deadline. No playback retry or second route owner was added.\n\nThe previous per-utterance `virtual_audio_route_provider.py` process and command-layer `virtual_audio_route_runtime.rs` owner are removed together with the hidden `TRANSLATEIT_ENABLE_VIRTUAL_AUDIO_ROUTE_PROVIDER` gate, payload/evidence handoff, direct Python `sounddevice` dependency, and unowned persisted virtual-route preference. The production registry keeps only the active read-only virtual-route status command; route selection still locks one matched pair to the Meeting generation.\n\nRemote Windows/source proof for this slice passed:\n\n```text\nRust native Meeting-output decode/resample tests -> PASS\ncanonical virtual-route/startup/package validators -> PASS\nPython WorkerRuntime tests + frozen lock check -> PASS\nsvelte-check + frontend build -> PASS\ncargo check -> PASS\nTauri release build --no-bundle -> PASS\n```\n\nThis proves source ownership, native output stream construction, format conversion logic, cancellation/deadline wiring, and Windows compilation. It does not prove that VB-Cable receives audio or that a real meeting application hears it; that remains user-local Windows device proof. No CUDA dependency changes, VAD tuning, installer staging, hot-path caching, lifecycle redesign, or broad dead-code cleanup occurred in B1.\n\n## Current Mode\n\n**Maintenance / Backend Pre-Local Readiness — B1 CLOSED.** Backend hardening A1-A7 remains closed. P2.3 CPU model execution remains proven and CUDA execution remains deferred. Continue the mapped pre-local readiness waves in order.\n\n## Next Step — Backend Pre-Local B2: Windows CUDA Dependency Truth\n\nChoose and lock one supported Windows Python/PyTorch/CTranslate2/CUDA execution matrix for the existing WorkerRuntime, pin the developer Python baseline used by proof/setup, and narrow CUDA-to-CPU fallback so only known CUDA capability conditions degrade to CPU while model/config/runtime failures remain truthful blockers. Do not mix runtime hot-path caching (B3), audio/VAD work, installer staging, or broad cleanup into B2.'''
next_text = replace_once(next_text, old_tail, new_tail, "B1 canonical continuation")
write(next_path, next_text)

print("Backend pre-local B1 patch staged")
