pub mod asr;
pub mod asr_dry_run;
pub mod text_dry_run;
pub mod translation;
pub mod tts;

pub const ADAPTER_RULE: &str = "Adapters must expose truthful readiness, visible fallback, and deterministic error reporting. They must not silently call Python in the final full-Rust runtime.";
