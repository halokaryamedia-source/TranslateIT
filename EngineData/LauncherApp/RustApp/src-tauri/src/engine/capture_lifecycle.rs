use std::path::PathBuf;

use crate::engine::adapters::runtime_lifecycle_logic::analyze_start_lifecycle_gate;
use crate::engine::audio::live_capture::{start_live_capture_runtime, stop_live_capture_runtime};
use crate::engine::audio::live_segment_writer::write_latest_live_target_segment_wav;
use crate::engine::logging::{write_jsonl_event, RuntimeLogEvent};
use crate::engine::paths::ProjectPaths;
use crate::engine::runtime_state::{clear_runtime_handoff_state, clear_runtime_session_state, record_direct_live_capture_session, record_runtime_session_start};
use crate::engine::state::{CommandResult, LifecycleState};

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
    let stopped_live_capture = stop_live_capture_runtime();
    let cleared_session = clear_runtime_session_state();
    let cleared_handoff = clear_runtime_handoff_state();
    let message = format!(
        "Stop was received by Rust runtime. {segment_note}. Live capture: {} {} {}",
        stopped_live_capture.message, cleared_session.note, cleared_handoff.note
    );
    let _ = write_jsonl_event(
        &PathBuf::from(project_paths.user_log_dir),
        "rust_runtime_latest.jsonl",
        &RuntimeLogEvent::info("stop_gate", message.clone()),
    );
    CommandResult::ok(LifecycleState::Stopped, message)
}
