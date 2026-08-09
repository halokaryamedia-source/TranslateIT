use cpal::traits::{DeviceTrait, HostTrait};
use serde::Serialize;

use crate::engine;
use crate::engine::adapters::asr_model_logic::{
    build_asr_profile_plan, AsrProfilePlan, AsrProfileRequest,
};
use crate::engine::adapters::asr_quality_logic::{
    evaluate_asr_quality, AsrQualityLogicDecision, AsrQualityLogicRequest,
};
use crate::engine::adapters::calibration_logic::{
    run_calibration_logic, CalibrationLogicRequest, CalibrationLogicResult,
};
use crate::engine::adapters::capture_loop_logic::{
    build_capture_loop_contract, CaptureLoopContractReport,
};
use crate::engine::adapters::frame_pipeline_logic::{
    analyze_frame_pipeline, FramePipelineReport, FramePipelineRequest,
};
use crate::engine::adapters::latency_logic::{
    build_latency_logic, build_vad_profile, LatencyLogicReport, LatencyLogicRequest,
    VadProfileReport, VadProfileRequest,
};
use crate::engine::adapters::native_capture_bridge_logic::{
    analyze_native_capture_bridge, NativeCaptureBridgeReport, NativeCaptureBridgeRequest,
};
use crate::engine::adapters::realtime_handoff_logic::{
    analyze_realtime_handoff, RealtimeHandoffReport, RealtimeHandoffRequest,
};
use crate::engine::adapters::stream_ownership_logic::{
    analyze_stream_ownership, StreamOwnershipReport, StreamOwnershipRequest,
};
use crate::engine::audio::buffer::{
    inspect_frame, planned_buffer_status, AudioBufferStatus, AudioFrameInspectionReport,
};
use crate::engine::audio::calibration_flow::{
    save_calibration_from_evidence, CalibrationFlowStatus, CalibrationSaveResult,
};
use crate::engine::audio::capture_plan::{
    plan_native_capture_stream, NativeCaptureStreamPlanReport, NativeCaptureStreamPlanRequest,
};
use crate::engine::audio::evidence::AudioEvidenceReport;
use crate::engine::audio::input::InputPreparationStatus;
use crate::engine::audio::input_config::NativeInputConfigProbeReport;
use crate::engine::audio::live_capture::LiveCaptureStatusReport;
use crate::engine::audio::noise_filter::{
    classify_noise, AudioNoiseAssessment, NoiseAssessmentRequest,
};
use crate::engine::audio::preprocess::{
    preprocess_audio, AudioPreprocessRequest, PreprocessingResult,
};
use crate::engine::audio::stream_build::{
    plan_native_capture_stream_build, NativeCaptureStreamBuildReport,
    NativeCaptureStreamBuildRequest,
};
use crate::engine::audio::vad::{
    evaluate_segment_decision, VadDecisionReport, VadSegmentDecisionRequest,
};
use crate::engine::audio::AudioFrame;
use crate::engine::runtime_state::{latest_runtime_session_state, record_realtime_handoff_report};

const MAX_AUDIO_DEVICE_NAME_CHARS: usize = 160;
const MAX_AUDIO_DEVICES_PER_KIND: usize = 64;

#[derive(Debug, Clone, Serialize)]
pub struct AudioDeviceSummary {
    pub id: String,
    pub name: String,
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct AudioDeviceListReport {
    pub ok: bool,
    pub input_devices: Vec<AudioDeviceSummary>,
    pub output_devices: Vec<AudioDeviceSummary>,
    pub blocker: String,
    pub note: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct AudioDeviceProbeReport {
    pub ok: bool,
    pub device_kind: String,
    pub requested_device_id: Option<String>,
    pub resolved_device_name: Option<String>,
    pub is_default: bool,
    pub sample_rate_hz: Option<u32>,
    pub channels: Option<u16>,
    pub blocker: String,
    pub note: String,
}

fn is_unsafe_device_name_character(character: char) -> bool {
    character == '\0'
        || ('\u{0001}'..='\u{0008}').contains(&character)
        || ('\u{000b}'..='\u{001f}').contains(&character)
        || character == '\u{007f}'
        || ('\u{202a}'..='\u{202e}').contains(&character)
        || ('\u{2066}'..='\u{2069}').contains(&character)
}

fn clean_device_name(value: String) -> Option<String> {
    let clean = value
        .trim()
        .chars()
        .filter(|character| !is_unsafe_device_name_character(*character))
        .take(MAX_AUDIO_DEVICE_NAME_CHARS)
        .collect::<String>()
        .trim()
        .to_string();
    if clean.is_empty() {
        None
    } else {
        Some(clean)
    }
}

fn device_name(device: &cpal::Device) -> Option<String> {
    device.name().ok().and_then(clean_device_name)
}

fn collect_devices(is_input: bool) -> Result<Vec<AudioDeviceSummary>, String> {
    let host = cpal::default_host();
    let default_name = if is_input {
        host.default_input_device()
            .and_then(|device| device_name(&device))
    } else {
        host.default_output_device()
            .and_then(|device| device_name(&device))
    };
    let devices = if is_input {
        host.input_devices()
            .map_err(|error| error.to_string())?
            .collect::<Vec<_>>()
    } else {
        host.output_devices()
            .map_err(|error| error.to_string())?
            .collect::<Vec<_>>()
    };
    let mut result = Vec::new();
    for device in devices {
        if result.len() >= MAX_AUDIO_DEVICES_PER_KIND {
            break;
        }
        if let Some(name) = device_name(&device) {
            if result
                .iter()
                .any(|item: &AudioDeviceSummary| item.name == name)
            {
                continue;
            }
            result.push(AudioDeviceSummary {
                id: name.clone(),
                is_default: default_name.as_deref() == Some(name.as_str()),
                name,
            });
        }
    }
    Ok(result)
}

fn find_output_device(
    host: &cpal::Host,
    requested_device_id: Option<&str>,
) -> Result<(cpal::Device, bool), String> {
    if let Some(requested_name) = requested_device_id.map(str::trim).filter(|value| !value.is_empty()) {
        let devices = host.output_devices().map_err(|error| error.to_string())?;
        for device in devices {
            if device_name(&device).as_deref() == Some(requested_name) {
                return Ok((device, false));
            }
        }
        return Err("The selected Meeting sound device is not available. The Windows default device was not substituted.".to_string());
    }

    host.default_output_device()
        .map(|device| (device, true))
        .ok_or_else(|| "No Windows default output device was found.".to_string())
}

#[tauri::command]
pub fn list_audio_devices() -> AudioDeviceListReport {
    let input = collect_devices(true);
    let output = collect_devices(false);
    let input_devices = input.unwrap_or_default();
    let output_devices = output.unwrap_or_default();
    let ok = !input_devices.is_empty() || !output_devices.is_empty();
    AudioDeviceListReport {
        ok,
        input_devices,
        output_devices,
        blocker: if ok {
            String::new()
        } else {
            "audio_devices:not_found".to_string()
        },
        note: if ok {
            "Audio devices were discovered from the native host.".to_string()
        } else {
            "No audio input or output devices were discovered from the native host.".to_string()
        },
    }
}

#[tauri::command]
pub fn probe_input_device_candidate(device_id: Option<String>) -> InputPreparationStatus {
    InputPreparationStatus::inspect_input_device(device_id.as_deref())
}

#[tauri::command]
pub fn probe_output_device_candidate(device_id: Option<String>) -> AudioDeviceProbeReport {
    let host = cpal::default_host();
    let requested_device_id = device_id
        .and_then(clean_device_name)
        .filter(|value| !value.is_empty());

    let (device, is_default) = match find_output_device(&host, requested_device_id.as_deref()) {
        Ok(value) => value,
        Err(message) => {
            return AudioDeviceProbeReport {
                ok: false,
                device_kind: "meeting_sound".to_string(),
                requested_device_id,
                resolved_device_name: None,
                is_default: false,
                sample_rate_hz: None,
                channels: None,
                blocker: "meeting_sound:device_unavailable".to_string(),
                note: message,
            }
        }
    };

    let resolved_device_name = device_name(&device);
    let config = match device.default_output_config() {
        Ok(config) => config,
        Err(error) => {
            return AudioDeviceProbeReport {
                ok: false,
                device_kind: "meeting_sound".to_string(),
                requested_device_id,
                resolved_device_name,
                is_default,
                sample_rate_hz: None,
                channels: None,
                blocker: "meeting_sound:no_output_config".to_string(),
                note: format!("The selected Meeting sound device exists, but no default output configuration was available: {error}"),
            }
        }
    };

    AudioDeviceProbeReport {
        ok: true,
        device_kind: "meeting_sound".to_string(),
        requested_device_id,
        resolved_device_name,
        is_default,
        sample_rate_hz: Some(config.sample_rate().0),
        channels: Some(config.channels()),
        blocker: String::new(),
        note: "The selected Meeting sound device has a usable native output configuration. Incoming Meeting Sound capture is still a separate unimplemented capability.".to_string(),
    }
}

#[tauri::command]
pub fn probe_native_input_config() -> NativeInputConfigProbeReport {
    NativeInputConfigProbeReport::probe_default_input()
}

#[tauri::command]
pub fn plan_native_capture_stream_state(
    request: NativeCaptureStreamPlanRequest,
) -> NativeCaptureStreamPlanReport {
    plan_native_capture_stream(request)
}

#[tauri::command]
pub fn plan_native_capture_stream_build_state(
    request: NativeCaptureStreamBuildRequest,
) -> NativeCaptureStreamBuildReport {
    plan_native_capture_stream_build(request)
}

#[tauri::command]
pub fn analyze_native_capture_bridge_state(
    request: NativeCaptureBridgeRequest,
) -> NativeCaptureBridgeReport {
    analyze_native_capture_bridge(request, latest_runtime_session_state())
}

#[tauri::command]
pub fn get_input_status() -> InputPreparationStatus {
    let settings = engine::load_settings();
    InputPreparationStatus::inspect_input_device(settings.audio.input_device_id.as_deref())
}

#[tauri::command]
pub fn get_audio_buffer_status() -> AudioBufferStatus {
    planned_buffer_status()
}

#[tauri::command]
pub fn get_live_capture_status() -> LiveCaptureStatusReport {
    engine::live_capture_runtime_status()
}

#[tauri::command]
pub fn analyze_capture_loop_contract() -> CaptureLoopContractReport {
    build_capture_loop_contract()
}

#[tauri::command]
pub fn analyze_stream_ownership_plan(request: StreamOwnershipRequest) -> StreamOwnershipReport {
    analyze_stream_ownership(request)
}

#[tauri::command]
pub fn analyze_realtime_handoff_plan(request: RealtimeHandoffRequest) -> RealtimeHandoffReport {
    let report = analyze_realtime_handoff(request);
    let _ = record_realtime_handoff_report(&report);
    report
}

#[tauri::command]
pub fn analyze_frame_pipeline_state(request: FramePipelineRequest) -> FramePipelineReport {
    analyze_frame_pipeline(request)
}

#[tauri::command]
pub fn analyze_audio_payload(frame: AudioFrame) -> AudioFrameInspectionReport {
    inspect_frame(frame)
}

#[tauri::command]
pub fn preprocess_audio_payload(request: AudioPreprocessRequest) -> PreprocessingResult {
    preprocess_audio(request)
}

#[tauri::command]
pub fn classify_audio_noise(request: NoiseAssessmentRequest) -> AudioNoiseAssessment {
    classify_noise(request)
}

#[tauri::command]
pub fn run_mic_calibration_logic(request: CalibrationLogicRequest) -> CalibrationLogicResult {
    run_calibration_logic(request)
}

#[tauri::command]
pub fn analyze_vad_segment(request: VadSegmentDecisionRequest) -> VadDecisionReport {
    evaluate_segment_decision(request)
}

#[tauri::command]
pub fn plan_asr_profile(request: AsrProfileRequest) -> AsrProfilePlan {
    build_asr_profile_plan(request)
}

#[tauri::command]
pub fn analyze_asr_quality(request: AsrQualityLogicRequest) -> AsrQualityLogicDecision {
    evaluate_asr_quality(request)
}

#[tauri::command]
pub fn analyze_latency_logic(request: LatencyLogicRequest) -> LatencyLogicReport {
    build_latency_logic(request)
}

#[tauri::command]
pub fn resolve_vad_profile(request: VadProfileRequest) -> VadProfileReport {
    build_vad_profile(request)
}

#[tauri::command]
pub fn get_calibration_flow_status() -> CalibrationFlowStatus {
    CalibrationFlowStatus::current()
}

#[tauri::command]
pub fn save_calibration_profile(
    input_device_id: Option<String>,
    quiet: AudioEvidenceReport,
    speech: AudioEvidenceReport,
) -> CalibrationSaveResult {
    save_calibration_from_evidence(input_device_id, quiet, speech)
}
