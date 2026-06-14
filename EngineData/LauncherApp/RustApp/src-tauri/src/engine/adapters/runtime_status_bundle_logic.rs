use serde::Serialize;

use crate::engine::adapters::runtime_readiness_bundle_logic::{
    analyze_runtime_readiness_bundle, RuntimeReadinessBundleReport,
};
use crate::engine::state::EngineStatus;

#[derive(Debug, Clone, Serialize)]
pub struct RuntimeStatusBundleReport {
    pub engine_status: EngineStatus,
    pub readiness: RuntimeReadinessBundleReport,
    pub next_action: String,
    pub summary: String,
}

pub fn build_runtime_status_bundle() -> RuntimeStatusBundleReport {
    let engine_status = crate::engine::current_status();
    let readiness = analyze_runtime_readiness_bundle();
    let next_action = if readiness.session_state.has_active_session {
        "continue_native_runtime_or_stop".to_string()
    } else if readiness.ready_for_start_command {
        "start_capture".to_string()
    } else if readiness.handoff_state.has_snapshot {
        "rerun_realtime_handoff".to_string()
    } else {
        "run_realtime_handoff".to_string()
    };
    let summary = format!(
        "start={}, stop={}, active_session={}, user_runtime={}, blockers={}",
        readiness.ready_for_start_command,
        readiness.ready_for_stop_command,
        readiness.session_state.has_active_session,
        readiness.ready_for_user_facing_runtime,
        readiness.blockers.len()
    );

    RuntimeStatusBundleReport {
        engine_status,
        readiness,
        next_action,
        summary,
    }
}
