from __future__ import annotations

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


def patch_runtime_state() -> None:
    path = "EngineData/Frontend/RustApp/src-tauri/src/engine/runtime_state.rs"
    text = read(path)
    text = replace_once(
        text,
        '''            "Meeting session authority could not be verified during revoke. Output generation authority was invalidated fail-closed.",''',
        '''            "Runtime session authority could not be verified during revoke. Output generation authority was invalidated fail-closed.",''',
        "generic revoke lock note",
    )
    text = replace_once(
        text,
        '''            note: "Meeting session authority was not changed because the requested generation is stale.".to_string(),''',
        '''            note: "Runtime session authority was not changed because the requested generation is stale.".to_string(),''',
        "generic revoke stale note",
    )
    text = replace_once(
        text,
        '''        "Meeting session authority revoked before cleanup.",''',
        '''        "Runtime session authority revoked before cleanup.",''',
        "generic revoke fallback",
    )
    marker = '''pub fn clear_runtime_session_state() -> RuntimeSessionStateReport {\n    invalidate_runtime_generation();\n    let store = RUNTIME_SESSION_STATE.get_or_init(|| Mutex::new(None));\n    let Ok(mut guard) = store.lock() else {\n        return state_unavailable_report(\n            "Runtime generation authority was invalidated, but session storage could not be verified as cleared.",\n        );\n    };\n    *guard = None;\n    RuntimeSessionStateReport {\n        has_active_session: false,\n        snapshot: None,\n        active_age_ms: None,\n        ready_for_stop: false,\n        blocker: "runtime_session:cleared".to_string(),\n        note: "Runtime session state was cleared and prior generation authority is invalid."\n            .to_string(),\n    }\n}\n'''
    addition = marker + '''\npub fn clear_runtime_session_if_generation(generation: u64) -> RuntimeSessionStateReport {\n    let store = RUNTIME_SESSION_STATE.get_or_init(|| Mutex::new(None));\n    let Ok(mut guard) = store.lock() else {\n        invalidate_runtime_generation();\n        return state_unavailable_report(\n            "Runtime generation authority was invalidated, but matching session cleanup could not be verified because session state is unavailable.",\n        );\n    };\n\n    let Some(snapshot) = guard.as_ref() else {\n        return build_session_state_report(None);\n    };\n    if snapshot.generation != generation {\n        return RuntimeSessionStateReport {\n            has_active_session: true,\n            snapshot: Some(snapshot.clone()),\n            active_age_ms: Some(current_unix_ms().saturating_sub(snapshot.started_unix_ms)),\n            ready_for_stop: snapshot.safe_to_stop,\n            blocker: "runtime_session:generation_mismatch".to_string(),\n            note: "Runtime session was not cleared because the requested cleanup generation is stale."\n                .to_string(),\n        };\n    }\n\n    invalidate_runtime_generation();\n    *guard = None;\n    RuntimeSessionStateReport {\n        has_active_session: false,\n        snapshot: None,\n        active_age_ms: None,\n        ready_for_stop: false,\n        blocker: "runtime_session:cleared".to_string(),\n        note: "The matching runtime session was cleared and prior generation authority is invalid."\n            .to_string(),\n    }\n}\n'''
    text = replace_once(text, marker, addition, "generation-scoped clear")
    test_marker = '''    #[test]\n    fn cleanup_incomplete_retains_owner_until_successful_retry_clear() {'''
    new_test = '''    #[test]\n    fn stale_cleanup_generation_cannot_clear_a_newer_owner() {\n        let _serial = TEST_SERIAL.lock().expect("runtime-state test lock");\n        reset_test_state();\n\n        let meeting = begin_application_meeting_session();\n        let meeting_generation = meeting\n            .snapshot\n            .as_ref()\n            .expect("meeting claim")\n            .generation;\n        let cleared = clear_runtime_session_if_generation(meeting_generation);\n        assert_eq!(cleared.blocker, "runtime_session:cleared");\n\n        let mic_test = begin_direct_live_capture_session();\n        let mic_generation = mic_test\n            .snapshot\n            .as_ref()\n            .expect("mic claim")\n            .generation;\n        assert_ne!(meeting_generation, mic_generation);\n\n        let stale_clear = clear_runtime_session_if_generation(meeting_generation);\n        assert_eq!(stale_clear.blocker, "runtime_session:generation_mismatch");\n        assert_eq!(\n            stale_clear.snapshot.as_ref().map(|value| value.generation),\n            Some(mic_generation),\n        );\n        assert_eq!(\n            stale_clear.snapshot.as_ref().map(|value| value.owner_id.as_str()),\n            Some(DIRECT_LIVE_CAPTURE_OWNER_ID),\n        );\n\n        let final_clear = clear_runtime_session_if_generation(mic_generation);\n        assert_eq!(final_clear.blocker, "runtime_session:cleared");\n        reset_test_state();\n    }\n\n''' + test_marker
    text = replace_once(text, test_marker, new_test, "stale clear regression test")
    write(path, text)


def patch_capture_lifecycle() -> None:
    path = "EngineData/Frontend/RustApp/src-tauri/src/engine/capture_lifecycle.rs"
    text = read(path)
    text = replace_once(
        text,
        '''    begin_direct_live_capture_session, clear_runtime_session_state, latest_runtime_session_state,\n    mark_runtime_session_cleanup_incomplete, revoke_runtime_session_authority,''',
        '''    begin_direct_live_capture_session, clear_runtime_session_if_generation,\n    clear_runtime_session_state, latest_runtime_session_state,\n    mark_runtime_session_cleanup_incomplete, revoke_runtime_session_authority,''',
        "capture generation-clear import",
    )
    old = '''    let cleared = clear_runtime_session_state();\n    if cleared.has_active_session\n        || cleared.snapshot.is_some()\n        || cleared.blocker != "runtime_session:cleared"\n    {\n        return CommandResult::blocked(\n            LifecycleState::Error,\n            "Microphone capture stopped, but TranslateIT could not confirm that runtime ownership was cleared. Keep the app open and retry.",\n        );\n    }\n\n    CommandResult::ok(\n'''
    new = '''    if let Some(generation) = generation {\n        let cleared = clear_runtime_session_if_generation(generation);\n        if cleared.has_active_session\n            || cleared.snapshot.is_some()\n            || cleared.blocker != "runtime_session:cleared"\n        {\n            return CommandResult::blocked(\n                LifecycleState::Error,\n                "Microphone capture stopped, but TranslateIT could not confirm that Mic Test ownership was cleared. Keep the app open and retry.",\n            );\n        }\n    }\n\n    CommandResult::ok(\n'''
    text = replace_once(text, old, new, "Mic Test generation-scoped clear")
    write(path, text)


def patch_meeting_session() -> None:
    path = "EngineData/Frontend/RustApp/src-tauri/src/commands/meeting_session.rs"
    text = read(path)
    text = replace_once(
        text,
        '''    begin_application_meeting_session, clear_runtime_session_state,\n    commit_application_meeting_session_live, latest_runtime_session_state,''',
        '''    begin_application_meeting_session, clear_runtime_session_if_generation,\n    clear_runtime_session_state, commit_application_meeting_session_live, latest_runtime_session_state,''',
        "meeting generation-clear import",
    )
    owner_marker = '''    let Some(snapshot) = current.snapshot.as_ref() else {'''
    owner_check = '''    if let Some(snapshot) = current.snapshot.as_ref() {\n        if snapshot.owner_id != APPLICATION_MEETING_OWNER_ID {\n            return MeetingSessionActionResult {\n                ok: false,\n                state: "active_session_conflict".to_string(),\n                message: "Stop Translation cannot control Mic Test or another non-Meeting runtime owner. Stop that operation from its own control first."\n                    .to_string(),\n                status: status_from_report(current, build_preflight()),\n            };\n        }\n    }\n\n    let Some(snapshot) = current.snapshot.as_ref() else {'''
    stop_start = text.index("pub fn stop_meeting_translation()")
    prefix, suffix = text[:stop_start], text[stop_start:]
    suffix = replace_once(suffix, owner_marker, owner_check, "Meeting Stop owner guard")
    text = prefix + suffix
    text = replace_once(
        text,
        '''    let cleared = clear_runtime_session_state();\n    if cleared.has_active_session''',
        '''    let cleared = clear_runtime_session_if_generation(generation);\n    if cleared.has_active_session''',
        "Meeting generation-scoped clear",
    )
    write(path, text)


def patch_closure() -> None:
    path = "docs/knowledge/next-action.md"
    text = read(path)
    old = '''Meeting Stop and Mic Test Stop now preserve the authority-first rule while making cleanup truth explicit. A Stop result is successful only after required capture/helper/consumer cleanup reports success and the canonical runtime-session owner confirms the session was cleared. If cleanup fails, output generation authority remains revoked but the owner is retained as `cleanup_incomplete`; new Start/device rebind remains blocked and Stop can be retried. Meeting outbound/incoming presentation is also moved out of Live/listening state while cleanup is incomplete.\n\nMic Test uses the same rule: its authority is revoked before capture cleanup, failed capture cleanup retains the Mic Test owner instead of claiming release, and the Settings/App caller keeps Stop Mic Test reachable for retry. The product Meeting mapping presents retained application cleanup as `Stop Needed` rather than a healthy or generic active state.\n'''
    new = '''Meeting Stop and Mic Test Stop now preserve the authority-first rule while making cleanup truth explicit. A Stop result is successful only after required capture/helper/consumer cleanup reports success and the canonical runtime-session owner confirms the **same generation** was cleared. If cleanup fails, output generation authority remains revoked but the owner is retained as `cleanup_incomplete`; new Start/device rebind remains blocked and Stop can be retried. A stale cleanup generation cannot clear a newer runtime owner, and Meeting Stop explicitly refuses to revoke Mic Test/non-Meeting ownership. Meeting outbound/incoming presentation is also moved out of Live/listening state while cleanup is incomplete.\n\nMic Test uses the same rule: its authority is revoked before capture cleanup, failed capture cleanup retains the Mic Test owner instead of claiming release, and the Settings/App caller keeps Stop Mic Test reachable for retry. An idempotent Mic Test Stop with no owned session no longer performs a global session clear. The product Meeting mapping presents retained application cleanup as `Stop Needed` rather than a healthy or generic active state.\n'''
    text = replace_once(text, old, new, "A2 closure ownership precision")
    write(path, text)


def patch_source() -> None:
    patch_runtime_state()
    patch_capture_lifecycle()
    patch_meeting_session()


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "source"
    if mode == "source":
        patch_source()
    elif mode == "closure":
        patch_closure()
    else:
        raise SystemExit(f"unknown mode: {mode}")
