use serde::Serialize;

use crate::engine::runtime_state::{latest_runtime_handoff_state, RuntimeHandoffStateReport};

#[derive(Debug, Clone, Serialize)]
pub struct RuntimeLifecycleGateReport {
    pub action: String,
    pub allowed: bool,
    pub lifecycle_state: String,
    pub handoff_state: RuntimeHandoffStateReport,
    pub blocker: String,
    pub note: String,
}

pub fn analyze_start_lifecycle_gate() -> RuntimeLifecycleGateReport {
    let handoff_state = latest_runtime_handoff_state();
    let allowed = handoff_state.ready_for_start;
    let lifecycle_state = if allowed { "preparing" } else { "conversion_pending" }.to_string();
    let blocker = if allowed {
        String::new()
    } else {
        handoff_state.blocker.clone()
    };
    let note = if allowed {
        "Start gate is allowed from the latest realtime handoff snapshot. Real microphone stream creation remains deferred to runtime integration.".to_string()
    } else {
        format!("Start gate is blocked: {}. {}", blocker, handoff_state.note)
    };

    RuntimeLifecycleGateReport {
        action: "start".to_string(),
        allowed,
        lifecycle_state,
        handoff_state,
        blocker,
        note,
    }
}

pub fn analyze_stop_lifecycle_gate() -> RuntimeLifecycleGateReport {
    let handoff_state = latest_runtime_handoff_state();
    RuntimeLifecycleGateReport {
        action: "stop".to_string(),
        allowed: true,
        lifecycle_state: "stopped".to_string(),
        handoff_state,
        blocker: String::new(),
        note: "Stop gate is always allowed. Stop clears the realtime handoff snapshot in the runtime command path.".to_string(),
    }
}
