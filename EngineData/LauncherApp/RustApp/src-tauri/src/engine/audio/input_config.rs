use cpal::traits::{DeviceTrait, HostTrait};
use serde::{Deserialize, Serialize};

use super::{TARGET_CHANNELS, TARGET_SAMPLE_RATE_HZ};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputConfigRangeInfo {
    pub channels: u16,
    pub min_sample_rate_hz: u32,
    pub max_sample_rate_hz: u32,
    pub sample_format: String,
    pub supports_target_sample_rate: bool,
    pub supports_target_channels: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeInputConfigProbeReport {
    pub backend_id: String,
    pub has_default_input: bool,
    pub default_input_name: Option<String>,
    pub default_sample_rate_hz: Option<u32>,
    pub default_channels: Option<u16>,
    pub default_sample_format: Option<String>,
    pub supports_target_format: bool,
    pub ready_for_capture_bridge: bool,
    pub supported_input_ranges: Vec<InputConfigRangeInfo>,
    pub blockers: Vec<String>,
    pub note: String,
}

impl NativeInputConfigProbeReport {
    pub fn probe_default_input() -> Self {
        let host = cpal::default_host();
        let backend_id = format!("cpal-{}", host.id().name());
        let Some(device) = host.default_input_device() else {
            return Self {
                backend_id,
                has_default_input: false,
                default_input_name: None,
                default_sample_rate_hz: None,
                default_channels: None,
                default_sample_format: None,
                supports_target_format: false,
                ready_for_capture_bridge: false,
                supported_input_ranges: Vec::new(),
                blockers: vec!["input_config:no_default_input_device".to_string()],
                note: "No default CPAL input device was found.".to_string(),
            };
        };

        let default_input_name = device.name().ok();
        let default_config = device.default_input_config().ok();
        let supported_input_ranges = match device.supported_input_configs() {
            Ok(configs) => configs
                .map(|config| InputConfigRangeInfo {
                    channels: config.channels(),
                    min_sample_rate_hz: config.min_sample_rate().0,
                    max_sample_rate_hz: config.max_sample_rate().0,
                    sample_format: format!("{:?}", config.sample_format()),
                    supports_target_sample_rate: config.min_sample_rate().0 <= TARGET_SAMPLE_RATE_HZ
                        && config.max_sample_rate().0 >= TARGET_SAMPLE_RATE_HZ,
                    supports_target_channels: config.channels() >= TARGET_CHANNELS,
                })
                .collect::<Vec<_>>(),
            Err(_) => Vec::new(),
        };

        let supports_target_format = supported_input_ranges.iter().any(|config| {
            config.supports_target_sample_rate && config.supports_target_channels
        });
        let mut blockers = Vec::new();
        if default_config.is_none() {
            blockers.push("input_config:no_default_input_config".to_string());
        }
        if !supports_target_format {
            blockers.push("input_config:target_format_not_supported".to_string());
        }

        let ready_for_capture_bridge = blockers.is_empty();
        let note = if ready_for_capture_bridge {
            "Default CPAL input config can satisfy the target capture contract. Real stream creation is still not performed by this probe.".to_string()
        } else {
            format!(
                "Default CPAL input config probe is blocked before stream creation. blocker_count={}",
                blockers.len()
            )
        };

        Self {
            backend_id,
            has_default_input: true,
            default_input_name,
            default_sample_rate_hz: default_config.as_ref().map(|config| config.sample_rate().0),
            default_channels: default_config.as_ref().map(|config| config.channels()),
            default_sample_format: default_config.as_ref().map(|config| format!("{:?}", config.sample_format())),
            supports_target_format,
            ready_for_capture_bridge,
            supported_input_ranges,
            blockers,
            note,
        }
    }
}
