use serde::{Deserialize, Serialize};

use crate::engine::inference::backend_validation::NativeCudaBackendValidationReport;

const MAX_ASR_LABEL_CHARS: usize = 120;
const MIN_ASR_SAMPLE_RATE_HZ: u32 = 8_000;
const MAX_ASR_SAMPLE_RATE_HZ: u32 = 192_000;

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
    let backend_validation =
        NativeCudaBackendValidationReport::validate_ctranslate2_cuda_candidate();
    let language_hint = safe_label(&request.language_hint, "unknown");
    let source_label = request
        .source_label
        .as_deref()
        .map(|value| safe_label(value, "source"))
        .unwrap_or_else(|| "source".to_string());
    let sample_rate = request
        .expected_sample_rate_hz
        .clamp(MIN_ASR_SAMPLE_RATE_HZ, MAX_ASR_SAMPLE_RATE_HZ);
    AsrDryRunResult {
        ok: false,
        text_preview: None,
        backend_validation,
        message: format!(
            "ASR dry check accepted metadata only. language={} sample_rate={} source={}. Native model loading remains pending.",
            language_hint, sample_rate, source_label
        ),
    }
}

fn safe_label(value: &str, fallback: &str) -> String {
    let clean = value
        .trim()
        .chars()
        .filter(|character| !character.is_control())
        .take(MAX_ASR_LABEL_CHARS)
        .collect::<String>()
        .trim()
        .to_string();
    if clean.is_empty() {
        fallback.to_string()
    } else {
        clean
    }
}
