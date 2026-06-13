use serde::{Deserialize, Serialize};

use crate::engine::inference::backend_validation::NativeCudaBackendValidationReport;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AsrDryRunRequest {
    pub source_label: Option<String>,
    pub language_hint: String,
    pub expected_sample_rate_hz: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct AsrDryRunResult {
    pub ok: bool,
    pub text_preview: Option<String>,
    pub backend_validation: NativeCudaBackendValidationReport,
    pub message: String,
}

pub fn run_asr_dry_check(request: AsrDryRunRequest) -> AsrDryRunResult {
    let backend_validation = NativeCudaBackendValidationReport::validate_ctranslate2_cuda_candidate();
    AsrDryRunResult {
        ok: false,
        text_preview: None,
        backend_validation,
        message: format!(
            "ASR dry check accepted metadata only. language={} sample_rate={} source={:?}. Native model loading remains pending.",
            request.language_hint, request.expected_sample_rate_hz, request.source_label
        ),
    }
}
