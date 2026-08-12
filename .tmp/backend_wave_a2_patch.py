from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8", newline="\n")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def sub_once(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one regex match, found {count}")
    return updated


def patch_runtime_state() -> None:
    path = "EngineData/Frontend/RustApp/src-tauri/src/engine/runtime_state.rs"
    text = read(path)
    text = text.replace(
        "revoke_application_meeting_session_authority",
        "revoke_runtime_session_authority",
    )
    text = replace_once(
        text,
        '''pub fn runtime_generation_is_authoritative(generation: u64) -> bool {''',
        '''pub fn mark_runtime_session_cleanup_incomplete(\n    generation: u64,\n    live_capture_stream_active: bool,\n    note: &str,\n) -> RuntimeSessionStateReport {\n    let store = RUNTIME_SESSION_STATE.get_or_init(|| Mutex::new(None));\n    let Ok(mut guard) = store.lock() else {\n        invalidate_runtime_generation();\n        return state_unavailable_report(\n            "Runtime cleanup could not be recorded because session state is unavailable. Output generation authority remains invalidated fail-closed.",\n        );\n    };\n    let Some(snapshot) = guard.as_mut() else {\n        return blocked_session_report(\n            "runtime_session:no_active_session",\n            "Runtime cleanup could not be marked incomplete because no active session exists.",\n        );\n    };\n    if snapshot.generation != generation {\n        return RuntimeSessionStateReport {\n            has_active_session: true,\n            snapshot: Some(snapshot.clone()),\n            active_age_ms: Some(current_unix_ms().saturating_sub(snapshot.started_unix_ms)),\n            ready_for_stop: snapshot.safe_to_stop,\n            blocker: "runtime_session:generation_mismatch".to_string(),\n            note: "Cleanup state was not changed because the requested generation is stale."\n                .to_string(),\n        };\n    }\n\n    invalidate_runtime_generation();\n    snapshot.authority_active = false;\n    snapshot.phase = "cleanup_incomplete".to_string();\n    snapshot.live_capture_stream_active = live_capture_stream_active;\n    snapshot.safe_to_stop = true;\n    snapshot.note = compact_runtime_text(\n        note,\n        MAX_RUNTIME_NOTE_CHARS,\n        "Runtime output authority is revoked, but one or more owned resources still need cleanup.",\n    );\n    build_session_state_report(Some(snapshot.clone()))\n}\n\npub fn runtime_generation_is_authoritative(generation: u64) -> bool {''',
        "insert cleanup-incomplete state owner",
    )
    text = replace_once(
        text,
        '''                blocker: if authority_active {\n                    String::new()\n                } else {\n                    "runtime_session:authority_revoked".to_string()\n                },''',
        '''                blocker: if snapshot.phase == "cleanup_incomplete" {\n                    "runtime_session:cleanup_incomplete".to_string()\n                } else if authority_active {\n                    String::new()\n                } else {\n                    "runtime_session:authority_revoked".to_string()\n                },''',
        "cleanup-incomplete blocker projection",
    )
    insert = '''\n    #[test]\n    fn cleanup_incomplete_retains_owner_until_successful_retry_clear() {\n        let _serial = TEST_SERIAL.lock().expect("runtime-state test lock");\n        reset_test_state();\n\n        let meeting = begin_application_meeting_session();\n        let generation = meeting\n            .snapshot\n            .as_ref()\n            .expect("meeting claim")\n            .generation;\n        let revoked = revoke_runtime_session_authority(\n            generation,\n            "test revoke before incomplete cleanup",\n        );\n        assert!(!revoked.snapshot.as_ref().expect("revoked snapshot").authority_active);\n\n        let incomplete = mark_runtime_session_cleanup_incomplete(\n            generation,\n            true,\n            "microphone cleanup still needs attention",\n        );\n        let snapshot = incomplete.snapshot.as_ref().expect("retained cleanup owner");\n        assert_eq!(snapshot.phase, "cleanup_incomplete");\n        assert!(snapshot.live_capture_stream_active);\n        assert!(!snapshot.authority_active);\n        assert_eq!(incomplete.blocker, "runtime_session:cleanup_incomplete");\n\n        let competing = begin_direct_live_capture_session();\n        assert_eq!(competing.blocker, "runtime_session:already_active");\n        assert_eq!(\n            competing.snapshot.as_ref().map(|value| value.owner_id.as_str()),\n            Some(APPLICATION_MEETING_OWNER_ID),\n        );\n\n        let cleared = clear_runtime_session_state();\n        assert!(!cleared.has_active_session);\n        assert!(cleared.snapshot.is_none());\n        assert_eq!(cleared.blocker, "runtime_session:cleared");\n        reset_test_state();\n    }\n'''
    text = replace_once(
        text,
        '''    #[test]\n    fn unavailable_runtime_state_is_fail_closed_not_idle() {\n        let report = state_unavailable_report("test");\n        assert!(report.has_active_session);\n        assert!(report.snapshot.is_none());\n        assert!(!report.ready_for_stop);\n        assert_eq!(report.blocker, "runtime_session:state_lock_failed");\n    }\n}''',
        '''    #[test]\n    fn unavailable_runtime_state_is_fail_closed_not_idle() {\n        let report = state_unavailable_report("test");\n        assert!(report.has_active_session);\n        assert!(report.snapshot.is_none());\n        assert!(!report.ready_for_stop);\n        assert_eq!(report.blocker, "runtime_session:state_lock_failed");\n    }\n''' + insert + '''}\n''',
        "runtime cleanup-incomplete test",
    )
    write(path, text)


def patch_capture_lifecycle() -> None:
    path = "EngineData/Frontend/RustApp/src-tauri/src/engine/capture_lifecycle.rs"
    text = read(path)
    text = replace_once(
        text,
        '''use crate::engine::runtime_state::{\n    begin_direct_live_capture_session, clear_runtime_session_state, latest_runtime_session_state,\n};''',
        '''use crate::engine::runtime_state::{\n    begin_direct_live_capture_session, clear_runtime_session_state, latest_runtime_session_state,\n    mark_runtime_session_cleanup_incomplete, revoke_runtime_session_authority,\n};''',
        "capture lifecycle imports",
    )
    text = sub_once(
        text,
        r'pub fn stop_capture\(\) -> CommandResult \{.*?\n\}',
        '''pub fn stop_capture() -> CommandResult {\n    let current = latest_runtime_session_state();\n    if current.has_active_session && current.snapshot.is_none() {\n        return CommandResult::blocked(\n            LifecycleState::Error,\n            "Microphone test cannot verify runtime ownership right now. Capture state was left unchanged.",\n        );\n    }\n    if let Some(snapshot) = current.snapshot.as_ref() {\n        if snapshot.owner_id != MIC_TEST_CAPTURE_OWNER_ID {\n            return CommandResult::blocked(\n                LifecycleState::ConversionPending,\n                "Microphone test Stop cannot control an active Meeting session. Stop Translation from the Meeting workspace instead.",\n            );\n        }\n    }\n\n    let generation = current.snapshot.as_ref().map(|snapshot| snapshot.generation);\n    if let Some(generation) = generation {\n        let revoked = revoke_runtime_session_authority(\n            generation,\n            "Mic Test Stop accepted. Runtime generation authority was revoked before microphone cleanup.",\n        );\n        if revoked.snapshot.is_none()\n            || revoked\n                .snapshot\n                .as_ref()\n                .map(|snapshot| snapshot.authority_active)\n                .unwrap_or(true)\n        {\n            return CommandResult::blocked(\n                LifecycleState::Error,\n                "Microphone test could not revoke runtime ownership safely. Capture cleanup was not claimed complete.",\n            );\n        }\n    }\n\n    let capture = stop_live_capture_runtime();\n    if !capture.ok {\n        if let Some(generation) = generation {\n            let _ = mark_runtime_session_cleanup_incomplete(\n                generation,\n                true,\n                "Mic Test output authority is revoked, but microphone capture cleanup did not complete. Retry Stop Mic Test.",\n            );\n        }\n        return CommandResult::blocked(LifecycleState::Error, capture.message);\n    }\n\n    let cleared = clear_runtime_session_state();\n    if cleared.has_active_session\n        || cleared.snapshot.is_some()\n        || cleared.blocker != "runtime_session:cleared"\n    {\n        return CommandResult::blocked(\n            LifecycleState::Error,\n            "Microphone capture stopped, but TranslateIT could not confirm that runtime ownership was cleared. Keep the app open and retry.",\n        );\n    }\n\n    CommandResult::ok(\n        LifecycleState::Stopped,\n        "Microphone test recording stopped and microphone ownership was released.",\n    )\n}''',
        "truthful Mic Test stop",
    )
    write(path, text)


def patch_meeting_session() -> None:
    path = "EngineData/Frontend/RustApp/src-tauri/src/commands/meeting_session.rs"
    text = read(path)
    text = text.replace(
        "revoke_application_meeting_session_authority",
        "revoke_runtime_session_authority",
    )
    text = replace_once(
        text,
        '''    commit_application_meeting_session_live, latest_runtime_session_state,\n    revoke_runtime_session_authority, runtime_generation_is_authoritative,\n    RuntimeSessionStateReport,\n};''',
        '''    commit_application_meeting_session_live, latest_runtime_session_state,\n    mark_runtime_session_cleanup_incomplete, revoke_runtime_session_authority,\n    runtime_generation_is_authoritative, RuntimeSessionStateReport,\n};''',
        "meeting runtime-state imports",
    )
    text = replace_once(
        text,
        '''struct MeetingIncomingConsumerRuntime {\n    session_id: String,\n    thread: Option<JoinHandle<()>>,\n}\n\nstruct MeetingCommittedTurnStore {''',
        '''struct MeetingIncomingConsumerRuntime {\n    session_id: String,\n    thread: Option<JoinHandle<()>>,\n}\n\nstruct MeetingConsumerCleanupResult {\n    ok: bool,\n    message: String,\n}\n\nstruct MeetingCommittedTurnStore {''',
        "consumer cleanup result type",
    )
    text = replace_once(
        text,
        '''fn current_incoming_status() -> MeetingIncomingRuntimeStatus {\n    let mut status = incoming_status_store()\n        .lock()\n        .map(|status| status.clone())\n        .unwrap_or_else(|_| idle_incoming_status());\n    let capture = meeting_sound_capture_status();\n    if status.session_id.is_some() {\n        status.capture_active = capture.stream_active;\n        status.suppressed = capture.suppression_active;\n        if capture.stream_active && capture.callback_error_count > 0 {\n            status.degraded = true;\n            if status.blocker.is_empty() {\n                status.blocker = "meeting_incoming:capture_callback_error".to_string();\n            }\n        }\n    }\n    status\n}''',
        '''fn current_incoming_status() -> MeetingIncomingRuntimeStatus {\n    let mut status = incoming_status_store()\n        .lock()\n        .map(|status| status.clone())\n        .unwrap_or_else(|_| idle_incoming_status());\n    let capture = meeting_sound_capture_status();\n    if status.session_id.is_some() {\n        if status.stage == "cleanup_incomplete"\n            && capture.blocker == "meeting_sound:state_lock_failed"\n        {\n            status.capture_active = true;\n            status.suppressed = false;\n        } else {\n            status.capture_active = capture.stream_active;\n            status.suppressed = capture.suppression_active;\n        }\n        if capture.stream_active && capture.callback_error_count > 0 {\n            status.degraded = true;\n            if status.blocker.is_empty() {\n                status.blocker = "meeting_incoming:capture_callback_error".to_string();\n            }\n        }\n    }\n    status\n}''',
        "incoming cleanup truth projection",
    )
    text = replace_once(
        text,
        '''fn clear_incoming_status() {\n    if let Ok(mut status) = incoming_status_store().lock() {\n        *status = idle_incoming_status();\n    }\n}\n\nfn reset_committed_turns''',
        '''fn clear_outbound_status() {\n    if let Ok(mut status) = outbound_status_store().lock() {\n        *status = idle_outbound_status();\n    }\n}\n\nfn clear_incoming_status() {\n    if let Ok(mut status) = incoming_status_store().lock() {\n        *status = idle_incoming_status();\n    }\n}\n\nfn mark_incoming_cleanup_incomplete_status(\n    session_id: &str,\n    capture_potentially_active: bool,\n    note: &str,\n) {\n    if let Ok(mut status) = incoming_status_store().lock() {\n        *status = MeetingIncomingRuntimeStatus {\n            session_id: Some(session_id.to_string()),\n            stage: "cleanup_incomplete".to_string(),\n            capture_active: capture_potentially_active,\n            suppressed: false,\n            degraded: true,\n            blocker: "meeting_session:cleanup_incomplete".to_string(),\n            note: note.to_string(),\n            updated_unix_ms: unix_ms(),\n            runtime_claim:\n                "meeting_incoming_cleanup_incomplete_resource_release_not_confirmed"\n                    .to_string(),\n        };\n    }\n}\n\nfn reset_committed_turns''',
        "cleanup status helpers",
    )
    text = sub_once(
        text,
        r'fn stop_meeting_outbound_consumer\(generation: u64\) -> String \{.*?\n\}\n\nfn start_meeting_incoming_consumer',
        '''fn stop_meeting_outbound_consumer(generation: u64) -> MeetingConsumerCleanupResult {\n    clear_finalized_outbound_utterance_producer();\n\n    let store = outbound_consumer_store();\n    let runtime = match store.lock() {\n        Ok(mut guard) => {\n            if guard\n                .as_ref()\n                .map(|value| value.generation == generation)\n                .unwrap_or(false)\n            {\n                guard.take()\n            } else {\n                None\n            }\n        }\n        Err(_) => {\n            return MeetingConsumerCleanupResult {\n                ok: false,\n                message: "Meeting outbound consumer state lock failed during cleanup."\n                    .to_string(),\n            };\n        }\n    };\n\n    let Some(mut runtime) = runtime else {\n        return MeetingConsumerCleanupResult {\n            ok: true,\n            message: "No matching Meeting outbound consumer required cleanup.".to_string(),\n        };\n    };\n    let session_id = runtime.session_id.clone();\n    let joined = runtime\n        .thread\n        .take()\n        .map(|handle| handle.join().is_ok())\n        .unwrap_or(true);\n    MeetingConsumerCleanupResult {\n        ok: joined,\n        message: if joined {\n            format!("Meeting outbound consumer stopped for {session_id} generation {generation}.")\n        } else {\n            format!("Meeting outbound consumer for {session_id} generation {generation} exited unexpectedly during cleanup.")\n        },\n    }\n}\n\nfn start_meeting_incoming_consumer''',
        "outbound consumer cleanup truth",
    )
    text = sub_once(
        text,
        r'fn stop_meeting_incoming_consumer\(session_id: &str\) -> String \{.*?\n\}\n\nfn start_optional_incoming_lane',
        '''fn stop_meeting_incoming_consumer(session_id: &str) -> MeetingConsumerCleanupResult {\n    clear_finalized_incoming_utterance_producer();\n    let store = incoming_consumer_store();\n    let runtime = match store.lock() {\n        Ok(mut guard) => {\n            if guard\n                .as_ref()\n                .map(|value| value.session_id == session_id)\n                .unwrap_or(false)\n            {\n                guard.take()\n            } else {\n                None\n            }\n        }\n        Err(_) => {\n            return MeetingConsumerCleanupResult {\n                ok: false,\n                message: "Meeting incoming consumer state lock failed during cleanup."\n                    .to_string(),\n            };\n        }\n    };\n\n    let Some(mut runtime) = runtime else {\n        return MeetingConsumerCleanupResult {\n            ok: true,\n            message: "No matching Meeting incoming consumer required cleanup.".to_string(),\n        };\n    };\n    let joined = runtime\n        .thread\n        .take()\n        .map(|handle| handle.join().is_ok())\n        .unwrap_or(true);\n    MeetingConsumerCleanupResult {\n        ok: joined,\n        message: if joined {\n            format!("Meeting incoming consumer stopped for session {session_id}.")\n        } else {\n            format!("Meeting incoming consumer for session {session_id} exited unexpectedly during cleanup.")\n        },\n    }\n}\n\nfn start_optional_incoming_lane''',
        "incoming consumer cleanup truth",
    )
    text = replace_once(
        text,
        '''                helper_cancel.message, consumer_cleanup\n            ),''',
        '''                helper_cancel.message, consumer_cleanup.message\n            ),''',
        "rollback consumer cleanup message",
    )
    stop_pattern = r'#\[tauri::command\]\npub fn stop_meeting_translation\(\) -> MeetingSessionActionResult \{.*?\n\}\s*$'
    stop_replacement = '''#[tauri::command]\npub fn stop_meeting_translation() -> MeetingSessionActionResult {\n    let current = latest_runtime_session_state();\n    if current.has_active_session && current.snapshot.is_none() {\n        return MeetingSessionActionResult {\n            ok: false,\n            state: "runtime_state_unavailable".to_string(),\n            message: "Stop Translation cannot verify current runtime ownership. The app will remain open and no cleanup success is claimed."\n                .to_string(),\n            status: status_from_report(current, build_preflight()),\n        };\n    }\n\n    let Some(snapshot) = current.snapshot.as_ref() else {\n        let incoming_capture_stop = stop_meeting_sound_capture_runtime();\n        clear_finalized_incoming_utterance_producer();\n        clear_finalized_meeting_sequence();\n        clear_all_committed_turns();\n        clear_outbound_status();\n        clear_incoming_status();\n        if !incoming_capture_stop.ok {\n            return MeetingSessionActionResult {\n                ok: false,\n                state: "cleanup_incomplete".to_string(),\n                message: format!(\n                    "Translation has no active session, but optional Meeting Sound cleanup could not be confirmed: {}",\n                    incoming_capture_stop.message\n                ),\n                status: status_from_report(current, build_preflight()),\n            };\n        }\n        return MeetingSessionActionResult {\n            ok: true,\n            state: "already_stopped".to_string(),\n            message: "Translation is already stopped. Stop remains idempotent and optional incoming audio state was cleared."\n                .to_string(),\n            status: status_from_report(current, build_preflight()),\n        };\n    };\n\n    let generation = snapshot.generation;\n    let session_id = snapshot.session_id.clone();\n\n    let revoked = revoke_runtime_session_authority(\n        generation,\n        "Stop Translation accepted. Old outbound Meeting generation authority was revoked before full-session cleanup.",\n    );\n    if revoked.snapshot.is_none()\n        || revoked\n            .snapshot\n            .as_ref()\n            .map(|value| value.authority_active)\n            .unwrap_or(true)\n    {\n        return blocked_result(\n            "stop_authority_failed",\n            "Stop Translation could not revoke Meeting generation authority, so cleanup was not allowed to proceed under an ambiguous owner."\n                .to_string(),\n        );\n    }\n\n    interrupt_committed_turns_for_generation(&session_id, generation);\n    let _ = cancel_meeting_virtual_audio_route_provider(generation);\n    let capture_stop = stop_live_capture_runtime();\n    let incoming_capture_stop = stop_meeting_sound_capture_runtime();\n    let helper_cancel = cancel_helper_bridge_meeting_session(&session_id);\n    let outbound_cleanup = stop_meeting_outbound_consumer(generation);\n    let incoming_cleanup = stop_meeting_incoming_consumer(&session_id);\n\n    clear_self_output_suppression_for_session(&session_id);\n    clear_finalized_meeting_sequence();\n    clear_committed_turns_for_session(&session_id);\n    clear_outbound_status();\n\n    let cleanup_complete = meeting_cleanup_complete(\n        capture_stop.ok,\n        incoming_capture_stop.ok,\n        helper_cancel.ok,\n        outbound_cleanup.ok,\n        incoming_cleanup.ok,\n    );\n\n    if !cleanup_complete {\n        let mut failed = Vec::new();\n        if !capture_stop.ok {\n            failed.push("microphone capture");\n        }\n        if !incoming_capture_stop.ok {\n            failed.push("Meeting Sound capture");\n        }\n        if !helper_cancel.ok {\n            failed.push("local helper work");\n        }\n        if !outbound_cleanup.ok {\n            failed.push("outbound consumer");\n        }\n        if !incoming_cleanup.ok {\n            failed.push("incoming consumer");\n        }\n        let failed_summary = failed.join(", ");\n        mark_incoming_cleanup_incomplete_status(\n            &session_id,\n            !incoming_capture_stop.ok,\n            "Meeting output authority is revoked, but one or more cleanup steps still need attention.",\n        );\n        let retained = mark_runtime_session_cleanup_incomplete(\n            generation,\n            !capture_stop.ok,\n            &format!(\n                "Meeting output authority is revoked, but cleanup is incomplete for: {failed_summary}. Retry Stop Translation."\n            ),\n        );\n        return MeetingSessionActionResult {\n            ok: false,\n            state: "cleanup_incomplete".to_string(),\n            message: format!(\n                "Translation output is stopped, but cleanup is incomplete for {failed_summary}. Retry Stop Translation. Microphone: {} Meeting Sound: {} Helper: {} Outbound: {} Incoming: {}",\n                capture_stop.message,\n                incoming_capture_stop.message,\n                helper_cancel.message,\n                outbound_cleanup.message,\n                incoming_cleanup.message,\n            ),\n            status: status_from_report(retained, build_preflight()),\n        };\n    }\n\n    clear_incoming_status();\n    let cleared = clear_runtime_session_state();\n    if cleared.has_active_session\n        || cleared.snapshot.is_some()\n        || cleared.blocker != "runtime_session:cleared"\n    {\n        return MeetingSessionActionResult {\n            ok: false,\n            state: "cleanup_incomplete".to_string(),\n            message: "All known Meeting resources stopped, but TranslateIT could not confirm that runtime ownership was cleared. The app will remain open."\n                .to_string(),\n            status: status_from_report(cleared, build_preflight()),\n        };\n    }\n\n    MeetingSessionActionResult {\n        ok: true,\n        state: "stopped".to_string(),\n        message: format!(\n            "Translation stopped. Authority was revoked before both audio lanes/helper/consumers and transient transcript/session state were cleaned. Microphone: {} Meeting Sound: {} Helper: {} Outbound: {} Incoming: {}",\n            capture_stop.message,\n            incoming_capture_stop.message,\n            helper_cancel.message,\n            outbound_cleanup.message,\n            incoming_cleanup.message,\n        ),\n        status: status_from_report(cleared, build_preflight()),\n    }\n}\n\nfn meeting_cleanup_complete(\n    microphone_capture_ok: bool,\n    meeting_sound_capture_ok: bool,\n    helper_cleanup_ok: bool,\n    outbound_consumer_ok: bool,\n    incoming_consumer_ok: bool,\n) -> bool {\n    microphone_capture_ok\n        && meeting_sound_capture_ok\n        && helper_cleanup_ok\n        && outbound_consumer_ok\n        && incoming_consumer_ok\n}\n\n#[cfg(test)]\nmod cleanup_truth_tests {\n    use super::meeting_cleanup_complete;\n\n    #[test]\n    fn cleanup_truth_requires_every_owned_resource_to_release() {\n        assert!(meeting_cleanup_complete(true, true, true, true, true));\n        assert!(!meeting_cleanup_complete(false, true, true, true, true));\n        assert!(!meeting_cleanup_complete(true, false, true, true, true));\n        assert!(!meeting_cleanup_complete(true, true, false, true, true));\n        assert!(!meeting_cleanup_complete(true, true, true, false, true));\n        assert!(!meeting_cleanup_complete(true, true, true, true, false));\n    }\n}\n'''
    text = sub_once(text, stop_pattern, stop_replacement, "meeting Stop cleanup truth")
    write(path, text)


def patch_product_facade() -> None:
    path = "EngineData/Frontend/RustApp/src/app/bridge/runtimeProductFacade.ts"
    text = read(path)
    text = replace_once(
        text,
        '''  } else if (stopping) {\n    label = "Stopping";\n    message = "Translation is stopping safely.";\n  } else if (hasSession && !applicationOwned) {''',
        '''  } else if (stopping) {\n    label = "Stopping";\n    message = "Translation is stopping safely.";\n  } else if (applicationOwned && lifecycle === "cleanup_incomplete") {\n    label = "Stop Needed";\n    message = "Translation output is stopped, but cleanup still needs attention. Try Stop again.";\n  } else if (hasSession && !applicationOwned) {''',
        "product cleanup-incomplete state",
    )
    write(path, text)


def patch_app() -> None:
    path = "EngineData/Frontend/RustApp/src/App.svelte"
    text = read(path)
    text = replace_once(
        text,
        '''  async function toggleMicTest(): Promise<void> {\n    if (micTestBusy || !snapshot) return;\n    if (snapshot.meeting.hasSession) {\n      setNotice(snapshot.meeting.live\n        ? "Stop Meeting translation before using Mic Test."\n        : "Mic Test is unavailable while Meeting audio is in use.");\n      return;\n    }\n    if (!snapshot.readiness.voiceReady && !snapshot.readiness.recording) {\n      setNotice("Microphone setup isn't ready yet.");\n      return;\n    }\n\n    micTestBusy = true;\n    const wasRecording = snapshot.readiness.recording;''',
        '''  async function toggleMicTest(): Promise<void> {\n    if (micTestBusy || !snapshot) return;\n    if (snapshot.meeting.applicationOwned) {\n      setNotice(snapshot.meeting.live\n        ? "Stop Meeting translation before using Mic Test."\n        : "Mic Test is unavailable while Meeting audio is in use.");\n      return;\n    }\n    const micTestOwnsRuntime = snapshot.meeting.hasSession && !snapshot.meeting.applicationOwned;\n    if (!snapshot.readiness.voiceReady && !snapshot.readiness.recording && !micTestOwnsRuntime) {\n      setNotice("Microphone setup isn't ready yet.");\n      return;\n    }\n\n    micTestBusy = true;\n    const wasRecording = snapshot.readiness.recording || micTestOwnsRuntime;''',
        "Mic Test retry routing",
    )
    write(path, text)


def patch_settings() -> None:
    path = "EngineData/Frontend/RustApp/src/pages/Settings.svelte"
    text = read(path)
    text = replace_once(
        text,
        '''  const meetingResourcesLocked = $derived(snapshot.meeting.hasSession);\n  const meetingResourceLockMessage = "Stop Translation or Mic Test before changing meeting audio or running setup repair.";''',
        '''  const meetingResourcesLocked = $derived(snapshot.meeting.hasSession);\n  const micTestOwnsResources = $derived(snapshot.meeting.hasSession && !snapshot.meeting.applicationOwned);\n  const micTestBlockedByMeeting = $derived(snapshot.meeting.applicationOwned);\n  const meetingResourceLockMessage = "Stop Translation or Mic Test before changing meeting audio or running setup repair.";''',
        "Settings Mic Test ownership projections",
    )
    text = replace_once(
        text,
        '''            <button type="button" class="ti-button ti-button-secondary" disabled={meetingResourcesLocked || micTestBusy || setupBusy || deviceSaving} onclick={() => void onMicTest()}>{micTestBusy ? "Working..." : snapshot.readiness.recording ? "Stop Mic Test" : "Mic Test"}</button>''',
        '''            <button type="button" class="ti-button ti-button-secondary" disabled={micTestBlockedByMeeting || micTestBusy || setupBusy || deviceSaving} onclick={() => void onMicTest()}>{micTestBusy ? "Working..." : snapshot.readiness.recording || micTestOwnsResources ? "Stop Mic Test" : "Mic Test"}</button>''',
        "Settings Mic Test retry button",
    )
    write(path, text)


def patch_source() -> None:
    patch_runtime_state()
    patch_capture_lifecycle()
    patch_meeting_session()
    patch_product_facade()
    patch_app()
    patch_settings()


def patch_closure() -> None:
    path = "docs/knowledge/next-action.md"
    text = read(path)
    old = '''## Current Mode\n\n**Maintenance / Backend Hardening Wave A** — Wave A1 is source/proof closed. Continue one bounded correctness slice at a time before P2.3.\n\n## Next Step — Backend Hardening Wave A2: Cleanup Truth Matches Resource Release\n\nReconcile Meeting Stop and Mic Test Stop so authority invalidation still happens first, but the returned result and retained runtime state do not claim complete resource release when capture/helper/consumer cleanup actually fails. Keep this slice limited to Stop/resource-cleanup truth and direct status/result callers; do not mix helper timeout/scheduler, Python/model, virtual-route redesign, audio callback optimization, or dead-code cleanup.\n'''
    new = '''## Backend Hardening Wave A2 — CLOSED\n\nMeeting Stop and Mic Test Stop now preserve the authority-first rule while making cleanup truth explicit. A Stop result is successful only after required capture/helper/consumer cleanup reports success and the canonical runtime-session owner confirms the session was cleared. If cleanup fails, output generation authority remains revoked but the owner is retained as `cleanup_incomplete`; new Start/device rebind remains blocked and Stop can be retried. Meeting outbound/incoming presentation is also moved out of Live/listening state while cleanup is incomplete.\n\nMic Test uses the same rule: its authority is revoked before capture cleanup, failed capture cleanup retains the Mic Test owner instead of claiming release, and the Settings/App caller keeps Stop Mic Test reachable for retry. The product Meeting mapping presents retained application cleanup as `Stop Needed` rather than a healthy or generic active state.\n\nRemote Windows proof for this slice passed:\n\n```text\nofficial Svelte autofixer (App + Settings) -> PASS\nsvelte-check                             -> PASS: 0 errors / 0 warnings\nVite production build                    -> PASS\nruntime_state targeted tests             -> PASS\nMeeting cleanup-truth targeted test       -> PASS\ncargo check                               -> PASS\nTauri release build --no-bundle           -> PASS\n```\n\nNo Python/model execution, physical audio-device proof, scheduler/deadline change, route redesign, or dead-code cleanup occurred in Wave A2. Real device/resource release still requires the later Windows audio acceptance wave; A2 closes the source/result ownership rule and deterministic cleanup-decision logic.\n\n## Current Mode\n\n**Maintenance / Backend Hardening Wave A** — Waves A1-A2 are source/proof closed. Continue one bounded hardening slice at a time before P2.3.\n\n## Next Step — Backend Hardening Wave A3: Task-Aware Helper Deadlines + Bounded Status Probing\n\nReplace the single 30-second helper response deadline with a small task-aware deadline policy grounded in the existing worker operations, and ensure status/preflight probing cannot consume or exceed the host envelope through nested long-running probes. Keep one persistent worker and the current request protocol; do not add retry loops, a second worker, scheduler admission changes (A4), stderr/logging changes (A5), Python dependency locking (A7), or model execution proof yet. Prove timeout-selection logic with targeted tests plus the existing remote Windows compile/native-build baseline.\n'''
    if old not in text:
        raise SystemExit("closure block not found")
    write(path, text.replace(old, new, 1))


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "source"
    if mode == "source":
        patch_source()
    elif mode == "closure":
        patch_closure()
    else:
        raise SystemExit(f"unknown mode: {mode}")
