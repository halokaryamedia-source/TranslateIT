#[derive(Debug, Clone)]
pub struct CudaPolicyReport {
    pub status_label: &'static str,
    pub operator_note: String,
}

impl CudaPolicyReport {
    pub fn strict_pending() -> Self {
        Self {
            status_label: "cuda-required-native-validation-pending",
            operator_note: "CUDA policy is strict: native Rust adapters must prove CUDA readiness before ASR or translation can report Ready.".to_string(),
        }
    }
}

#[derive(Debug, Clone)]
pub enum CudaBackendStrategy {
    NativeCTranslate2Ffi,
    NativeOnnxRuntimeCuda,
    NativeTensorRtAdapter,
}

impl CudaBackendStrategy {
    pub fn risk_note(&self) -> &'static str {
        match self {
            Self::NativeCTranslate2Ffi => "Best parity candidate for Faster-Whisper, NLLB, and Marian references, but requires native library packaging and ABI control.",
            Self::NativeOnnxRuntimeCuda => "Good native CUDA provider candidate, but requires correct model export and CUDA/cuDNN DLL compatibility.",
            Self::NativeTensorRtAdapter => "Potentially fastest after optimization, but highest conversion complexity and strongest model-shape constraints.",
        }
    }
}

pub const APPROVED_FULL_RUST_DIRECTION: &str = "Rust owns app lifecycle, configuration, state, UI command bridge, data flow, logging, and adapter boundaries. CUDA inference may call native CUDA-capable libraries through Rust FFI, but final runtime must not require Python.";
