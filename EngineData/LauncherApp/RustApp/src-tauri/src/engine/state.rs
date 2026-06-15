use serde::Serialize;

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum RuntimeStage {
    RustContractBaseline,
    AudioPending,
    AsrPending,
    TranslationPending,
    TtsPending,
    Ready,
    Error,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum LifecycleState {
    Idle,
    Preparing,
    Ready,
    Listening,
    Transcribing,
    Translating,
    Speaking,
    Stopped,
    Error,
    ConversionPending,
    EmptyInput,
    TranslationAdapterPending,
}

impl LifecycleState {
    pub fn as_label(self) -> &'static str {
        match self {
            Self::Idle => "idle",
            Self::Preparing => "preparing",
            Self::Ready => "ready",
            Self::Listening => "listening",
            Self::Transcribing => "transcribing",
            Self::Translating => "translating",
            Self::Speaking => "speaking",
            Self::Stopped => "stopped",
            Self::Error => "error",
            Self::ConversionPending => "conversion_pending",
            Self::EmptyInput => "empty_input",
            Self::TranslationAdapterPending => "translation_adapter_pending",
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct EngineStatus {
    pub app_version: &'static str,
    pub runtime_stage: RuntimeStage,
    pub lifecycle_state: LifecycleState,
    pub cuda_policy: &'static str,
    pub asr_engine: &'static str,
    pub translation_engine: &'static str,
    pub tts_engine: &'static str,
    pub notes: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct CommandResult {
    pub ok: bool,
    pub state: &'static str,
    pub message: String,
}

impl CommandResult {
    pub fn ok(state: LifecycleState, message: impl Into<String>) -> Self {
        Self {
            ok: true,
            state: state.as_label(),
            message: message.into(),
        }
    }

    pub fn blocked(state: LifecycleState, message: impl Into<String>) -> Self {
        Self {
            ok: false,
            state: state.as_label(),
            message: message.into(),
        }
    }
}
