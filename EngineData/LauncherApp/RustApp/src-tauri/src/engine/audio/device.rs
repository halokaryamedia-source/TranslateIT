use serde::{Deserialize, Serialize};

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
