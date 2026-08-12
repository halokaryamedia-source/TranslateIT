use crate::engine::audio::live_capture::{start_live_capture_runtime, stop_live_capture_runtime};
use crate::engine::runtime_state::{
    begin_direct_live_capture_session, clear_runtime_session_state, latest_runtime_session_state,
};
use crate::engine::state::{CommandResult, LifecycleState};

const MIC_TEST_CAPTURE_OWNER_ID: &str = "translateit_rust_live_capture";

pub fn start_capture() -> CommandResult {
    let session = begin_direct_live_capture_session();
    let Some(snapshot) = session.snapshot.as_ref() else {
        return CommandResult::blocked(
            LifecycleState::Error,
            "Microphone test cannot verify runtime ownership right now. No capture resource was opened.",
        );
    };
    if !session.blocker.is_empty() || snapshot.owner_id != MIC_TEST_CAPTURE_OWNER_ID {
        return CommandResult::blocked(
            LifecycleState::ConversionPending,
            "Microphone test cannot start while Meeting or another capture session owns runtime resources.",
        );
    }

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
    let current = latest_runtime_session_state();
    if current.has_active_session && current.snapshot.is_none() {
        return CommandResult::blocked(
            LifecycleState::Error,
            "Microphone test cannot verify runtime ownership right now. Capture state was left unchanged.",
        );
    }
    if let Some(snapshot) = current.snapshot.as_ref() {
        if snapshot.owner_id != MIC_TEST_CAPTURE_OWNER_ID {
            return CommandResult::blocked(
                LifecycleState::ConversionPending,
                "Microphone test Stop cannot control an active Meeting session. Stop Translation from the Meeting workspace instead.",
            );
        }
    }

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
