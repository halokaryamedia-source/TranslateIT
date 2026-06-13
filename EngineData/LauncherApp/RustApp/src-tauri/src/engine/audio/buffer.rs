use serde::Serialize;

use super::evidence::AudioEvidenceReport;
use super::vad::{evaluate_vad_gate, VadGateConfig, VadGateResult};
use super::{AudioFrame, TARGET_CHANNELS, TARGET_SAMPLE_RATE_HZ};

#[derive(Debug, Clone, Serialize)]
pub struct AudioBufferStatus {
    pub target_sample_rate_hz: u32,
    pub target_channels: u16,
    pub max_frames: usize,
    pub current_frames: usize,
    pub ready_for_calibration: bool,
    pub ready_for_vad: bool,
    pub note: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct AudioFrameInspectionReport {
    pub accepted_by_buffer: bool,
    pub buffer_status: AudioBufferStatus,
    pub evidence: AudioEvidenceReport,
    pub vad_result: VadGateResult,
    pub note: String,
}

#[derive(Debug, Clone)]
pub struct AudioFrameBuffer {
    max_frames: usize,
    frames: Vec<AudioFrame>,
}

impl AudioFrameBuffer {
    pub fn new(max_frames: usize) -> Self {
        Self {
            max_frames,
            frames: Vec::with_capacity(max_frames),
        }
    }

    pub fn push(&mut self, frame: AudioFrame) -> Result<(), String> {
        if !frame.is_target_format() {
            return Err("Audio frame does not match target 16 kHz mono format.".to_string());
        }

        if self.frames.len() >= self.max_frames {
            self.frames.remove(0);
        }
        self.frames.push(frame);
        Ok(())
    }

    pub fn status(&self) -> AudioBufferStatus {
        AudioBufferStatus {
            target_sample_rate_hz: TARGET_SAMPLE_RATE_HZ,
            target_channels: TARGET_CHANNELS,
            max_frames: self.max_frames,
            current_frames: self.frames.len(),
            ready_for_calibration: self.frames.len() >= 2,
            ready_for_vad: !self.frames.is_empty(),
            note: "Rust audio frame buffer boundary is available. Live stream ingestion is still pending.".to_string(),
        }
    }
}

impl Default for AudioBufferStatus {
    fn default() -> Self {
        Self {
            target_sample_rate_hz: TARGET_SAMPLE_RATE_HZ,
            target_channels: TARGET_CHANNELS,
            max_frames: 0,
            current_frames: 0,
            ready_for_calibration: false,
            ready_for_vad: false,
            note: "Rust audio frame buffer is not active yet.".to_string(),
        }
    }
}

pub fn planned_buffer_status() -> AudioBufferStatus {
    AudioFrameBuffer::new(32).status()
}

pub fn inspect_frame(frame: AudioFrame) -> AudioFrameInspectionReport {
    let evidence = AudioEvidenceReport::from_samples(&frame.samples);
    let vad_result = evaluate_vad_gate(evidence.clone(), &VadGateConfig::default());
    let mut buffer = AudioFrameBuffer::new(32);
    let accepted_by_buffer = buffer.push(frame).is_ok();
    let note = if accepted_by_buffer {
        "Audio frame passed target-format buffer validation."
    } else {
        "Audio frame failed target-format buffer validation."
    };

    AudioFrameInspectionReport {
        accepted_by_buffer,
        buffer_status: buffer.status(),
        evidence,
        vad_result,
        note: note.to_string(),
    }
}
