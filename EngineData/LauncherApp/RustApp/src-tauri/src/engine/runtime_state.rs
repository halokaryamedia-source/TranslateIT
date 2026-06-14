use serde::Serialize;
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::engine::adapters::realtime_handoff_logic::RealtimeHandoffReport;

#[derive(Debug, Clone, Serialize)]
pub struct RuntimeHandoffSnapshot {
    pub recorded_unix_ms: u128,
    pub owner_id: String,
    pub session_id: String,
    pub ready_for_live_capture: bool,
    pub ready_for_segment_runtime: bool,
    pub ready_for_native_execution: bool,
    pub ready_for_safe_save: bool,
    pub ready_for_realtime_handoff: bool,
    pub blocker_count: usize,
    pub blockers: Vec<String>,
    pub note: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct RuntimeHandoffStateReport {
    pub has_snapshot: bool,
    pub snapshot: Option<RuntimeHandoffSnapshot>,
    pub ready_for_start: bool,
    pub blocker: String,
    pub note: String,
}

static RUNTIME_HANDOFF_STATE: OnceLock<Mutex<Option<RuntimeHandoffSnapshot>>> = OnceLock::new();

pub fn record_realtime_handoff_report(report: &RealtimeHandoffReport) -> RuntimeHandoffSnapshot {
    let snapshot = RuntimeHandoffSnapshot {
        recorded_unix_ms: current_unix_ms(),
        owner_id: report.stream.owner_id.clone(),
        session_id: report.stream.session_id.clone(),
        ready_for_live_capture: report.ready_for_live_capture,
        ready_for_segment_runtime: report.ready_for_segment_runtime,
        ready_for_native_execution: report.ready_for_native_execution,
        ready_for_safe_save: report.ready_for_safe_save,
        ready_for_realtime_handoff: report.ready_for_realtime_handoff,
        blocker_count: report.blockers.len(),
        blockers: report.blockers.clone(),
        note: report.note.clone(),
    };

    let store = RUNTIME_HANDOFF_STATE.get_or_init(|| Mutex::new(None));
    if let Ok(mut guard) = store.lock() {
        *guard = Some(snapshot.clone());
    }
    snapshot
}

pub fn latest_runtime_handoff_state() -> RuntimeHandoffStateReport {
    let store = RUNTIME_HANDOFF_STATE.get_or_init(|| Mutex::new(None));
    let snapshot = store
        .lock()
        .ok()
        .and_then(|guard| guard.as_ref().cloned());
    build_state_report(snapshot)
}

pub fn clear_runtime_handoff_state() -> RuntimeHandoffStateReport {
    let store = RUNTIME_HANDOFF_STATE.get_or_init(|| Mutex::new(None));
    if let Ok(mut guard) = store.lock() {
        *guard = None;
    }
    RuntimeHandoffStateReport {
        has_snapshot: false,
        snapshot: None,
        ready_for_start: false,
        blocker: "handoff:cleared".to_string(),
        note: "Realtime handoff snapshot was cleared. Run Realtime Handoff again before Start.".to_string(),
    }
}

fn build_state_report(snapshot: Option<RuntimeHandoffSnapshot>) -> RuntimeHandoffStateReport {
    match snapshot {
        Some(snapshot) => {
            let ready_for_start = snapshot.ready_for_realtime_handoff;
            let blocker = if ready_for_start {
                String::new()
            } else if snapshot.blockers.is_empty() {
                "handoff:not_ready".to_string()
            } else {
                snapshot.blockers.join(",")
            };
            let note = if ready_for_start {
                format!(
                    "Latest realtime handoff snapshot is ready for Start gate. session_id={}, owner_id={}",
                    snapshot.session_id, snapshot.owner_id
                )
            } else {
                format!(
                    "Latest realtime handoff snapshot is not ready. blocker_count={}",
                    snapshot.blocker_count
                )
            };
            RuntimeHandoffStateReport {
                has_snapshot: true,
                snapshot: Some(snapshot),
                ready_for_start,
                blocker,
                note,
            }
        }
        None => RuntimeHandoffStateReport {
            has_snapshot: false,
            snapshot: None,
            ready_for_start: false,
            blocker: "handoff:no_snapshot".to_string(),
            note: "No realtime handoff snapshot has been recorded yet. Use Realtime Handoff before Start.".to_string(),
        },
    }
}

fn current_unix_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}
