use serde::Serialize;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::engine::adapters::realtime_handoff_logic::RealtimeHandoffReport;

const MAX_HANDOFF_SNAPSHOT_AGE_MS: u128 = 120_000;
const MAX_RUNTIME_ID_CHARS: usize = 96;
const MAX_RUNTIME_NOTE_CHARS: usize = 360;
const MAX_RUNTIME_BLOCKERS: usize = 12;
const MAX_RUNTIME_BLOCKER_CHARS: usize = 120;
const APPLICATION_MEETING_OWNER_ID: &str = "translateit_application_meeting";

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
    pub generation: u64,
    pub authority_active: bool,
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
static RUNTIME_AUTHORITY_GENERATION: AtomicU64 = AtomicU64::new(0);

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

pub fn begin_application_meeting_session() -> RuntimeSessionStateReport {
    let store = RUNTIME_SESSION_STATE.get_or_init(|| Mutex::new(None));
    let Ok(mut guard) = store.lock() else {
        return blocked_session_report(
            "runtime_session:state_lock_failed",
            "Meeting session could not start because runtime session state is unavailable.",
        );
    };

    if let Some(existing) = guard.as_ref() {
        return RuntimeSessionStateReport {
            has_active_session: true,
            snapshot: Some(existing.clone()),
            active_age_ms: Some(current_unix_ms().saturating_sub(existing.started_unix_ms)),
            ready_for_stop: existing.safe_to_stop,
            blocker: "runtime_session:already_active".to_string(),
            note: "A runtime session already owns Meeting resources. Duplicate Start did not create another session.".to_string(),
        };
    }

    let now = current_unix_ms();
    let generation = next_runtime_generation();
    let snapshot = RuntimeSessionSnapshot {
        started_unix_ms: now,
        owner_id: APPLICATION_MEETING_OWNER_ID.to_string(),
        session_id: format!("meeting_{now}_{generation}"),
        generation,
        authority_active: true,
        handoff_recorded_unix_ms: now,
        phase: "starting".to_string(),
        live_capture_stream_active: false,
        native_execution_active: false,
        transcript_persistence_active: false,
        safe_to_stop: true,
        note: "Application-level Meeting session authority was created. Required resources may now be opened transactionally.".to_string(),
    };
    *guard = Some(snapshot.clone());
    build_session_state_report(Some(snapshot))
}

pub fn begin_application_meeting_session_resume() -> RuntimeSessionStateReport {
    let store = RUNTIME_SESSION_STATE.get_or_init(|| Mutex::new(None));
    let Ok(mut guard) = store.lock() else {
        return blocked_session_report(
            "runtime_session:state_lock_failed",
            "Meeting session could not Resume because runtime session state is unavailable.",
        );
    };
    let Some(snapshot) = guard.as_mut() else {
        return blocked_session_report(
            "runtime_session:no_active_session",
            "Meeting session could not Resume because no paused application Meeting session exists.",
        );
    };
    if snapshot.owner_id != APPLICATION_MEETING_OWNER_ID {
        return RuntimeSessionStateReport {
            has_active_session: true,
            snapshot: Some(snapshot.clone()),
            active_age_ms: Some(current_unix_ms().saturating_sub(snapshot.started_unix_ms)),
            ready_for_stop: snapshot.safe_to_stop,
            blocker: "runtime_session:owner_conflict".to_string(),
            note: "Meeting Resume was rejected because another runtime owner holds the active session.".to_string(),
        };
    }
    if snapshot.phase != "paused" || snapshot.authority_active {
        return RuntimeSessionStateReport {
            has_active_session: true,
            snapshot: Some(snapshot.clone()),
            active_age_ms: Some(current_unix_ms().saturating_sub(snapshot.started_unix_ms)),
            ready_for_stop: snapshot.safe_to_stop,
            blocker: "runtime_session:not_paused".to_string(),
            note: "Meeting Resume was rejected because the application Meeting session is not paused.".to_string(),
        };
    }

    let generation = next_runtime_generation();
    snapshot.generation = generation;
    snapshot.authority_active = true;
    snapshot.phase = "resuming".to_string();
    snapshot.live_capture_stream_active = false;
    snapshot.note = "Paused Meeting session retained its session identity and received a fresh generation authority for transactional Resume."
        .to_string();
    build_session_state_report(Some(snapshot.clone()))
}

pub fn commit_application_meeting_session_live(
    generation: u64,
    live_capture_stream_active: bool,
    note: &str,
) -> RuntimeSessionStateReport {
    let store = RUNTIME_SESSION_STATE.get_or_init(|| Mutex::new(None));
    let Ok(mut guard) = store.lock() else {
        return blocked_session_report(
            "runtime_session:state_lock_failed",
            "Meeting session could not commit Live because runtime session state is unavailable.",
        );
    };
    let Some(snapshot) = guard.as_mut() else {
        return blocked_session_report(
            "runtime_session:no_active_session",
            "Meeting session could not commit Live because no active session exists.",
        );
    };
    let current_generation = RUNTIME_AUTHORITY_GENERATION.load(Ordering::Acquire);
    if snapshot.generation != generation || !snapshot.authority_active || current_generation != generation {
        return RuntimeSessionStateReport {
            has_active_session: true,
            snapshot: Some(snapshot.clone()),
            active_age_ms: Some(current_unix_ms().saturating_sub(snapshot.started_unix_ms)),
            ready_for_stop: snapshot.safe_to_stop,
            blocker: "runtime_session:generation_not_authoritative".to_string(),
            note: "Meeting session Live commit was rejected because its generation no longer owns output authority.".to_string(),
        };
    }

    snapshot.phase = "live".to_string();
    snapshot.live_capture_stream_active = live_capture_stream_active;
    snapshot.note = compact_runtime_text(
        note,
        MAX_RUNTIME_NOTE_CHARS,
        "Meeting session committed Live.",
    );
    build_session_state_report(Some(snapshot.clone()))
}

pub fn pause_application_meeting_session_authority(
    generation: u64,
    note: &str,
) -> RuntimeSessionStateReport {
    let store = RUNTIME_SESSION_STATE.get_or_init(|| Mutex::new(None));
    let Ok(mut guard) = store.lock() else {
        return blocked_session_report(
            "runtime_session:state_lock_failed",
            "Meeting session could not Pause because runtime session state is unavailable.",
        );
    };
    let Some(snapshot) = guard.as_mut() else {
        return blocked_session_report(
            "runtime_session:no_active_session",
            "Meeting session could not Pause because no application Meeting session exists.",
        );
    };
    if snapshot.owner_id != APPLICATION_MEETING_OWNER_ID {
        return RuntimeSessionStateReport {
            has_active_session: true,
            snapshot: Some(snapshot.clone()),
            active_age_ms: Some(current_unix_ms().saturating_sub(snapshot.started_unix_ms)),
            ready_for_stop: snapshot.safe_to_stop,
            blocker: "runtime_session:owner_conflict".to_string(),
            note: "Meeting Pause was rejected because another runtime owner holds the active session.".to_string(),
        };
    }
    if snapshot.phase == "paused" && !snapshot.authority_active {
        return build_session_state_report(Some(snapshot.clone()));
    }
    if snapshot.generation != generation {
        return RuntimeSessionStateReport {
            has_active_session: true,
            snapshot: Some(snapshot.clone()),
            active_age_ms: Some(current_unix_ms().saturating_sub(snapshot.started_unix_ms)),
            ready_for_stop: snapshot.safe_to_stop,
            blocker: "runtime_session:generation_mismatch".to_string(),
            note: "Meeting Pause did not change authority because the requested generation is stale.".to_string(),
        };
    }
    if !matches!(snapshot.phase.as_str(), "live" | "resuming") || !snapshot.authority_active {
        return RuntimeSessionStateReport {
            has_active_session: true,
            snapshot: Some(snapshot.clone()),
            active_age_ms: Some(current_unix_ms().saturating_sub(snapshot.started_unix_ms)),
            ready_for_stop: snapshot.safe_to_stop,
            blocker: "runtime_session:not_live".to_string(),
            note: "Meeting Pause was rejected because the application Meeting session does not hold Live/Resume generation authority."
                .to_string(),
        };
    }

    invalidate_runtime_generation();
    snapshot.authority_active = false;
    snapshot.phase = "paused".to_string();
    snapshot.live_capture_stream_active = false;
    snapshot.note = compact_runtime_text(
        note,
        MAX_RUNTIME_NOTE_CHARS,
        "Meeting session paused and old generation authority invalidated.",
    );
    build_session_state_report(Some(snapshot.clone()))
}

pub fn revoke_application_meeting_session_authority(
    generation: u64,
    note: &str,
) -> RuntimeSessionStateReport {
    let store = RUNTIME_SESSION_STATE.get_or_init(|| Mutex::new(None));
    let Ok(mut guard) = store.lock() else {
        return blocked_session_report(
            "runtime_session:state_lock_failed",
            "Meeting session authority could not be revoked because runtime session state is unavailable.",
        );
    };
    let Some(snapshot) = guard.as_mut() else {
        return build_session_state_report(None);
    };
    if snapshot.generation != generation {
        return RuntimeSessionStateReport {
            has_active_session: true,
            snapshot: Some(snapshot.clone()),
            active_age_ms: Some(current_unix_ms().saturating_sub(snapshot.started_unix_ms)),
            ready_for_stop: snapshot.safe_to_stop,
            blocker: "runtime_session:generation_mismatch".to_string(),
            note: "Meeting session authority was not changed because the requested generation is stale.".to_string(),
        };
    }

    invalidate_runtime_generation();
    snapshot.authority_active = false;
    snapshot.phase = "stopping".to_string();
    snapshot.live_capture_stream_active = false;
    snapshot.note = compact_runtime_text(
        note,
        MAX_RUNTIME_NOTE_CHARS,
        "Meeting session authority revoked before cleanup.",
    );
    build_session_state_report(Some(snapshot.clone()))
}

pub fn runtime_generation_is_authoritative(generation: u64) -> bool {
    if RUNTIME_AUTHORITY_GENERATION.load(Ordering::Acquire) != generation {
        return false;
    }
    let store = RUNTIME_SESSION_STATE.get_or_init(|| Mutex::new(None));
    store
        .lock()
        .ok()
        .and_then(|guard| guard.as_ref().cloned())
        .map(|snapshot| snapshot.generation == generation && snapshot.authority_active)
        .unwrap_or(false)
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

    let generation = next_runtime_generation();
    let session_snapshot = RuntimeSessionSnapshot {
        started_unix_ms: current_unix_ms(),
        owner_id: safe_runtime_id(&handoff_snapshot.owner_id, "owner"),
        session_id: safe_runtime_id(&handoff_snapshot.session_id, "session"),
        generation,
        authority_active: true,
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
    let generation = next_runtime_generation();
    let session_snapshot = RuntimeSessionSnapshot {
        started_unix_ms: now,
        owner_id: "translateit_rust_live_capture".to_string(),
        session_id: format!("live_capture_{now}_{generation}"),
        generation,
        authority_active: true,
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
    invalidate_runtime_generation();
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
        note: "Runtime session state was cleared and prior generation authority is invalid.".to_string(),
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
            note: "No realtime handoff snapshot has been recorded yet. Legacy capture may still create a microphone-only session, but application Meeting Start must use the dedicated Meeting lifecycle gate.".to_string(),
        },
    }
}

fn build_session_state_report(
    snapshot: Option<RuntimeSessionSnapshot>,
) -> RuntimeSessionStateReport {
    match snapshot {
        Some(snapshot) => {
            let active_age_ms = current_unix_ms().saturating_sub(snapshot.started_unix_ms);
            let authority_active = snapshot.authority_active;
            let intentionally_paused = snapshot.phase == "paused" && !authority_active;
            RuntimeSessionStateReport {
                has_active_session: true,
                snapshot: Some(snapshot.clone()),
                active_age_ms: Some(active_age_ms),
                ready_for_stop: snapshot.safe_to_stop,
                blocker: if authority_active || intentionally_paused {
                    String::new()
                } else {
                    "runtime_session:authority_revoked".to_string()
                },
                note: format!(
                    "Runtime session is in {} phase with generation {} (authority_active={authority_active}). age_ms={active_age_ms}.",
                    compact_runtime_text(&snapshot.phase, MAX_RUNTIME_BLOCKER_CHARS, "unknown"),
                    snapshot.generation,
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

fn blocked_session_report(blocker: &str, note: &str) -> RuntimeSessionStateReport {
    RuntimeSessionStateReport {
        has_active_session: false,
        snapshot: None,
        active_age_ms: None,
        ready_for_stop: false,
        blocker: blocker.to_string(),
        note: note.to_string(),
    }
}

fn next_runtime_generation() -> u64 {
    RUNTIME_AUTHORITY_GENERATION.fetch_add(1, Ordering::AcqRel) + 1
}

fn invalidate_runtime_generation() -> u64 {
    RUNTIME_AUTHORITY_GENERATION.fetch_add(1, Ordering::AcqRel) + 1
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
