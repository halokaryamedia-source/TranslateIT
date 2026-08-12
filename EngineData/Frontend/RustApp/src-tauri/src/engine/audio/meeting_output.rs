use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
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
        other => Err(format!(
            "meeting_output:unsupported_output_sample_format:{other:?}"
        )),
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
            format = Some((
                audio_format,
                channels,
                sample_rate,
                block_align,
                bits_per_sample,
            ));
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
    if bytes_per_sample == 0 || usize::from(block_align) != bytes_per_sample * usize::from(channels)
    {
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
                let raw =
                    i32::from(chunk[0]) | (i32::from(chunk[1]) << 8) | (i32::from(chunk[2]) << 16);
                let signed = if raw & 0x0080_0000 != 0 {
                    raw | !0x00ff_ffff
                } else {
                    raw
                };
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
                samples.push(if value.is_finite() {
                    value.clamp(-1.0, 1.0)
                } else {
                    0.0
                });
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

fn prepare_output_samples(
    source: &DecodedWav,
    target_rate_hz: u32,
    target_channels: u16,
) -> Vec<f32> {
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
        + u128::from(source.sample_rate_hz)
        - 1)
        / u128::from(source.sample_rate_hz)) as usize;
    let mut output = Vec::with_capacity(target_frames * usize::from(target_channels));
    for target_index in 0..target_frames {
        let source_position =
            target_index as f64 * source.sample_rate_hz as f64 / target_rate_hz as f64;
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
                        cursor.fill(data, |value| {
                            (value.clamp(-1.0, 1.0) * i16::MAX as f32).round() as i16
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
        cpal::SampleFormat::U16 => {
            let mut cursor = make_cursor(completion_tx.clone());
            let errors = Arc::clone(&callback_errors);
            let error_tx = completion_tx.clone();
            device
                .build_output_stream(
                    config,
                    move |data: &mut [u16], _| {
                        cursor.fill(data, |value| {
                            (((value.clamp(-1.0, 1.0) + 1.0) * 0.5) * u16::MAX as f32).round()
                                as u16
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

fn blocked(
    blocker: &str,
    note: &str,
    execution_attempted: bool,
    cancelled: bool,
) -> MeetingOutputDeliveryReport {
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
            return blocked(
                &blocker,
                "The synthesized Meeting WAV could not be prepared for native playback.",
                false,
                false,
            )
        }
    };
    let device = match find_output_device(output_name) {
        Ok(value) => value,
        Err(blocker) => {
            return blocked(
                &blocker,
                "The prepared Meeting virtual output endpoint is no longer available.",
                false,
                false,
            )
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
    let samples = Arc::new(prepare_output_samples(
        &wav,
        config.sample_rate.0,
        config.channels,
    ));
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
            return blocked(
                &blocker,
                "Another Meeting output delivery still owns the native route.",
                false,
                false,
            )
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
            return blocked(
                &blocker,
                "TranslateIT could not build the native Meeting output stream.",
                false,
                false,
            );
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

    let deadline = Duration::from_millis(delivery_deadline_ms(
        samples.len(),
        config.channels,
        config.sample_rate.0,
    ));
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
