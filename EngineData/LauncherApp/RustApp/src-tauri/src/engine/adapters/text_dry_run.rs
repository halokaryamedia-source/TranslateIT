use serde::Serialize;

use crate::engine::inference::backend_validation::NativeCudaBackendValidationReport;

#[derive(Debug, Clone, Serialize)]
pub struct TextDryRunRequest {
    pub source_text: String,
    pub source_language: String,
    pub target_language: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct TextDryRunResult {
    pub ok: bool,
    pub output_preview: Option<String>,
    pub backend_validation: NativeCudaBackendValidationReport,
    pub message: String,
}

pub fn run_text_dry_check(request: TextDryRunRequest) -> TextDryRunResult {
    let backend_validation = NativeCudaBackendValidationReport::validate_ctranslate2_cuda_candidate();
    TextDryRunResult {
        ok: false,
        output_preview: None,
        backend_validation,
        message: format!(
            "Text dry check accepted length={} language_pair={}->{}. Native text adapter remains pending.",
            request.source_text.chars().count(), request.source_language, request.target_language
        ),
    }
}
