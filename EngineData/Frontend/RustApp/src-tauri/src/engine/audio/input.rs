use cpal::traits::{DeviceTrait, HostTrait};
use serde::Serialize;

use super::{TARGET_CHANNELS, TARGET_SAMPLE_RATE_HZ};

const MAX_INPUT_DEVICE_NAME_CHARS: usize = 160;

#[derive(Debug, Clone, Serialize)]
pub struct InputPreparationStatus {
    pub backend_id: String,
    pub input_device_name: Option<String>,
    pub target_sample_rate_hz: u32,
    pub target_channels: u16,
    pub prepared: bool,
    pub running: bool,
    pub note: String,
}

impl InputPreparationStatus {
    pub fn inspect_default_input() -> Self {
        let host = cpal::default_host();
        let backend_id = format!("cpal-{}", host.id().name());

        let Some(device) = host.default_input_device() else {
            return Self::blocked(backend_id, None, "No default input device was found.");
        };

        let device_name = safe_device_name(&device);
        let Ok(config) = device.default_input_config() else {
            return Self::blocked(
                backend_id,
                device_name,
                "Default input device exists, but no default input config was available.",
            );
        };

        let device_rate = config.sample_rate().0;
        let device_channels = config.channels();
        if device_rate < TARGET_SAMPLE_RATE_HZ || device_channels < TARGET_CHANNELS {
            return Self::blocked(
                backend_id,
                device_name,
                "Default input device does not satisfy the target 16 kHz mono pipeline requirement.",
            );
        }

        Self {
            backend_id,
            input_device_name: device_name,
            target_sample_rate_hz: TARGET_SAMPLE_RATE_HZ,
            target_channels: TARGET_CHANNELS,
            prepared: true,
            running: false,
            note: "Default input device is usable for the Rust input pipeline boundary. Live stream start remains blocked until calibration flow is connected.".to_string(),
        }
    }

    fn blocked(backend_id: String, input_device_name: Option<String>, note: &str) -> Self {
        Self {
            backend_id,
            input_device_name,
            target_sample_rate_hz: TARGET_SAMPLE_RATE_HZ,
            target_channels: TARGET_CHANNELS,
            prepared: false,
            running: false,
            note: note.to_string(),
        }
    }
}

fn is_unsafe_input_name_character(character: char) -> bool {
    character == '\0'
        || ('\u{0001}'..='\u{0008}').contains(&character)
        || ('\u{000b}'..='\u{001f}').contains(&character)
        || character == '\u{007f}'
        || ('\u{202a}'..='\u{202e}').contains(&character)
        || ('\u{2066}'..='\u{2069}').contains(&character)
}

fn safe_device_name(device: &cpal::Device) -> Option<String> {
    let clean = device
        .name()
        .ok()?
        .trim()
        .chars()
        .filter(|character| !is_unsafe_input_name_character(*character))
        .take(MAX_INPUT_DEVICE_NAME_CHARS)
        .collect::<String>()
        .trim()
        .to_string();
    if clean.is_empty() {
        None
    } else {
        Some(clean)
    }
}
