use crate::engine::audio::live_capture::{start_live_capture_runtime, stop_live_capture_runtime};
use crate::engine::runtime_state::{
    clear_runtime_session_state, latest_runtime_session_state, record_direct_live_capture_session,
};
use crate::engine::state::{CommandResult, LifecycleState};

pub fn start_capture() -> CommandResult {
    let current = latest_runtime_session_state();
    if current.has_active_session {
        return CommandResult::blocked(
            LifecycleState::ConversionPending,
            "Microphone test cannot start while Meeting or another capture session owns the microphone.",
        );
    }

    let session = record_direct_live_capture_session();
    let capture = start_live_capture_runtime(session);
    if capture.ok {
        CommandResult::ok(
            LifecycleState::Listening,
            "Microphone test recording started. This capture-only path does not run ASR, translation, or TTS.",
        )
    } else {
        let _ = clear_runtime_session_state();
        CommandResult::blocked(LifecycleState::Error, capture.message)
    }
}

pub fn stop_capture() -> CommandResult {
    let capture = stop_live_capture_runtime();
    let _ = clear_runtime_session_state();
    if capture.ok {
        CommandResult::ok(
            LifecycleState::Stopped,
            "Microphone test recording stopped and microphone ownership was released.",
        )
    } else {
        CommandResult::blocked(LifecycleState::Error, capture.message)
    }
}
