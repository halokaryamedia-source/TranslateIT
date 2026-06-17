use serde::Deserialize;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

use crate::engine::adapters::translation_logic::{run_translation_logic, TranslationLogicRequest};
use crate::engine::paths::ProjectPaths;
use crate::engine::runtime_settings::load_settings;
use crate::engine::state::{CommandResult, LifecycleState};

const MAX_MANUAL_TRANSLATION_CHARS: usize = 2_000;
const WORKER_TRANSLATION_TIMEOUT_NOTE: &str = "worker_bridge_unavailable";
const WORKER_BRIDGE_TIMEOUT_SECS: u64 = 120;
const WORKER_POLL_INTERVAL_MS: u64 = 25;
const MAX_WORKER_STDOUT_BYTES: usize = 2 * 1024 * 1024;

#[derive(Debug, Deserialize)]
struct WorkerTranslationResponse {
    ok: bool,
    stage: Option<String>,
    mode: Option<String>,
    model_id: Option<String>,
    device: Option<String>,
    translated_text: Option<String>,
    blocker: Option<String>,
    direction_pair: Option<String>,
    direction_supported: Option<bool>,
}

fn normalize_language(value: &str, fallback: &str) -> String {
    let text = value.trim().to_lowercase();
    if text.starts_with("ind") || text == "id" {
        return "id".to_string();
    }
    if text.starts_with("eng") || text == "en" {
        return "en".to_string();
    }
    if text.is_empty() {
        fallback.to_string()
    } else {
        text.chars().take(2).collect()
    }
}

fn realtime_direction_supported(source_language: &str, target_language: &str) -> bool {
    normalize_language(source_language, "id") == "id" && normalize_language(target_language, "en") == "en"
}

fn preferred_profile_order(requested_quality_mode: bool, source_language: &str, target_language: &str) -> Vec<&'static str> {
    let realtime_supported = realtime_direction_supported(source_language, target_language);
    if requested_quality_mode || !realtime_supported {
        if realtime_supported {
            vec!["Quality", "Realtime"]
        } else {
            vec!["Quality"]
        }
    } else {
        vec!["Realtime", "Quality"]
    }
}

fn engine_name_for_profile(profile: &str) -> &'static str {
    if profile.eq_ignore_ascii_case("Quality") {
        "nllb-200-distilled-600M-quality"
    } else {
        "marianmt-id-en"
    }
}

fn local_worker_script_path() -> PathBuf {
    let project_paths = ProjectPaths::discover();
    PathBuf::from(project_paths.project_root)
        .join("EngineData")
        .join("Backend")
        .join("LocalWorker")
        .join("WorkerRuntime")
        .join("realtime_local_worker.py")
}

fn compact_worker_field(value: Option<String>) -> String {
    value
        .unwrap_or_default()
        .chars()
        .filter(|character| character.is_ascii_alphanumeric() || matches!(character, '_' | '-' | ':' | '.' | '>' | ' '))
        .take(120)
        .collect::<String>()
        .trim()
        .to_string()
}

fn worker_note(worker: WorkerTranslationResponse) -> String {
    let stage = compact_worker_field(worker.stage);
    let blocker = compact_worker_field(worker.blocker);
    let pair = compact_worker_field(worker.direction_pair);
    let direction = match worker.direction_supported {
        Some(true) => "direction_supported=true",
        Some(false) => "direction_supported=false",
        None => "direction_supported=unknown",
    };
    let direction_detail = if pair.is_empty() {
        direction.to_string()
    } else {
        format!("pair={pair}; {direction}")
    };
    if blocker.is_empty() {
        format!("worker_stage={stage}; {direction_detail}")
    } else {
        format!("worker_stage={stage}; blocker={blocker}; {direction_detail}")
    }
}

fn worker_success_suffix(worker: &WorkerTranslationResponse, fallback_used: bool) -> String {
    let mode = compact_worker_field(worker.mode.clone());
    let model = compact_worker_field(worker.model_id.clone());
    let device = compact_worker_field(worker.device.clone());
    let pair = compact_worker_field(worker.direction_pair.clone());
    let direction = match worker.direction_supported {
        Some(true) => "direction supported",
        Some(false) => "direction fallback required",
        None => "direction unknown",
    };
    let detail = [mode, model, device]
        .into_iter()
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>()
        .join(" / ");
    let worker_label = if fallback_used { "local worker fallback" } else { "local worker" };
    let direction_detail = if pair.is_empty() {
        direction.to_string()
    } else {
        format!("{pair}; {direction}")
    };
    if detail.is_empty() {
        format!("{worker_label}: {direction_detail}")
    } else {
        format!("{worker_label}: {detail}; {direction_detail}")
    }
}

fn worker_translated_text(worker: &WorkerTranslationResponse) -> Option<&str> {
    let translated = worker.translated_text.as_deref().unwrap_or_default().trim();
    if worker.ok && !translated.is_empty() {
        Some(translated)
    } else {
        None
    }
}

fn read_limited_stdout(child: &mut Child) -> Option<Vec<u8>> {
    let mut stdout = Vec::new();
    if let Some(pipe) = child.stdout.as_mut() {
        let mut limited = pipe.take((MAX_WORKER_STDOUT_BYTES + 1) as u64);
        limited.read_to_end(&mut stdout).ok()?;
    }
    if stdout.len() > MAX_WORKER_STDOUT_BYTES {
        return None;
    }
    Some(stdout)
}

fn wait_for_worker_output(mut child: Child) -> Option<Vec<u8>> {
    let started = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                let stdout = read_limited_stdout(&mut child)?;
                if !status.success() {
                    return None;
                }
                return Some(stdout);
            }
            Ok(None) => {
                if started.elapsed() >= Duration::from_secs(WORKER_BRIDGE_TIMEOUT_SECS) {
                    let _ = child.kill();
                    let _ = child.wait();
                    return None;
                }
                thread::sleep(Duration::from_millis(WORKER_POLL_INTERVAL_MS));
            }
            Err(_) => {
                let _ = child.kill();
                let _ = child.wait();
                return None;
            }
        }
    }
}

fn run_worker_with_python(
    binary: &str,
    use_python_launcher: bool,
    script: &Path,
    source: &str,
    source_language: &str,
    target_language: &str,
    profile: &str,
) -> Option<WorkerTranslationResponse> {
    let payload = serde_json::json!({
        "command": "translate",
        "text": source,
        "source_language": source_language,
        "target_language": target_language,
        "mode": profile,
        "max_new_tokens": 96,
    });

    let mut command = Command::new(binary);
    if use_python_launcher {
        command.arg("-3");
    }
    let mut child = command
        .arg(script)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .ok()?;

    if let Some(mut stdin) = child.stdin.take() {
        if writeln!(stdin, "{payload}").is_err() {
            let _ = child.kill();
            let _ = child.wait();
            return None;
        }
    }

    let stdout = wait_for_worker_output(child)?;
    serde_json::from_slice::<WorkerTranslationResponse>(&stdout).ok()
}

fn run_local_worker_translation(
    source: &str,
    source_language: &str,
    target_language: &str,
    profile: &str,
) -> Option<WorkerTranslationResponse> {
    let script = local_worker_script_path();
    if !script.is_file() {
        return None;
    }
    run_worker_with_python("python", false, &script, source, source_language, target_language, profile)
        .or_else(|| run_worker_with_python("py", true, &script, source, source_language, target_language, profile))
}

pub fn translate_text(source: String) -> CommandResult {
    let trimmed = source.trim();
    if trimmed.is_empty() {
        return CommandResult::blocked(LifecycleState::EmptyInput, "No source text provided.");
    }

    let input_chars = trimmed.chars().count();
    if input_chars > MAX_MANUAL_TRANSLATION_CHARS {
        return CommandResult::blocked(
            LifecycleState::TranslationAdapterPending,
            format!(
                "Input is too long for manual translation preview. Limit: {MAX_MANUAL_TRANSLATION_CHARS} characters. Received: {input_chars} characters."
            ),
        );
    }

    let settings = load_settings();
    let source_language = settings.source_language.clone();
    let target_language = settings.target_language.clone();
    let profile_order = preferred_profile_order(
        settings.runtime_profile.eq_ignore_ascii_case("Quality"),
        &source_language,
        &target_language,
    );
    let profile_label = profile_order.first().copied().unwrap_or("Quality");
    let fallback_profile_label = profile_order.get(1).copied().unwrap_or(profile_label);
    let primary_engine_name = engine_name_for_profile(profile_label);
    let fallback_engine_name = engine_name_for_profile(fallback_profile_label);

    let mut worker_notes = Vec::new();

    for (index, profile) in profile_order.iter().enumerate() {
        if let Some(worker) = run_local_worker_translation(trimmed, &source_language, &target_language, profile) {
            if let Some(translated) = worker_translated_text(&worker) {
                let suffix = worker_success_suffix(&worker, index > 0);
                return CommandResult::ok(
                    LifecycleState::Idle,
                    format!("{}\n\n({suffix})", translated),
                );
            }
            let label = if index == 0 { "primary" } else { "fallback" };
            worker_notes.push(format!("{label}_{profile}: {}", worker_note(worker)));
        }
    }

    let result = run_translation_logic(TranslationLogicRequest {
        segment_id: "manual_text_input".to_string(),
        source_text: trimmed.to_string(),
        source_language,
        target_language,
        detected_language: None,
        context_window: Vec::new(),
        backend_ready: false,
        primary_engine_name: Some(primary_engine_name.to_string()),
        fallback_engine_name: Some(fallback_engine_name.to_string()),
    });

    if !result.translated_text.trim().is_empty() && result.status == "Completed" {
        return CommandResult::ok(
            LifecycleState::Idle,
            format!("{}", result.translated_text.trim()),
        );
    }

    let worker_note = if worker_notes.is_empty() {
        WORKER_TRANSLATION_TIMEOUT_NOTE.to_string()
    } else {
        worker_notes.join(" | ")
    };
    let attempted_profiles = profile_order.join(" then ");

    CommandResult::blocked(
        LifecycleState::TranslationAdapterPending,
        format!(
            "Local translation worker attempted {attempted_profiles}, but no validated model output was returned. {worker_note}. Source text is omitted from this diagnostic for privacy. Planner status: {} / {}",
            result.status, result.mode
        ),
    )
}
