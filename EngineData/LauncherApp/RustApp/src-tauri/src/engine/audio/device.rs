use cpal::traits::{DeviceTrait, HostTrait};
use serde::{Deserialize, Serialize};

use super::{TARGET_CHANNELS, TARGET_SAMPLE_RATE_HZ};

const MAX_AUDIO_DEVICE_NAME_CHARS: usize = 160;
const MAX_AUDIO_DISCOVERY_DEVICES: usize = 96;
const MAX_AUDIO_BLOCKER_CHARS: usize = 240;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDeviceInfo {
    pub id: String,
    pub name: String,
    pub is_default: bool,
    pub max_input_channels: u16,
    pub max_output_channels: u16,
    pub supports_target_format: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDeviceDiscoveryReport {
    pub backend_id: String,
    pub devices: Vec<AudioDeviceInfo>,
    pub blocker: Option<String>,
}

impl AudioDeviceDiscoveryReport {
    pub fn discover_native() -> Self {
        let host = cpal::default_host();
        let default_input_name = host.default_input_device().and_then(|device| safe_device_name(&device, None));
        let default_output_name = host.default_output_device().and_then(|device| safe_device_name(&device, None));

        let devices = match host.devices() {
            Ok(devices) => devices
                .take(MAX_AUDIO_DISCOVERY_DEVICES)
                .enumerate()
                .map(|(index, device)| build_device_info(index, &device, &default_input_name, &default_output_name))
                .collect::<Vec<_>>(),
            Err(error) => {
                return Self {
                    backend_id: format!("cpal-{}", host.id().name()),
                    devices: Vec::new(),
                    blocker: Some(compact_blocker(&format!("Native Rust audio device discovery failed: {error}"))),
                };
            }
        };

        let blocker = if devices.is_empty() {
            Some("Native Rust audio device discovery returned no devices.".to_string())
        } else {
            None
        };

        Self {
            backend_id: format!("cpal-{}", host.id().name()),
            devices,
            blocker,
        }
    }

    pub fn pending_native_backend() -> Self {
        Self {
            backend_id: "native-rust-audio-device-backend-pending".to_string(),
            devices: Vec::new(),
            blocker: Some(
                "Native Rust audio device discovery is not connected yet. The final runtime should use a Rust-native audio backend and must preserve target 16 kHz mono capture semantics.".to_string(),
            ),
        }
    }
}

fn is_unsafe_audio_text_character(character: char) -> bool {
    character == '\0'
        || ('\u{0001}'..='\u{0008}').contains(&character)
        || ('\u{000b}'..='\u{001f}').contains(&character)
        || character == '\u{007f}'
        || ('\u{202a}'..='\u{202e}').contains(&character)
        || ('\u{2066}'..='\u{2069}').contains(&character)
}

fn compact_audio_text(value: &str, max_chars: usize) -> String {
    value
        .trim()
        .chars()
        .filter(|character| !is_unsafe_audio_text_character(*character))
        .take(max_chars)
        .collect::<String>()
}

fn compact_blocker(value: &str) -> String {
    let clean = compact_audio_text(value, MAX_AUDIO_BLOCKER_CHARS);
    if clean.is_empty() { "audio_device:unknown_error".to_string() } else { clean }
}

fn safe_device_name(device: &cpal::Device, fallback: Option<String>) -> Option<String> {
    let raw = device.name().ok().or(fallback)?;
    let clean = compact_audio_text(&raw, MAX_AUDIO_DEVICE_NAME_CHARS);
    if clean.is_empty() { None } else { Some(clean) }
}

fn build_device_info(
    index: usize,
    device: &cpal::Device,
    default_input_name: &Option<String>,
    default_output_name: &Option<String>,
) -> AudioDeviceInfo {
    let name = safe_device_name(device, Some(format!("Unknown Audio Device {index}")))
        .unwrap_or_else(|| format!("Unknown Audio Device {index}"));

    let input_config = device.default_input_config().ok();
    let output_config = device.default_output_config().ok();
    let max_input_channels = input_config.as_ref().map(|config| config.channels()).unwrap_or(0);
    let max_output_channels = output_config.as_ref().map(|config| config.channels()).unwrap_or(0);
    let supports_target_format = input_config
        .as_ref()
        .map(|config| {
            config.channels() >= TARGET_CHANNELS
                && config.sample_rate().0 >= TARGET_SAMPLE_RATE_HZ
        })
        .unwrap_or(false);

    let is_default = default_input_name.as_ref() == Some(&name)
        || default_output_name.as_ref() == Some(&name);

    AudioDeviceInfo {
        id: format!("cpal-device-{index}"),
        name,
        is_default,
        max_input_channels,
        max_output_channels,
        supports_target_format,
    }
}
