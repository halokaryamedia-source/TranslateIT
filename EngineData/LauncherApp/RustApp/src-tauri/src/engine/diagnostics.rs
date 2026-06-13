use serde::Serialize;
use std::path::Path;

use super::adapters::asr::AsrAdapterContract;
use super::adapters::translation::TranslationAdapterContract;
use super::adapters::tts::TtsAdapterContract;
use super::cuda_policy::{CudaBackendStrategy, APPROVED_FULL_RUST_DIRECTION};
use super::paths::ProjectPaths;

#[derive(Debug, Clone, Serialize)]
pub struct RuntimeDiagnostics {
    pub project_paths: ProjectPaths,
    pub rust_runtime_target: String,
    pub final_runtime_allows_python: bool,
    pub cuda_backend_candidates: Vec<String>,
    pub blockers: Vec<String>,
}

impl RuntimeDiagnostics {
    pub fn collect() -> Self {
        let project_paths = ProjectPaths::discover();
        let asr = AsrAdapterContract::default();
        let translation = TranslationAdapterContract::default();
        let tts = TtsAdapterContract::default();

        let cuda_backend_candidates = vec![
            format!("native-ctranslate2-ffi: {}", CudaBackendStrategy::NativeCTranslate2Ffi.risk_note()),
            format!("native-onnxruntime-cuda: {}", CudaBackendStrategy::NativeOnnxRuntimeCuda.risk_note()),
            format!("native-tensorrt-adapter: {}", CudaBackendStrategy::NativeTensorRtAdapter.risk_note()),
        ];

        let blockers = vec![
            asr.blocker_note().to_string(),
            translation.blocker_note().to_string(),
            tts.blocker_note().to_string(),
            path_note("User cache", &project_paths.user_cache_dir),
            path_note("User log", &project_paths.user_log_dir),
            path_note("User saved", &project_paths.user_saved_dir),
        ];

        Self {
            project_paths,
            rust_runtime_target: APPROVED_FULL_RUST_DIRECTION.to_string(),
            final_runtime_allows_python: false,
            cuda_backend_candidates,
            blockers,
        }
    }
}

fn path_note(label: &str, value: &str) -> String {
    let exists = Path::new(value).exists();
    format!("{label} path: {value} | exists={exists}")
}
