use serde::Serialize;

use crate::engine::runtime_state::{
    latest_runtime_handoff_state, latest_runtime_session_state, RuntimeHandoffStateReport,
    RuntimeSessionStateReport,
};

const MAX_LIFECYCLE_GATE_TEXT_CHARS: usize = 260;

#[derive(Debug, Clone, Serialize)]
pub struct RuntimeLifecycleGateReport {
    pub action: String,
    pub allowed: bool,
    pub lifecycle_state: String,
    pub handoff_state: RuntimeHandoffStateReport,
    pub session_state: RuntimeSessionStateReport,
    pub blocker: String,
    pub note: String,
}

pub fn analyze_start_lifecycle_gate() -> RuntimeLifecycleGateReport {
    let handoff_state = latest_runtime_handoff_state();
    let session_state = latest_runtime_session_state();
    let allowed = handoff_state.ready_for_start && !session_state.has_active_session;
    let lifecycle_state = if allowed { "preparing" } else { "conversion_pending" }.to_string();
    let blocker = if allowed {
        String::new()
    } else if session_state.has_active_session {
        "runtime_session:already_active".to_string()
    } else {
        handoff_state.blocker.clone()
    };
    let blocker = compact_lifecycle_text(&blocker);
    let note = if allowed {
        "Start gate is allowed from the latest realtime handoff snapshot. Runtime session will be recorded; real microphone stream creation remains deferred to runtime integration.".to_string()
    } else if session_state.has_active_session {
        format!("Start gate is blocked because a runtime session is already active. {}", session_state.note)
    } else {
        format!("Start gate is blocked: {}. {}", blocker, handoff_state.note)
    };

    RuntimeLifecycleGateReport {
        action: "start".to_string(),
        allowed,
        lifecycle_state,
        handoff_state,
        session_state,
        blocker,
        note: compact_lifecycle_text(&note),
    }
}

pub fn analyze_stop_lifecycle_gate() -> RuntimeLifecycleGateReport {
    let handoff_state = latest_runtime_handoff_state();
    let session_state = latest_runtime_session_state();
    let allowed = session_state.ready_for_stop || handoff_state.has_snapshot;
    let blocker = if allowed {
        String::new()
    } else {
        "runtime_session:no_active_session_or_handoff".to_string()
    };
    let blocker = compact_lifecycle_text(&blocker);
    let note = if session_state.ready_for_stop {
        format!("Stop gate is allowed for active runtime session. {}", session_state.note)
    } else if handoff_state.has_snapshot {
        format!("Stop gate is allowed to clear handoff snapshot even without active session. {}", handoff_state.note)
    } else {
        "Stop gate has no active runtime session or handoff snapshot to clear; Stop command may still be safe but is not needed.".to_string()
    };

    RuntimeLifecycleGateReport {
        action: "stop".to_string(),
        allowed,
        lifecycle_state: if allowed { "stopped" } else { "idle" }.to_string(),
        handoff_state,
        session_state,
        blocker,
        note: compact_lifecycle_text(&note),
    }
}

fn compact_lifecycle_text(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|character| !character.is_control())
        .take(MAX_LIFECYCLE_GATE_TEXT_CHARS)
        .collect::<String>()
}
