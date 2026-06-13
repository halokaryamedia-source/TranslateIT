use serde::Serialize;
use std::path::Path;

use super::adapters::asr::AsrAdapterContract;
use super::adapters::translation::TranslationAdapterContract;
use super::adapters::tts::TtsAdapterContract;
use super::audio::device::AudioDeviceDiscoveryReport;
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
    pub cuda_probe: CudaProbeReport,
    pub native_inference_candidates: Vec<NativeInferenceBackendSelection>,
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
        let cuda_probe = CudaProbeReport::probe_host();

        let native_inference_candidates = vec![
            NativeInferenceBackendSelection::ctranslate2_candidate(),
            NativeInferenceBackendSelection::onnxruntime_candidate(),
            NativeInferenceBackendSelection::pending_cuda_selection(
                "No native CUDA inference backend has been selected yet. Selection must be based on parity and final packaging validation.",
            ),
        ];

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
            cuda_probe,
            native_inference_candidates,
            cuda_backend_candidates,
            blockers,
        }
    }
}

fn path_note(label: &str, value: &str) -> String {
    let exists = Path::new(value).exists();
    format!("{label} path: {value} | exists={exists}")
}
