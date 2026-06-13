use serde::Serialize;
use std::path::{Path, PathBuf};

use super::adapters::asr::{AsrAdapterContract, AsrAdapterPlan};
use super::adapters::translation::{TranslationAdapterContract, TranslationAdapterPlan};
use super::adapters::tts::TtsAdapterContract;
use super::audio::calibration::CalibrationProfileStatus;
use super::audio::device::AudioDeviceDiscoveryReport;
use super::audio::input::InputPreparationStatus;
use super::cuda_policy::{CudaBackendStrategy, APPROVED_FULL_RUST_DIRECTION};
use super::inference::backend::NativeInferenceBackendSelection;
use super::inference::cuda_probe::CudaProbeReport;
use super::paths::ProjectPaths;

#[derive(Debug, Clone, Serialize)]
pub struct RuntimeDiagnostics {
    pub project_paths: ProjectPaths,
    pub rust_runtime_target: String,
    pub final_runtime_allows_python: bool,
    pub audio_device_discovery: AudioDeviceDiscoveryReport,
    pub input_preparation_status: InputPreparationStatus,
    pub calibration_profile_status: CalibrationProfileStatus,
    pub cuda_probe: CudaProbeReport,
    pub native_inference_candidates: Vec<NativeInferenceBackendSelection>,
    pub asr_adapter_plan: AsrAdapterPlan,
    pub translation_adapter_plan: TranslationAdapterPlan,
    pub cuda_backend_candidates: Vec<String>,
    pub blockers: Vec<String>,
}

impl RuntimeDiagnostics {
    pub fn collect() -> Self {
        let project_paths = ProjectPaths::discover();
        let asr = AsrAdapterContract::default();
        let translation = TranslationAdapterContract::default();
        let tts = TtsAdapterContract::default();
        let audio_device_discovery = AudioDeviceDiscoveryReport::discover_native();
        let input_preparation_status = InputPreparationStatus::inspect_default_input();
        let calibration_profile_status = CalibrationProfileStatus::from_path(
            &PathBuf::from(&project_paths.user_cache_dir).join("rust_calibration_profile.json"),
        );
        let cuda_probe = CudaProbeReport::probe_host();
        let ctranslate2_candidate = NativeInferenceBackendSelection::ctranslate2_candidate();

        let native_inference_candidates = vec![
            ctranslate2_candidate.clone(),
            NativeInferenceBackendSelection::onnxruntime_candidate(),
            NativeInferenceBackendSelection::pending_cuda_selection(
                "No native CUDA inference backend has been selected yet. Selection must be based on parity and final packaging validation.",
            ),
        ];

        let asr_adapter_plan = asr.plan_with_backend(ctranslate2_candidate.clone(), cuda_probe.clone());
        let translation_adapter_plan = translation.plan_with_backend(ctranslate2_candidate, cuda_probe.clone());

        let cuda_backend_candidates = vec![
            format!("native-ctranslate2-ffi: {}", CudaBackendStrategy::NativeCTranslate2Ffi.risk_note()),
            format!("native-onnxruntime-cuda: {}", CudaBackendStrategy::NativeOnnxRuntimeCuda.risk_note()),
            format!("native-tensorrt-adapter: {}", CudaBackendStrategy::NativeTensorRtAdapter.risk_note()),
        ];

        let mut blockers = vec![
            asr.blocker_note().to_string(),
            translation.blocker_note().to_string(),
            tts.blocker_note().to_string(),
            path_note("User cache", &project_paths.user_cache_dir),
            path_note("User log", &project_paths.user_log_dir),
            path_note("User saved", &project_paths.user_saved_dir),
            calibration_profile_status.note.clone(),
            input_preparation_status.note.clone(),
        ];

        if let Some(blocker) = &audio_device_discovery.blocker {
            blockers.push(blocker.clone());
        }
        if let Some(blocker) = &cuda_probe.blocker {
            blockers.push(blocker.clone());
        }

        Self {
            project_paths,
            rust_runtime_target: APPROVED_FULL_RUST_DIRECTION.to_string(),
            final_runtime_allows_python: false,
            audio_device_discovery,
            input_preparation_status,
            calibration_profile_status,
            cuda_probe,
            native_inference_candidates,
            asr_adapter_plan,
            translation_adapter_plan,
            cuda_backend_candidates,
            blockers,
        }
    }
}

fn path_note(label: &str, value: &str) -> String {
    let exists = Path::new(value).exists();
    format!("{label} path: {value} | exists={exists}")
}
