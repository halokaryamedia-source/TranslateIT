use serde::Serialize;
use std::fs;
use std::io::{self, Write};
use std::path::PathBuf;

use super::finalized_utterance::FinalizedMeetingUtterance;
use super::{duration_ms, TARGET_SAMPLE_RATE_HZ};
use crate::engine::paths::ProjectPaths;

const MIN_ASR_SEGMENT_DURATION_MS: u32 = 300;
// Safety/storage ceiling for the finalized producer only; this must not be used to
// force a speech boundary. Overlong speech is dropped by the producer rather than
// cut into a fake final utterance.
const MAX_FINALIZED_ASR_SEGMENT_SAMPLES: usize = TARGET_SAMPLE_RATE_HZ as usize * 60;
const FINALIZED_SEGMENT_ROOT_LABEL: &str = "UserData/CacheData/audio_segments/";

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

pub fn write_finalized_outbound_utterance_wav(
    utterance: &FinalizedMeetingUtterance,
) -> LiveSegmentWavWriteReport {
    if utterance.lane != "you" || utterance.generation.is_none() {
        return invalid_lane_report(utterance, "you", "finalized_outbound_writer");
    }
    write_finalized_meeting_utterance_wav(utterance)
}

pub fn write_finalized_incoming_utterance_wav(
    utterance: &FinalizedMeetingUtterance,
) -> LiveSegmentWavWriteReport {
    if utterance.lane != "incoming" || utterance.generation.is_some() {
        return invalid_lane_report(utterance, "incoming", "finalized_incoming_writer");
    }
    write_finalized_meeting_utterance_wav(utterance)
}

fn write_finalized_meeting_utterance_wav(
    utterance: &FinalizedMeetingUtterance,
) -> LiveSegmentWavWriteReport {
    let frame = &utterance.frame;
    let frame_duration_ms = duration_ms(frame.samples.len(), frame.sample_rate_hz);
    if let Some(report) = validate_target_frame(
        frame.sample_rate_hz,
        frame.channels,
        &frame.samples,
        frame_duration_ms,
        MAX_FINALIZED_ASR_SEGMENT_SAMPLES,
        "finalized_utterance_writer",
    ) {
        return report;
    }

    let session_component = safe_file_component(&utterance.session_id);
    let lane_component = safe_file_component(&utterance.lane);
    if session_component.is_empty() || lane_component.is_empty() || utterance.sequence == 0 {
        return LiveSegmentWavWriteReport {
            ok: false,
            audio_path: None,
            sample_rate_hz: frame.sample_rate_hz,
            channels: frame.channels,
            sample_count: frame.samples.len(),
            duration_ms: frame_duration_ms,
            blocker: "finalized_utterance_writer:invalid_event_identity".to_string(),
            note: "Finalized Meeting utterance WAV was not written because its session/lane/event identity is invalid."
                .to_string(),
        };
    }

    let generation_component = utterance
        .generation
        .map(|generation| format!("g{generation}_"))
        .unwrap_or_default();
    let filename = format!(
        "final_{}_s{}_{}_{}u{}.wav",
        session_component,
        utterance.sequence,
        lane_component,
        generation_component,
        utterance.utterance_id
    );
    let project_paths = ProjectPaths::discover();
    let audio_dir = PathBuf::from(project_paths.user_cache_dir).join("audio_segments");
    let audio_path = audio_dir.join(&filename);
    let label = format!("{FINALIZED_SEGMENT_ROOT_LABEL}{filename}");

    match write_pcm16_wav(
        &audio_path,
        frame.sample_rate_hz,
        frame.channels,
        &frame.samples,
    ) {
        Ok(()) => LiveSegmentWavWriteReport {
            ok: true,
            audio_path: Some(label),
            sample_rate_hz: frame.sample_rate_hz,
            channels: frame.channels,
            sample_count: frame.samples.len(),
            duration_ms: frame_duration_ms,
            blocker: String::new(),
            note: format!(
                "Finalized {} utterance {} for Meeting event sequence {} was written once as temporary PCM16 WAV.",
                utterance.lane, utterance.utterance_id, utterance.sequence
            ),
        },
        Err(_error) => LiveSegmentWavWriteReport {
            ok: false,
            audio_path: None,
            sample_rate_hz: frame.sample_rate_hz,
            channels: frame.channels,
            sample_count: frame.samples.len(),
            duration_ms: frame_duration_ms,
            blocker: "finalized_utterance_writer:wav_write_failed".to_string(),
            note: "Failed to write finalized Meeting utterance WAV. No AI/output stage should consume this utterance and no finalized path is promoted."
                .to_string(),
        },
    }
}

fn invalid_lane_report(
    utterance: &FinalizedMeetingUtterance,
    expected_lane: &str,
    blocker_prefix: &str,
) -> LiveSegmentWavWriteReport {
    LiveSegmentWavWriteReport {
        ok: false,
        audio_path: None,
        sample_rate_hz: utterance.frame.sample_rate_hz,
        channels: utterance.frame.channels,
        sample_count: utterance.frame.samples.len(),
        duration_ms: duration_ms(utterance.frame.samples.len(), utterance.frame.sample_rate_hz),
        blocker: format!("{blocker_prefix}:lane_mismatch"),
        note: format!("Finalized utterance did not match the expected {expected_lane} lane contract."),
    }
}

pub fn remove_finalized_meeting_utterance_wav(audio_path: &str) {
    let Some(filename) = finalized_audio_filename(audio_path) else {
        return;
    };
    let project_paths = ProjectPaths::discover();
    let path = PathBuf::from(project_paths.user_cache_dir)
        .join("audio_segments")
        .join(filename);
    let _ = fs::remove_file(path);
}

fn finalized_audio_filename(audio_path: &str) -> Option<String> {
    let normalized = audio_path.trim().replace('\\', "/");
    let filename = normalized.strip_prefix(FINALIZED_SEGMENT_ROOT_LABEL)?;
    if filename.is_empty()
        || filename.contains('/')
        || filename.contains('\\')
        || !filename.starts_with("final_")
        || !filename.ends_with(".wav")
    {
        return None;
    }
    Some(filename.to_string())
}

fn validate_target_frame(
    sample_rate_hz: u32,
    channels: u16,
    samples: &[f32],
    frame_duration_ms: u32,
    max_samples: usize,
    blocker_prefix: &str,
) -> Option<LiveSegmentWavWriteReport> {
    if sample_rate_hz != TARGET_SAMPLE_RATE_HZ || channels != 1 {
        return Some(LiveSegmentWavWriteReport {
            ok: false,
            audio_path: None,
            sample_rate_hz,
            channels,
            sample_count: samples.len(),
            duration_ms: frame_duration_ms,
            blocker: format!("{blocker_prefix}:frame_not_target_format"),
            note: "Finalized audio must be 16 kHz mono before worker transcription.".to_string(),
        });
    }

    if samples.is_empty() || samples.len() > max_samples {
        return Some(LiveSegmentWavWriteReport {
            ok: false,
            audio_path: None,
            sample_rate_hz,
            channels,
            sample_count: samples.len(),
            duration_ms: frame_duration_ms,
            blocker: format!("{blocker_prefix}:sample_count_out_of_range"),
            note: "Audio sample count is outside the safe WAV writer range.".to_string(),
        });
    }

    if frame_duration_ms < MIN_ASR_SEGMENT_DURATION_MS {
        return Some(LiveSegmentWavWriteReport {
            ok: false,
            audio_path: None,
            sample_rate_hz,
            channels,
            sample_count: samples.len(),
            duration_ms: frame_duration_ms,
            blocker: format!("{blocker_prefix}:segment_too_short"),
            note: format!(
                "Finalized audio is too short for the current ASR writer contract. Minimum: {MIN_ASR_SEGMENT_DURATION_MS}ms."
            ),
        });
    }

    None
}

fn safe_file_component(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|character| character.is_ascii_alphanumeric() || matches!(character, '_' | '-'))
        .take(96)
        .collect()
}

pub(crate) fn write_pcm16_wav(
    path: &PathBuf,
    sample_rate_hz: u32,
    channels: u16,
    samples: &[f32],
) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let temp_path = path.with_extension("wav.tmp");
    let write_result = (|| -> io::Result<()> {
        let mut file = fs::File::create(&temp_path)?;
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
            let value = (safe_sample(*sample) * i16::MAX as f32).round() as i16;
            file.write_all(&value.to_le_bytes())?;
        }
        file.flush()?;
        drop(file);

        match fs::rename(&temp_path, path) {
            Ok(()) => Ok(()),
            Err(error) => {
                if path.exists() {
                    fs::remove_file(path)?;
                    fs::rename(&temp_path, path)
                } else {
                    Err(error)
                }
            }
        }
    })();

    if write_result.is_err() {
        let _ = fs::remove_file(&temp_path);
    }
    write_result
}

fn safe_sample(value: f32) -> f32 {
    if value.is_finite() {
        value.clamp(-1.0, 1.0)
    } else {
        0.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn unique_test_root(label: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time after epoch")
            .as_nanos();
        std::env::temp_dir().join(format!(
            "translateit-{label}-{}-{nonce}",
            std::process::id()
        ))
    }

    #[test]
    fn failed_wav_promotion_removes_partial_temp_file() {
        let root = unique_test_root("wav-failure-cleanup");
        fs::create_dir_all(&root).expect("create test root");
        let destination = root.join("blocked.wav");
        fs::create_dir_all(&destination).expect("create directory at destination path");
        let temp_path = destination.with_extension("wav.tmp");

        let result = write_pcm16_wav(&destination, TARGET_SAMPLE_RATE_HZ, 1, &[0.25, -0.25]);

        assert!(result.is_err(), "directory destination must reject WAV promotion");
        assert!(
            !temp_path.exists(),
            "failed WAV promotion must not leave a partial temp file"
        );
        assert!(destination.is_dir(), "failed promotion must not remove the blocking directory");

        fs::remove_dir_all(root).expect("remove test root");
    }
}
