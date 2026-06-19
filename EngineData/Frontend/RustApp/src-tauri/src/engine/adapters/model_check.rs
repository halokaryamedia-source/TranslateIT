use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelCheckRequest {
    pub model_id: String,
    pub model_path: Option<String>,
    pub expected_device: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ModelCheckResult {
    pub ok: bool,
    pub model_id: String,
    pub expected_device: String,
    pub message: String,
}

pub fn check_model_request(request: ModelCheckRequest) -> ModelCheckResult {
    let has_path = request
        .model_path
        .as_ref()
        .map(|value| !value.trim().is_empty())
        .unwrap_or(false);

    ModelCheckResult {
        ok: false,
        model_id: request.model_id,
        expected_device: request.expected_device,
        message: if has_path {
            "Model path received. Real load check is still pending.".to_string()
        } else {
            "Model path is missing. Real load check is still pending.".to_string()
        },
    }
}
