use serde::Serialize;

#[derive(Debug, Serialize)]
struct EngineStatus {
    app_version: &'static str,
    runtime_stage: &'static str,
    lifecycle_state: &'static str,
    cuda_policy: &'static str,
    asr_engine: &'static str,
    translation_engine: &'static str,
    tts_engine: &'static str,
    notes: Vec<&'static str>,
}

#[derive(Debug, Serialize)]
struct CommandResult {
    ok: bool,
    state: &'static str,
    message: String,
}

#[tauri::command]
fn get_engine_status() -> EngineStatus {
    EngineStatus {
        app_version: "0.6.0-rust-tauri-conversion",
        runtime_stage: "scaffold",
        lifecycle_state: "idle",
        cuda_policy: "preserve-cuda-first-policy",
        asr_engine: "pending-rust-adapter-for-faster-whisper-parity",
        translation_engine: "pending-rust-adapter-for-local-nllb-and-marian-parity",
        tts_engine: "pending-rust-adapter-for-local-output-and-custom-voice-parity",
        notes: vec![
            "Tauri command bridge is available.",
            "Existing Python engine remains the behavior reference until Rust parity is proven.",
            "This scaffold intentionally avoids false Ready status for ASR, translation, TTS, and CUDA.",
            "Final runtime testing is reserved for the end of the conversion milestone.",
        ],
    }
}

#[tauri::command]
fn start_capture() -> CommandResult {
    CommandResult {
        ok: false,
        state: "conversion_pending",
        message: "Start was received by the Rust bridge, but microphone capture is not converted yet.".to_string(),
    }
}

#[tauri::command]
fn stop_capture() -> CommandResult {
    CommandResult {
        ok: true,
        state: "stopped",
        message: "Stop was received by the Rust bridge. No Rust capture worker is active in the scaffold.".to_string(),
    }
}

#[tauri::command]
fn translate_text(source: String) -> CommandResult {
    if source.trim().is_empty() {
        return CommandResult {
            ok: false,
            state: "empty_input",
            message: "No source text provided.".to_string(),
        };
    }

    CommandResult {
        ok: false,
        state: "translation_adapter_pending",
        message: format!(
            "Rust translation adapter is not connected yet. Source was received safely: {}",
            source.trim()
        ),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_engine_status,
            start_capture,
            stop_capture,
            translate_text,
        ])
        .run(tauri::generate_context!())
        .expect("error while running TranslateIT RustApp");
}
