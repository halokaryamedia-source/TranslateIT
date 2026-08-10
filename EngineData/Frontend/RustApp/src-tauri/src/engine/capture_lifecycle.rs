use std::fs;
use std::path::{Path, PathBuf};

use crate::engine::adapters::runtime_lifecycle_logic::analyze_start_lifecycle_gate;
use crate::engine::audio::live_capture::{start_live_capture_runtime, stop_live_capture_runtime};
use crate::engine::audio::live_segment_writer::{
    write_latest_live_target_segment_wav, LiveSegmentWavWriteReport,
};
use crate::engine::logging::{write_jsonl_event, RuntimeLogEvent};
use crate::engine::paths::ProjectPaths;
use crate::engine::runtime_state::{
    clear_runtime_handoff_state, clear_runtime_session_state, record_direct_live_capture_session,
    record_runtime_session_start,
};
use crate::engine::state::{CommandResult, LifecycleState};

fn safe_file_label(value: &str) -> String {
    Path::new(value)
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.trim().is_empty())
        .unwrap_or("redacted")
        .to_string()
}

fn remove_private_cache_file(value: &str) {
    if value.trim().is_empty() {
        return;
    }
    let project_paths = ProjectPaths::discover();
    let cache_root = PathBuf::from(project_paths.user_cache_dir);
    let path = PathBuf::from(value);
    let Ok(resolved_path) = path.canonicalize() else {
        return;
    };
    let Ok(resolved_cache_root) = cache_root.canonicalize() else {
        return;
    };
    if resolved_path.is_file() && resolved_path.starts_with(&resolved_cache_root) {
        let _ = fs::remove_file(resolved_path);
    }
}

fn clear_legacy_audio_pipeline_evidence(user_log_dir: &str) {
    let legacy_evidence = PathBuf::from(user_log_dir)
        .join("RustAppValidation")
        .join("latest_audio_pipeline_evidence.json");
    let _ = fs::remove_file(legacy_evidence);
}

fn user_facing_segment_note(segment_write: &LiveSegmentWavWriteReport) -> String {
    if segment_write.ok {
        return format!(
            "Audio captured successfully: {}ms prepared for capture diagnostics.",
            segment_write.duration_ms
        );
    }
    if segment_write.blocker.contains("segment_too_short") {
        return "Recording was too short. Hold the microphone for at least one second and speak clearly.".to_string();
    }
    if segment_write.blocker.contains("vad_rejected")
        || segment_write.blocker.contains("low_energy")
        || segment_write.blocker.contains("low_peak")
    {
        return "No clear speech was detected. Try speaking closer to the microphone or increase input volume.".to_string();
    }
    if segment_write.blocker.contains("not_enough_audio") {
        return "Not enough audio was captured yet. Try recording a longer sentence.".to_string();
    }
    "Audio capture ended, but the diagnostic segment was not usable.".to_string()
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
        &PathBuf::from(&project_paths.user_log_dir),
        "rust_runtime_latest.jsonl",
        &RuntimeLogEvent::info("live_capture", live_note.clone()),
    );

    if live_capture.ok {
        let mode_note = if gate.allowed {
            "Capture lifecycle preflight passed."
        } else {
            "Direct microphone-only capture was used because the inherited handoff snapshot is not current."
        };
        CommandResult::ok(
            LifecycleState::Listening,
            format!(
                "{message}. {mode_note} {session_note}. {live_note}. This legacy capture path does not start ASR, translation, or TTS; product AI execution belongs to the canonical Meeting/helper runtime."
            ),
        )
    } else {
        let cleared_session = clear_runtime_session_state();
        CommandResult::blocked(
            LifecycleState::Error,
            format!(
                "{message}. {session_note}. {live_note}. {}",
                cleared_session.note
            ),
        )
    }
}

pub fn stop_capture() -> CommandResult {
    let project_paths = ProjectPaths::discover();
    let segment_write = write_latest_live_target_segment_wav();
    let user_segment_note = user_facing_segment_note(&segment_write);
    let segment_path = segment_write.audio_path.clone();
    let segment_note = if segment_write.ok {
        format!(
            "Diagnostic WAV prepared temporarily: file={}, duration_ms={}, samples={}",
            segment_write
                .audio_path
                .as_deref()
                .map(safe_file_label)
                .unwrap_or_else(|| "redacted".to_string()),
            segment_write.duration_ms,
            segment_write.sample_count
        )
    } else {
        format!(
            "Diagnostic WAV not prepared: blocker={}, note={}",
            segment_write.blocker, segment_write.note
        )
    };

    let stopped_live_capture = stop_live_capture_runtime();
    let cleared_session = clear_runtime_session_state();
    let cleared_handoff = clear_runtime_handoff_state();

    if let Some(audio_path) = segment_path.as_deref() {
        remove_private_cache_file(audio_path);
    }
    clear_legacy_audio_pipeline_evidence(&project_paths.user_log_dir);

    let pipeline_note = "No ASR, translation, TTS, playback, alternate worker, or cross-mode fallback was started from legacy capture. Canonical product AI execution is owned by the persistent helper/Meeting session path.";
    let message = format!(
        "{user_segment_note} {segment_note}. {pipeline_note} Live capture: {} {} {}",
        stopped_live_capture.message, cleared_session.note, cleared_handoff.note
    );
    let _ = write_jsonl_event(
        &PathBuf::from(&project_paths.user_log_dir),
        "rust_runtime_latest.jsonl",
        &RuntimeLogEvent::info("stop_gate", message.clone()),
    );
    CommandResult::ok(LifecycleState::Stopped, message)
}
