use serde::Deserialize;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::Instant;

use crate::engine::paths::ProjectPaths;
use crate::engine::runtime_settings::load_settings;
use crate::engine::state::{CommandResult, LifecycleState};

const MAX_INPUT_CHARS: usize = 2_000;
const WORKER_TIMEOUT_SECS: u64 = 120;

#[derive(Debug, Deserialize)]
struct WorkerTranslationResponse {
    ok: bool,
    mode: Option<String>,
    model_id: Option<String>,
    device: Option<String>,
    compute_type: Option<String>,
    device_note: Option<String>,
    translated_text: Option<String>,
    blocker: Option<String>,
    direction_pair: Option<String>,
    direction_supported: Option<bool>,
    elapsed_ms: Option<i64>,
}

fn clean_input(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|character| *character != '\0' && !character.is_control())
        .collect::<String>()
}

fn worker_root() -> PathBuf {
    PathBuf::from(ProjectPaths::discover().project_root)
        .join("EngineData")
        .join("Backend")
        .join("LocalWorker")
        .join("WorkerRuntime")
}

fn worker_script() -> PathBuf {
    let root = worker_root();
    let accelerated = root.join("realtime_local_worker_accelerated.py");
    if accelerated.is_file() {
        return accelerated;
    }
    root.join("realtime_local_worker.py")
}

fn run_python(binary: &str, use_launcher: bool, payload: &serde_json::Value) -> Option<WorkerTranslationResponse> {
    let script = worker_script();
    if !script.is_file() {
        return None;
    }
    let mut command = Command::new(binary);
    if use_launcher {
        command.arg("-3");
    }
    let mut child = command
        .arg(script)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .ok()?;
    if let Some(stdin) = child.stdin.as_mut() {
        writeln!(stdin, "{payload}").ok()?;
    }
    let started = Instant::now();
    loop {
        if started.elapsed().as_secs() > WORKER_TIMEOUT_SECS {
            let _ = child.kill();
            let _ = child.wait();
            return None;
        }
        match child.try_wait().ok()? {
            Some(status) => {
                if !status.success() {
                    return None;
                }
                let output = child.wait_with_output().ok()?;
                return serde_json::from_slice::<WorkerTranslationResponse>(&output.stdout).ok();
            }
            None => std::thread::sleep(std::time::Duration::from_millis(25)),
        }
    }
}

fn translate_with_worker(text: &str) -> Option<WorkerTranslationResponse> {
    let settings = load_settings();
    let payload = serde_json::json!({
        "command": "translate",
        "text": text,
        "source_language": settings.source_language,
        "target_language": settings.target_language,
        "mode": settings.runtime_profile,
        "max_new_tokens": 96,
    });
    run_python("python", false, &payload).or_else(|| run_python("py", true, &payload))
}

fn compact(value: Option<String>) -> String {
    value.unwrap_or_default().trim().chars().take(120).collect()
}

fn success_suffix(worker: &WorkerTranslationResponse) -> String {
    let mode = compact(worker.mode.clone());
    let model = compact(worker.model_id.clone());
    let device = compact(worker.device.clone());
    let compute = compact(worker.compute_type.clone());
    let note = compact(worker.device_note.clone());
    let pair = compact(worker.direction_pair.clone());
    let supported = match worker.direction_supported {
        Some(true) => "direction supported",
        Some(false) => "direction fallback required",
        None => "direction unknown",
    };
    let elapsed = worker.elapsed_ms.map(|value| format!("{value}ms")).unwrap_or_default();
    [mode, model, device, compute, note, pair, supported.to_string(), elapsed]
        .into_iter()
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>()
        .join(" / ")
}

pub fn translate_text(source: String) -> CommandResult {
    let text = clean_input(&source);
    if text.is_empty() {
        return CommandResult::blocked(LifecycleState::EmptyInput, "No source text provided.");
    }
    if text.chars().count() > MAX_INPUT_CHARS {
        return CommandResult::blocked(
            LifecycleState::TranslationAdapterPending,
            format!("Input is too long. Limit: {MAX_INPUT_CHARS} characters."),
        );
    }
    if let Some(worker) = translate_with_worker(&text) {
        let translated = worker.translated_text.as_deref().unwrap_or_default().trim();
        if worker.ok && !translated.is_empty() {
            return CommandResult::ok(
                LifecycleState::Idle,
                format!("{}\n\n(local worker: {})", translated, success_suffix(&worker)),
            );
        }
        return CommandResult::blocked(
            LifecycleState::TranslationAdapterPending,
            format!(
                "Local worker returned no validated translation. blocker={}; device={}; model={}",
                compact(worker.blocker),
                compact(worker.device),
                compact(worker.model_id),
            ),
        );
    }
    super::manual_translation::translate_text(source)
}
