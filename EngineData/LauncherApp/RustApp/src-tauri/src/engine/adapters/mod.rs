pub mod asr;
pub mod asr_dry_run;
pub mod language_logic;
pub mod latency_logic;
pub mod model_check;
pub mod output_dry_run;
pub mod session_logic;
pub mod text_dry_run;
pub mod translation;
pub mod tts;

pub const ADAPTER_RULE: &str = "Adapters must expose truthful readiness and deterministic error reporting.";
