use serde::Serialize;
use std::fs;
use std::io::{self, Write};
use std::path::PathBuf;

use super::live_audio_buffer::live_target_segment_snapshot;
use super::TARGET_SAMPLE_RATE_HZ;
use crate::engine::paths::ProjectPaths;

#[derive(Debug, Clone, Serialize)]
pub struct LiveSegmentWavWriteReport {
    pub ok: bool,
    pub audio_path: Option<String>,
    pub sample_rate_hz: u32,
    pub channels: u16,
    pub sample_count: usize,
    pub duration_ms: u32,
    pub blocker: String,
    pub note: String,
}

pub fn write_latest_live_target_segment_wav() -> LiveSegmentWavWriteReport {
    let segment = live_target_segment_snapshot();
    if !segment.ready {
        return LiveSegmentWavWriteReport {
            ok: false,
            audio_path: None,
            sample_rate_hz: TARGET_SAMPLE_RATE_HZ,
            channels: 1,
            sample_count: 0,
            duration_ms: 0,
            blocker: format!("live_segment_writer:target_not_ready:{}", segment.blocker),
            note: "Live target ASR segment is not ready to be written as WAV.".to_string(),
        };
    }

    let Some(frame) = segment.frame else {
        return LiveSegmentWavWriteReport {
            ok: false,
            audio_path: None,
            sample_rate_hz: TARGET_SAMPLE_RATE_HZ,
            channels: 1,
            sample_count: 0,
            duration_ms: 0,
            blocker: "live_segment_writer:missing_frame".to_string(),
            note: "Live target segment is ready but the frame payload is missing.".to_string(),
        };
    };

    if !frame.is_target_format() {
        return LiveSegmentWavWriteReport {
            ok: false,
            audio_path: None,
            sample_rate_hz: frame.sample_rate_hz,
            channels: frame.channels,
            sample_count: frame.samples.len(),
            duration_ms: duration_ms(frame.samples.len(), frame.sample_rate_hz),
            blocker: "live_segment_writer:frame_not_target_format".to_string(),
            note: "Live target frame must be 16 kHz mono before worker transcription.".to_string(),
        };
    }

    let project_paths = ProjectPaths::discover();
    let audio_dir = PathBuf::from(project_paths.user_cache_dir).join("audio_segments");
    let audio_path = audio_dir.join("latest_live_target_segment.wav");
    let write_result = write_pcm16_wav(&audio_path, frame.sample_rate_hz, frame.channels, &frame.samples);
    match write_result {
        Ok(()) => LiveSegmentWavWriteReport {
            ok: true,
            audio_path: Some(audio_path.to_string_lossy().replace('\\', "/")),
            sample_rate_hz: frame.sample_rate_hz,
            channels: frame.channels,
            sample_count: frame.samples.len(),
            duration_ms: duration_ms(frame.samples.len(), frame.sample_rate_hz),
            blocker: String::new(),
            note: "Live target ASR segment was written as PCM16 WAV for the local worker.".to_string(),
        },
        Err(error) => LiveSegmentWavWriteReport {
            ok: false,
            audio_path: Some(audio_path.to_string_lossy().replace('\\', "/")),
            sample_rate_hz: frame.sample_rate_hz,
            channels: frame.channels,
            sample_count: frame.samples.len(),
            duration_ms: duration_ms(frame.samples.len(), frame.sample_rate_hz),
            blocker: "live_segment_writer:wav_write_failed".to_string(),
            note: error.to_string(),
        },
    }
}

fn write_pcm16_wav(path: &PathBuf, sample_rate_hz: u32, channels: u16, samples: &[f32]) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let mut file = fs::File::create(path)?;
    let bits_per_sample = 16u16;
    let bytes_per_sample = bits_per_sample / 8;
    let block_align = channels * bytes_per_sample;
    let byte_rate = sample_rate_hz * u32::from(block_align);
    let data_size = (samples.len() * usize::from(bytes_per_sample)) as u32;
    let riff_size = 36u32.saturating_add(data_size);

    file.write_all(b"RIFF")?;
    file.write_all(&riff_size.to_le_bytes())?;
    file.write_all(b"WAVE")?;
    file.write_all(b"fmt ")?;
    file.write_all(&16u32.to_le_bytes())?;
    file.write_all(&1u16.to_le_bytes())?;
    file.write_all(&channels.to_le_bytes())?;
    file.write_all(&sample_rate_hz.to_le_bytes())?;
    file.write_all(&byte_rate.to_le_bytes())?;
    file.write_all(&block_align.to_le_bytes())?;
    file.write_all(&bits_per_sample.to_le_bytes())?;
    file.write_all(b"data")?;
    file.write_all(&data_size.to_le_bytes())?;

    for sample in samples {
        let value = (sample.clamp(-1.0, 1.0) * i16::MAX as f32).round() as i16;
        file.write_all(&value.to_le_bytes())?;
    }

    Ok(())
}

fn duration_ms(sample_count: usize, sample_rate_hz: u32) -> u32 {
    if sample_rate_hz == 0 {
        return 0;
    }
    ((sample_count as u64 * 1_000) / sample_rate_hz as u64) as u32
}
