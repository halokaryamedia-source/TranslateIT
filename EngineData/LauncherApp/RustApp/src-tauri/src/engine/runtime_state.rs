use serde::Serialize;
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::engine::adapters::realtime_handoff_logic::RealtimeHandoffReport;

const MAX_HANDOFF_SNAPSHOT_AGE_MS: u128 = 120_000;
const MAX_RUNTIME_ID_CHARS: usize = 96;
const MAX_RUNTIME_NOTE_CHARS: usize = 360;
const MAX_RUNTIME_BLOCKERS: usize = 12;
const MAX_RUNTIME_BLOCKER_CHARS: usize = 120;

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
    pub snapshot_age_ms: Option<u128>,
    pub snapshot_stale: bool,
    pub max_snapshot_age_ms: u128,
    pub ready_for_start: bool,
    pub blocker: String,
    pub note: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct RuntimeSessionSnapshot {
    pub started_unix_ms: u128,
    pub owner_id: String,
    pub session_id: String,
    pub handoff_recorded_unix_ms: u128,
    pub phase: String,
    pub live_capture_stream_active: bool,
    pub native_execution_active: bool,
    pub transcript_persistence_active: bool,
    pub safe_to_stop: bool,
    pub note: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct RuntimeSessionStateReport {
    pub has_active_session: bool,
    pub snapshot: Option<RuntimeSessionSnapshot>,
    pub active_age_ms: Option<u128>,
    pub ready_for_stop: bool,
    pub blocker: String,
    pub note: String,
}

static RUNTIME_HANDOFF_STATE: OnceLock<Mutex<Option<RuntimeHandoffSnapshot>>> = OnceLock::new();
static RUNTIME_SESSION_STATE: OnceLock<Mutex<Option<RuntimeSessionSnapshot>>> = OnceLock::new();

pub fn record_realtime_handoff_report(report: &RealtimeHandoffReport) -> RuntimeHandoffSnapshot {
    let blockers = compact_blockers(&report.blockers);
    let snapshot = RuntimeHandoffSnapshot {
        recorded_unix_ms: current_unix_ms(),
        owner_id: safe_runtime_id(&report.stream.owner_id, "owner"),
        session_id: safe_runtime_id(&report.stream.session_id, "session"),
        ready_for_live_capture: report.ready_for_live_capture,
        ready_for_segment_runtime: report.ready_for_segment_runtime,
        ready_for_native_execution: report.ready_for_native_execution,
        ready_for_safe_save: report.ready_for_safe_save,
        ready_for_realtime_handoff: report.ready_for_realtime_handoff,
        blocker_count: blockers.len(),
        blockers,
        note: compact_runtime_text(
            &report.note,
            MAX_RUNTIME_NOTE_CHARS,
            "handoff status unavailable",
        ),
    };

    let store = RUNTIME_HANDOFF_STATE.get_or_init(|| Mutex::new(None));
    if let Ok(mut guard) = store.lock() {
        *guard = Some(snapshot.clone());
    }
    snapshot
}

pub fn latest_runtime_handoff_state() -> RuntimeHandoffStateReport {
    let store = RUNTIME_HANDOFF_STATE.get_or_init(|| Mutex::new(None));
    let snapshot = store.lock().ok().and_then(|guard| guard.as_ref().cloned());
    build_handoff_state_report(snapshot)
}

pub fn clear_runtime_handoff_state() -> RuntimeHandoffStateReport {
    let store = RUNTIME_HANDOFF_STATE.get_or_init(|| Mutex::new(None));
    if let Ok(mut guard) = store.lock() {
        *guard = None;
    }
    RuntimeHandoffStateReport {
        has_snapshot: false,
        snapshot: None,
        snapshot_age_ms: None,
        snapshot_stale: false,
        max_snapshot_age_ms: MAX_HANDOFF_SNAPSHOT_AGE_MS,
        ready_for_start: false,
        blocker: "handoff:cleared".to_string(),
        note: "Realtime handoff snapshot was cleared. Run Realtime Handoff again before full pipeline Start.".to_string(),
    }
}

pub fn record_runtime_session_start(
    handoff_state: &RuntimeHandoffStateReport,
) -> RuntimeSessionStateReport {
    if !handoff_state.ready_for_start {
        return RuntimeSessionStateReport {
            has_active_session: false,
            snapshot: None,
            active_age_ms: None,
            ready_for_stop: false,
            blocker: compact_runtime_text(
                &handoff_state.blocker,
                MAX_RUNTIME_BLOCKER_CHARS,
                "handoff:not_ready",
            ),
            note: format!(
                "Runtime session start was blocked by handoff state. {}",
                compact_runtime_text(
                    &handoff_state.note,
                    MAX_RUNTIME_NOTE_CHARS,
                    "handoff note unavailable"
                )
            ),
        };
    }

    let Some(handoff_snapshot) = handoff_state.snapshot.as_ref() else {
        return RuntimeSessionStateReport {
            has_active_session: false,
            snapshot: None,
            active_age_ms: None,
            ready_for_stop: false,
            blocker: "runtime_session:no_handoff_snapshot".to_string(),
            note: "Runtime session start was blocked because no handoff snapshot was available."
                .to_string(),
        };
    };

    let session_snapshot = RuntimeSessionSnapshot {
        started_unix_ms: current_unix_ms(),
        owner_id: safe_runtime_id(&handoff_snapshot.owner_id, "owner"),
        session_id: safe_runtime_id(&handoff_snapshot.session_id, "session"),
        handoff_recorded_unix_ms: handoff_snapshot.recorded_unix_ms,
        phase: "preparing".to_string(),
        live_capture_stream_active: false,
        native_execution_active: false,
        transcript_persistence_active: false,
        safe_to_stop: true,
        note: "Runtime session ownership was recorded after Start gate approval. Live capture stream may now be opened.".to_string(),
    };

    store_runtime_session_snapshot(session_snapshot)
}

pub fn record_direct_live_capture_session() -> RuntimeSessionStateReport {
    let now = current_unix_ms();
    let session_snapshot = RuntimeSessionSnapshot {
        started_unix_ms: now,
        owner_id: "translateit_rust_live_capture".to_string(),
        session_id: format!("live_capture_{now}"),
        handoff_recorded_unix_ms: now,
        phase: "live_capture_only".to_string(),
        live_capture_stream_active: false,
        native_execution_active: false,
        transcript_persistence_active: false,
        safe_to_stop: true,
        note: "Direct live-capture session was created for microphone stream ownership only. Full ASR/translation/TTS handoff remains pending.".to_string(),
    };

    store_runtime_session_snapshot(session_snapshot)
}

pub fn latest_runtime_session_state() -> RuntimeSessionStateReport {
    let store = RUNTIME_SESSION_STATE.get_or_init(|| Mutex::new(None));
    let snapshot = store.lock().ok().and_then(|guard| guard.as_ref().cloned());
    build_session_state_report(snapshot)
}

pub fn clear_runtime_session_state() -> RuntimeSessionStateReport {
    let store = RUNTIME_SESSION_STATE.get_or_init(|| Mutex::new(None));
    if let Ok(mut guard) = store.lock() {
        *guard = None;
    }
    RuntimeSessionStateReport {
        has_active_session: false,
        snapshot: None,
        active_age_ms: None,
        ready_for_stop: false,
        blocker: "runtime_session:cleared".to_string(),
        note: "Runtime session state was cleared.".to_string(),
    }
}

fn store_runtime_session_snapshot(
    session_snapshot: RuntimeSessionSnapshot,
) -> RuntimeSessionStateReport {
    let store = RUNTIME_SESSION_STATE.get_or_init(|| Mutex::new(None));
    if let Ok(mut guard) = store.lock() {
        *guard = Some(session_snapshot.clone());
    }

    build_session_state_report(Some(session_snapshot))
}

fn build_handoff_state_report(
    snapshot: Option<RuntimeHandoffSnapshot>,
) -> RuntimeHandoffStateReport {
    match snapshot {
        Some(snapshot) => {
            let snapshot_age_ms = current_unix_ms().saturating_sub(snapshot.recorded_unix_ms);
            let snapshot_stale = snapshot_age_ms > MAX_HANDOFF_SNAPSHOT_AGE_MS;
            let ready_for_start = snapshot.ready_for_realtime_handoff && !snapshot_stale;
            let blocker = if ready_for_start {
                String::new()
            } else if snapshot_stale {
                "handoff:snapshot_stale".to_string()
            } else if snapshot.blockers.is_empty() {
                "handoff:not_ready".to_string()
            } else {
                snapshot.blockers.join(",")
            };
            let note = if ready_for_start {
                format!(
                    "Latest realtime handoff snapshot is ready for Start gate. session_id={}, owner_id={}, age_ms={}",
                    snapshot.session_id, snapshot.owner_id, snapshot_age_ms
                )
            } else if snapshot_stale {
                format!(
                    "Latest realtime handoff snapshot is stale. age_ms={}, max_age_ms={}. Run Realtime Handoff again before full pipeline Start.",
                    snapshot_age_ms, MAX_HANDOFF_SNAPSHOT_AGE_MS
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
                snapshot_age_ms: Some(snapshot_age_ms),
                snapshot_stale,
                max_snapshot_age_ms: MAX_HANDOFF_SNAPSHOT_AGE_MS,
                ready_for_start,
                blocker,
                note,
            }
        }
        None => RuntimeHandoffStateReport {
            has_snapshot: false,
            snapshot: None,
            snapshot_age_ms: None,
            snapshot_stale: false,
            max_snapshot_age_ms: MAX_HANDOFF_SNAPSHOT_AGE_MS,
            ready_for_start: false,
            blocker: "handoff:no_snapshot".to_string(),
            note: "No realtime handoff snapshot has been recorded yet. Start can still create a microphone-only live-capture session, but full ASR/translation/TTS handoff remains pending.".to_string(),
        },
    }
}

fn build_session_state_report(
    snapshot: Option<RuntimeSessionSnapshot>,
) -> RuntimeSessionStateReport {
    match snapshot {
        Some(snapshot) => {
            let active_age_ms = current_unix_ms().saturating_sub(snapshot.started_unix_ms);
            RuntimeSessionStateReport {
                has_active_session: true,
                snapshot: Some(snapshot.clone()),
                active_age_ms: Some(active_age_ms),
                ready_for_stop: true,
                blocker: String::new(),
                note: format!(
                    "Runtime session is active in {} phase. age_ms={active_age_ms}.",
                    compact_runtime_text(&snapshot.phase, MAX_RUNTIME_BLOCKER_CHARS, "unknown")
                ),
            }
        }
        None => RuntimeSessionStateReport {
            has_active_session: false,
            snapshot: None,
            active_age_ms: None,
            ready_for_stop: false,
            blocker: "runtime_session:no_active_session".to_string(),
            note: "No runtime session has been started yet.".to_string(),
        },
    }
}

fn is_unsafe_runtime_state_character(character: char) -> bool {
    character == '\0'
        || ('\u{0001}'..='\u{0008}').contains(&character)
        || ('\u{000b}'..='\u{001f}').contains(&character)
        || character == '\u{007f}'
        || ('\u{202a}'..='\u{202e}').contains(&character)
        || ('\u{2066}'..='\u{2069}').contains(&character)
}

fn compact_runtime_text(value: &str, max_chars: usize, fallback: &str) -> String {
    let clean = value
        .trim()
        .chars()
        .filter(|character| !is_unsafe_runtime_state_character(*character))
        .take(max_chars)
        .collect::<String>();
    if clean.is_empty() {
        fallback.to_string()
    } else {
        clean
    }
}

fn safe_runtime_id(value: &str, fallback: &str) -> String {
    let clean = value
        .trim()
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || matches!(character, '-' | '_') {
                character
            } else {
                '_'
            }
        })
        .take(MAX_RUNTIME_ID_CHARS)
        .collect::<String>();
    if clean.is_empty() {
        fallback.to_string()
    } else {
        clean
    }
}

fn compact_blockers(blockers: &[String]) -> Vec<String> {
    blockers
        .iter()
        .take(MAX_RUNTIME_BLOCKERS)
        .map(|value| {
            compact_runtime_text(
                value,
                MAX_RUNTIME_BLOCKER_CHARS,
                "runtime:blocker_unavailable",
            )
        })
        .collect()
}

fn current_unix_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}
