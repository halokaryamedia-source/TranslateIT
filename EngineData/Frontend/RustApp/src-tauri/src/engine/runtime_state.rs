use serde::Serialize;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_RUNTIME_NOTE_CHARS: usize = 360;
const MAX_RUNTIME_STATE_CHARS: usize = 120;
const APPLICATION_MEETING_OWNER_ID: &str = "translateit_application_meeting";

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

static RUNTIME_SESSION_STATE: OnceLock<Mutex<Option<RuntimeSessionSnapshot>>> = OnceLock::new();
static RUNTIME_AUTHORITY_GENERATION: AtomicU64 = AtomicU64::new(0);

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
    if snapshot.generation != generation
        || !snapshot.authority_active
        || current_generation != generation
    {
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
        note: "Direct live-capture session was created for microphone test ownership only."
            .to_string(),
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
        note: "Runtime session state was cleared and prior generation authority is invalid."
            .to_string(),
    }
}

// Old pipeline handoff state has been removed. Meeting cleanup still calls this
// boundary so rollback/Stop can remain behaviorally unchanged while no second
// runtime-state owner is kept alive.
pub fn clear_runtime_handoff_state() {}

fn store_runtime_session_snapshot(
    session_snapshot: RuntimeSessionSnapshot,
) -> RuntimeSessionStateReport {
    let store = RUNTIME_SESSION_STATE.get_or_init(|| Mutex::new(None));
    if let Ok(mut guard) = store.lock() {
        *guard = Some(session_snapshot.clone());
    }
    build_session_state_report(Some(session_snapshot))
}

fn build_session_state_report(
    snapshot: Option<RuntimeSessionSnapshot>,
) -> RuntimeSessionStateReport {
    match snapshot {
        Some(snapshot) => {
            let active_age_ms = current_unix_ms().saturating_sub(snapshot.started_unix_ms);
            let authority_active = snapshot.authority_active;
            RuntimeSessionStateReport {
                has_active_session: true,
                snapshot: Some(snapshot.clone()),
                active_age_ms: Some(active_age_ms),
                ready_for_stop: snapshot.safe_to_stop,
                blocker: if authority_active {
                    String::new()
                } else {
                    "runtime_session:authority_revoked".to_string()
                },
                note: format!(
                    "Runtime session is in {} phase with generation {} (authority_active={authority_active}). age_ms={active_age_ms}.",
                    compact_runtime_text(&snapshot.phase, MAX_RUNTIME_STATE_CHARS, "unknown"),
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

fn current_unix_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}
