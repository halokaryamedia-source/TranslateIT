use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;

use serde_json::{json, Value};

use crate::engine::adapters::runtime_lifecycle_logic::analyze_start_lifecycle_gate;
use crate::engine::audio::live_capture::{start_live_capture_runtime, stop_live_capture_runtime};
use crate::engine::audio::live_segment_writer::write_latest_live_target_segment_wav;
use crate::engine::logging::{write_jsonl_event, RuntimeLogEvent};
use crate::engine::paths::ProjectPaths;
use crate::engine::playback::play_wav_output;
use crate::engine::runtime_settings::load_settings;
use crate::engine::runtime_state::{clear_runtime_handoff_state, clear_runtime_session_state, record_direct_live_capture_session, record_runtime_session_start};
use crate::engine::state::{CommandResult, LifecycleState};

fn local_worker_script_path() -> PathBuf {
    let project_paths = ProjectPaths::discover();
    PathBuf::from(project_paths.project_root)
        .join("EngineData")
        .join("Backend")
        .join("LocalWorker")
        .join("WorkerRuntime")
        .join("realtime_local_worker.py")
}

fn run_worker_with_python(binary: &str, use_python_launcher: bool, script: &Path, payload: Value) -> Option<Value> {
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
        writeln!(stdin, "{payload}").ok()?;
    }

    let output = child.wait_with_output().ok()?;
    if !output.status.success() {
        return None;
    }
    serde_json::from_slice::<Value>(&output.stdout).ok()
}

fn run_worker(payload: Value) -> Option<Value> {
    let script = local_worker_script_path();
    if !script.is_file() {
        return None;
    }
    run_worker_with_python("python", false, &script, payload.clone())
        .or_else(|| run_worker_with_python("py", true, &script, payload))
}

fn json_ok(value: &Option<Value>) -> bool {
    value
        .as_ref()
        .and_then(|payload| payload.get("ok"))
        .and_then(Value::as_bool)
        .unwrap_or(false)
}

fn json_string(value: &Option<Value>, key: &str) -> String {
    value
        .as_ref()
        .and_then(|payload| payload.get(key))
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim()
        .to_string()
}

fn write_audio_pipeline_evidence(user_log_dir: &str, evidence: &Value) {
    let evidence_dir = PathBuf::from(user_log_dir).join("RustAppValidation");
    let _ = fs::create_dir_all(&evidence_dir);
    let evidence_path = evidence_dir.join("latest_audio_pipeline_evidence.json");
    if let Ok(text) = serde_json::to_string_pretty(evidence) {
        let _ = fs::write(evidence_path, text);
    }
}

fn run_audio_translation_with_fallback(
    transcript_text: &str,
    source_language: &str,
    target_language: &str,
    primary_mode: &str,
) -> (Option<Value>, String, bool) {
    let fallback_mode = if primary_mode.eq_ignore_ascii_case("Quality") {
        "Realtime"
    } else {
        "Quality"
    };
    let primary = run_worker(json!({
        "command": "translate",
        "text": transcript_text,
        "source_language": source_language,
        "target_language": target_language,
        "mode": primary_mode,
        "max_new_tokens": 96
    }));
    if json_ok(&primary) && !json_string(&primary, "translated_text").is_empty() {
        return (primary, primary_mode.to_string(), false);
    }
    let fallback = run_worker(json!({
        "command": "translate",
        "text": transcript_text,
        "source_language": source_language,
        "target_language": target_language,
        "mode": fallback_mode,
        "max_new_tokens": 96
    }));
    if json_ok(&fallback) && !json_string(&fallback, "translated_text").is_empty() {
        return (fallback, fallback_mode.to_string(), true);
    }
    (primary.or(fallback), primary_mode.to_string(), false)
}

fn start_audio_pipeline_worker(audio_path: String, user_log_dir: String) {
    thread::spawn(move || {
        let settings = load_settings();
        let auto_play_output = settings.audio.auto_play_out_voice || settings.audio.auto_play_translation_voice;
        let source_language = settings.source_language;
        let target_language = settings.target_language;
        let mode = if settings.runtime_profile.eq_ignore_ascii_case("Quality") {
            "Quality"
        } else {
            "Realtime"
        };

        let transcribe = run_worker(json!({
            "command": "transcribe",
            "audio_path": audio_path.clone(),
            "language": source_language.clone(),
            "beam_size": 1,
            "vad_filter": true
        }));
        let transcript_text = json_string(&transcribe, "transcript_text");

        let (translate, translation_mode_used, translation_fallback_used) = if json_ok(&transcribe) && !transcript_text.is_empty() {
            run_audio_translation_with_fallback(&transcript_text, &source_language, &target_language, mode)
        } else {
            (None, mode.to_string(), false)
        };
        let translated_text = json_string(&translate, "translated_text");

        let synthesize = if json_ok(&translate) && !translated_text.is_empty() {
            run_worker(json!({
                "command": "synthesize",
                "text": translated_text.clone()
            }))
        } else {
            None
        };
        let tts_output_path = json_string(&synthesize, "output_path");
        let playback_ok = if auto_play_output && json_ok(&synthesize) && !tts_output_path.is_empty() {
            play_wav_output(&tts_output_path)
        } else {
            false
        };

        let ok = json_ok(&transcribe) && json_ok(&translate) && json_ok(&synthesize);
        let evidence = json!({
            "schema": "translateit.audio_pipeline_evidence.v3",
            "ok": ok,
            "stage": "audio_pipeline_stop_capture_worker",
            "audio_path": audio_path,
            "worker_path": local_worker_script_path(),
            "source_language": source_language,
            "target_language": target_language,
            "requested_mode": mode,
            "translation_mode_used": translation_mode_used,
            "translation_fallback_used": translation_fallback_used,
            "transcribe_ok": json_ok(&transcribe),
            "translate_ok": json_ok(&translate),
            "synthesize_ok": json_ok(&synthesize),
            "auto_play_output": auto_play_output,
            "tts_output_path": tts_output_path,
            "playback_ok": playback_ok,
            "transcript_text": transcript_text,
            "translated_text": translated_text,
            "transcribe": transcribe,
            "translate": translate,
            "synthesize": synthesize
        });
        write_audio_pipeline_evidence(&user_log_dir, &evidence);
        let _ = write_jsonl_event(
            &PathBuf::from(user_log_dir),
            "rust_runtime_latest.jsonl",
            &RuntimeLogEvent::info("audio_pipeline", evidence.to_string()),
        );
    });
}

pub fn start_capture() -> CommandResult {
    let project_paths = ProjectPaths::discover();
    let gate = analyze_start_lifecycle_gate();
    let handoff_state = &gate.handoff_state;
    let message = if let Some(snapshot) = &handoff_state.snapshot {
        format!(
            "Rust Start gate checked lifecycle preflight: allowed={}, lifecycle_state={}, session_id={}, owner_id={}, age_ms={}, stale={}, blocker={}, note={}",
            gate.allowed,
            gate.lifecycle_state,
            snapshot.session_id,
            snapshot.owner_id,
            handoff_state.snapshot_age_ms.map_or_else(|| "none".to_string(), |age| age.to_string()),
            handoff_state.snapshot_stale,
            gate.blocker,
            gate.note
        )
    } else {
        format!(
            "Rust Start gate checked lifecycle preflight: allowed={}, lifecycle_state={}, blocker={}, note={}",
            gate.allowed, gate.lifecycle_state, gate.blocker, gate.note
        )
    };

    let event = if gate.allowed {
        RuntimeLogEvent::info("start_gate", message.clone())
    } else {
        RuntimeLogEvent::warning("start_gate", message.clone())
    };
    let _ = write_jsonl_event(
        &PathBuf::from(&project_paths.user_log_dir),
        "rust_runtime_latest.jsonl",
        &event,
    );

    if gate.session_state.has_active_session {
        return CommandResult::blocked(LifecycleState::ConversionPending, message);
    }

    let session_state = if gate.allowed {
        record_runtime_session_start(handoff_state)
    } else if gate.blocker == "handoff:no_snapshot" || gate.blocker == "handoff:snapshot_stale" {
        record_direct_live_capture_session()
    } else {
        return CommandResult::blocked(LifecycleState::ConversionPending, message);
    };

    let session_note = format!(
        "Runtime session ownership recorded: active={}, ready_for_stop={}, note={}",
        session_state.has_active_session, session_state.ready_for_stop, session_state.note
    );
    let live_capture = start_live_capture_runtime(session_state.clone());
    let live_note = format!(
        "Live capture start result: ok={}, active={}, frames_received={}, note={}",
        live_capture.ok,
        live_capture.status.stream_active,
        live_capture.status.frames_received,
        live_capture.status.note
    );
    let _ = write_jsonl_event(
        &PathBuf::from(&project_paths.user_log_dir),
        "rust_runtime_latest.jsonl",
        &RuntimeLogEvent::info("runtime_session", session_note.clone()),
    );
    let _ = write_jsonl_event(
        &PathBuf::from(project_paths.user_log_dir),
        "rust_runtime_latest.jsonl",
        &RuntimeLogEvent::info("live_capture", live_note.clone()),
    );

    if live_capture.ok {
        let mode_note = if gate.allowed {
            "Full realtime handoff session was used."
        } else {
            "Direct microphone-only session was used because full realtime handoff is not ready yet."
        };
        CommandResult::ok(
            LifecycleState::Listening,
            format!("{message}. {mode_note} {session_note}. {live_note}. ASR, translation, and TTS are still pending stages."),
        )
    } else {
        let cleared_session = clear_runtime_session_state();
        CommandResult::blocked(
            LifecycleState::Error,
            format!("{message}. {session_note}. {live_note}. {}", cleared_session.note),
        )
    }
}

pub fn stop_capture() -> CommandResult {
    let project_paths = ProjectPaths::discover();
    let segment_write = write_latest_live_target_segment_wav();
    let segment_note = if segment_write.ok {
        format!(
            "Target ASR WAV prepared: path={}, duration_ms={}, samples={}",
            segment_write.audio_path.clone().unwrap_or_else(|| "none".to_string()),
            segment_write.duration_ms,
            segment_write.sample_count
        )
    } else {
        format!(
            "Target ASR WAV not prepared: blocker={}, note={}",
            segment_write.blocker, segment_write.note
        )
    };
    let pipeline_note = if segment_write.ok {
        if let Some(audio_path) = segment_write.audio_path.clone() {
            start_audio_pipeline_worker(audio_path, project_paths.user_log_dir.clone());
            format!("Audio pipeline worker handoff started in background for ASR > Translate > TTS via {}.", local_worker_script_path().display())
        } else {
            "Audio pipeline worker handoff skipped because the WAV path was missing.".to_string()
        }
    } else {
        "Audio pipeline worker handoff skipped because the target WAV was not prepared.".to_string()
    };
    let stopped_live_capture = stop_live_capture_runtime();
    let cleared_session = clear_runtime_session_state();
    let cleared_handoff = clear_runtime_handoff_state();
    let message = format!(
        "Stop was received by Rust runtime. {segment_note}. {pipeline_note} Live capture: {} {} {}",
        stopped_live_capture.message, cleared_session.note, cleared_handoff.note
    );
    let _ = write_jsonl_event(
        &PathBuf::from(project_paths.user_log_dir),
        "rust_runtime_latest.jsonl",
        &RuntimeLogEvent::info("stop_gate", message.clone()),
    );
    CommandResult::ok(LifecycleState::Stopped, message)
}
