use cpal::traits::{DeviceTrait, HostTrait};
use serde::{Deserialize, Serialize};

use super::{TARGET_CHANNELS, TARGET_SAMPLE_RATE_HZ};

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
        let default_input_name = host.default_input_device().and_then(|device| device.name().ok());
        let default_output_name = host.default_output_device().and_then(|device| device.name().ok());

        let devices = match host.devices() {
            Ok(devices) => devices
                .enumerate()
                .map(|(index, device)| build_device_info(index, &device, &default_input_name, &default_output_name))
                .collect::<Vec<_>>(),
            Err(error) => {
                return Self {
                    backend_id: format!("cpal-{}", cpal::default_host().id().name()),
                    devices: Vec::new(),
                    blocker: Some(format!("Native Rust audio device discovery failed: {error}")),
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

fn build_device_info(
    index: usize,
    device: &cpal::Device,
    default_input_name: &Option<String>,
    default_output_name: &Option<String>,
) -> AudioDeviceInfo {
    let name = device
        .name()
        .unwrap_or_else(|_| format!("Unknown Audio Device {index}"));

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
