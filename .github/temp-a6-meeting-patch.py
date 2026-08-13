from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path.cwd()
MEETING = ROOT / "EngineData/Frontend/RustApp/src-tauri/src/commands/meeting_session.rs"


def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 anchor, found {count}")
    return text.replace(old, new, 1)


text = MEETING.read_text(encoding="utf-8")
text = once(
    text,
    '''    cancel_helper_bridge_meeting_session, get_helper_bridge_status,\n    prepare_required_outbound_ai_runtime, send_helper_worker_task, start_helper_bridge,\n    HelperBridgeWorkerResponse,\n''',
    '''    cancel_helper_bridge_meeting_session, get_helper_bridge_status,\n    prepare_required_outbound_ai_runtime, required_outbound_voice_actor_token,\n    send_helper_worker_task, start_helper_bridge, HelperBridgeWorkerResponse,\n''',
    "helper-import",
)
text = once(
    text,
    '''fn generation_is_live(generation: u64) -> bool {\n    if !runtime_generation_is_authoritative(generation) {\n        return false;\n    }\n    latest_runtime_session_state()\n        .snapshot\n        .map(|snapshot| snapshot.generation == generation && snapshot.phase == "live")\n        .unwrap_or(false)\n}\n''',
    '''fn generation_is_live(generation: u64) -> bool {\n    if !runtime_generation_is_authoritative(generation) {\n        return false;\n    }\n    latest_runtime_session_state()\n        .snapshot\n        .map(|snapshot| snapshot.generation == generation && snapshot.phase == "live")\n        .unwrap_or(false)\n}\n\nfn generation_is_starting(generation: u64) -> bool {\n    if !runtime_generation_is_authoritative(generation) {\n        return false;\n    }\n    latest_runtime_session_state()\n        .snapshot\n        .map(|snapshot| snapshot.generation == generation && snapshot.phase == "starting")\n        .unwrap_or(false)\n}\n''',
    "starting-authority-helper",
)

old_live = '''    let requested_tts_path = tts_output_path(session_id, generation, event_sequence);\n    let tts_started_at = Instant::now();\n    let tts = send_helper_worker_task(\n        "synthesize",\n        json!({\n            "text": translated_text.clone(),\n            "output_path": requested_tts_path,\n            "meeting_session_id": session_id,\n            "meeting_lane": "you",\n            "meeting_generation": generation,\n            "meeting_sequence": event_sequence,\n            "utterance_id": utterance_id,\n        }),\n    );\n'''
new_live = '''    let Some(actor_token) = required_outbound_voice_actor_token(generation) else {\n        let blocker = "voice_actor:meeting_actor_authority_missing".to_string();\n        let _ = update_committed_turn_delivery_state(\n            session_id,\n            generation,\n            utterance_id,\n            "output_failed",\n        );\n        update_outbound_status(\n            generation,\n            session_id,\n            "attention_needed",\n            event_sequence,\n            false,\n            false,\n            &blocker,\n            "My Voice authority is no longer bound to this Meeting generation. Stop and start Translation again before producing more voice output.",\n        );\n        return MeetingOutboundProcessResult {\n            ok: false,\n            delivered: false,\n            state: "tts_failed".to_string(),\n            blocker,\n            note: "No Meeting output was generated from this finalized segment.".to_string(),\n            generation,\n            utterance_sequence: event_sequence,\n            runtime_claim: "meeting_outbound_voice_actor_authority_missing".to_string(),\n        };\n    };\n    let requested_tts_path = tts_output_path(session_id, generation, event_sequence);\n    let tts_started_at = Instant::now();\n    let tts = send_helper_worker_task(\n        "voice_actor_synthesize",\n        json!({\n            "text": translated_text.clone(),\n            "output_path": requested_tts_path,\n            "expected_actor_token": actor_token,\n            "meeting_session_id": session_id,\n            "meeting_lane": "you",\n            "meeting_generation": generation,\n            "meeting_sequence": event_sequence,\n            "utterance_id": utterance_id,\n        }),\n    );\n'''
text = once(text, old_live, new_live, "live-myvoice")
text = once(text, '        let blocker = worker_blocker(&tts, "tts:missing_output");\n', '        let blocker = worker_blocker(&tts, "voice_actor:missing_output");\n', "live-blocker")
text = once(
    text,
    '            "Local TTS failed before Meeting delivery. No Meeting output was generated.",\n',
    '            "My Voice synthesis failed before Meeting delivery. No Meeting output was generated.",\n',
    "live-failure-copy",
)

text = once(
    text,
    '''    let preflight = build_preflight();\n''',
    '''    // Refresh cheap worker capability truth once for this explicit Start. This\n    // catches a newly approved/rebuilt My Voice without turning routine UI polling\n    // into worker I/O or model loading. Functional MyVoice proof still occurs only\n    // after the Meeting generation owns Starting authority.\n    let _ = send_helper_worker_task("status", json!({ "meeting_start_prepare": true }));\n    let preflight = build_preflight();\n''',
    "start-static-refresh",
)

old_pre_authority = '''    // Exercise the real required AI runtimes before Meeting authority, capture, or\n    // output resources are opened. A file/import-ready status alone must not commit\n    // the product Live if ASR, ID->EN translation, or English TTS cannot prepare.\n    if let Err(stage) = prepare_required_outbound_ai_runtime() {\n        return blocked_result(\n            "outbound_runtime_prepare_failed",\n            format!(\n                "Start Translation couldn't prepare {stage}. Check Setup or Diagnostics and try again."\n            ),\n        );\n    }\n\n    let prepared_preflight = build_preflight();\n    if !prepared_preflight.ready_for_start {\n        return MeetingSessionActionResult {\n            ok: false,\n            state: "blocked_after_runtime_prepare".to_string(),\n            message: "Start Translation prepared the local AI runtime, but current Meeting prerequisites are no longer ready. Check Setup and try again."\n                .to_string(),\n            status: status_from_report(latest_runtime_session_state(), prepared_preflight),\n        };\n    }\n\n'''
text = once(text, old_pre_authority, "", "remove-preauthority-functional-proof")
text = once(
    text,
    '''    let generation = start_snapshot.generation;\n    let session_id = start_snapshot.session_id.clone();\n    remember_start_preflight(generation, prepared_preflight.clone());\n    reset_committed_turns(&session_id);\n''',
    '''    let generation = start_snapshot.generation;\n    let session_id = start_snapshot.session_id.clone();\n    reset_committed_turns(&session_id);\n''',
    "delay-preflight-snapshot",
)

capture_block = '''    let capture = start_live_capture_runtime(starting.clone());\n    if !capture.ok {\n        let _ = revoke_runtime_session_authority(\n            generation,\n            "Start Translation failed while opening the required microphone resource. Authority was revoked before rollback.",\n        );\n        let _ = stop_live_capture_runtime();\n        let _ = stop_meeting_sound_capture_runtime();\n        clear_finalized_meeting_sequence();\n        clear_self_output_suppression_for_session(&session_id);\n        clear_committed_turns_for_session(&session_id);\n        clear_start_preflight_for_generation(generation);\n        clear_prepared_meeting_output_device();\n        let _ = clear_runtime_session_state();\n        return blocked_result(\n            "rolled_back",\n            format!(\n                "Start Translation was rolled back safely because the microphone resource could not be opened: {}",\n                capture.message\n            ),\n        );\n    }\n\n'''
ai_block = capture_block + '''    // A6 proves the real required AI path only after this generation owns Starting\n    // authority and the microphone stream is open. Every worker request is tied to\n    // this Meeting generation; My Voice is warm-loaded and a real English synthesis\n    // fixture must complete before native output or the outbound consumer can activate.\n    if let Err(stage) = prepare_required_outbound_ai_runtime(generation) {\n        let _ = revoke_runtime_session_authority(\n            generation,\n            "Required outbound AI/My Voice verification failed during Starting. Authority was revoked before rollback.",\n        );\n        let _ = stop_live_capture_runtime();\n        let _ = stop_meeting_sound_capture_runtime();\n        clear_finalized_meeting_sequence();\n        clear_self_output_suppression_for_session(&session_id);\n        clear_committed_turns_for_session(&session_id);\n        clear_start_preflight_for_generation(generation);\n        clear_prepared_meeting_output_device();\n        let _ = clear_runtime_session_state();\n        return blocked_result(\n            "rolled_back",\n            format!(\n                "Start Translation was rolled back before Live because {stage} could not be functionally verified for the authoritative Meeting generation."\n            ),\n        );\n    }\n    if !generation_is_starting(generation) {\n        let _ = stop_live_capture_runtime();\n        let _ = stop_meeting_sound_capture_runtime();\n        clear_finalized_meeting_sequence();\n        clear_self_output_suppression_for_session(&session_id);\n        clear_committed_turns_for_session(&session_id);\n        clear_start_preflight_for_generation(generation);\n        clear_prepared_meeting_output_device();\n        let _ = clear_runtime_session_state();\n        return blocked_result(\n            "rolled_back",\n            "Start Translation lost Starting authority while verifying the required local AI/My Voice path. No Meeting output was activated.".to_string(),\n        );\n    }\n\n    let ai_preflight = build_preflight();\n    if !ai_preflight.ready_for_start || required_outbound_voice_actor_token(generation).is_none() {\n        let _ = revoke_runtime_session_authority(\n            generation,\n            "Meeting prerequisites changed after required AI/My Voice verification. Authority was revoked before rollback.",\n        );\n        let _ = stop_live_capture_runtime();\n        let _ = stop_meeting_sound_capture_runtime();\n        clear_finalized_meeting_sequence();\n        clear_self_output_suppression_for_session(&session_id);\n        clear_committed_turns_for_session(&session_id);\n        clear_start_preflight_for_generation(generation);\n        clear_prepared_meeting_output_device();\n        let _ = clear_runtime_session_state();\n        return MeetingSessionActionResult {\n            ok: false,\n            state: "rolled_back".to_string(),\n            message: "Start Translation verified My Voice, but another required Meeting prerequisite changed before native output activation. All opened resources were rolled back.".to_string(),\n            status: status_from_report(latest_runtime_session_state(), ai_preflight),\n        };\n    }\n\n'''
text = once(text, capture_block, ai_block, "insert-generation-bound-ai")

commit_anchor = '''    let committed = commit_application_meeting_session_live(\n'''
final_gate = '''    // Re-check the full required preflight after the native output callback and\n    // serialized consumer both exist. A helper exit, actor invalidation, or other\n    // required prerequisite loss in the activation window must roll back rather than\n    // expose a transient Live state.\n    let prepared_preflight = build_preflight();\n    if !prepared_preflight.ready_for_start || required_outbound_voice_actor_token(generation).is_none() {\n        let _ = revoke_runtime_session_authority(\n            generation,\n            "Final pre-Live My Voice readiness changed after required resources opened. Authority was revoked before rollback.",\n        );\n        let _ = cancel_meeting_output_for_generation(generation);\n        let _ = stop_live_capture_runtime();\n        let _ = stop_meeting_sound_capture_runtime();\n        let helper_cancel = cancel_helper_bridge_meeting_session(&session_id);\n        let consumer_cleanup = stop_meeting_outbound_consumer(generation);\n        clear_finalized_meeting_sequence();\n        clear_self_output_suppression_for_session(&session_id);\n        clear_committed_turns_for_session(&session_id);\n        clear_start_preflight_for_generation(generation);\n        clear_prepared_meeting_output_device();\n        let _ = clear_runtime_session_state();\n        return blocked_result(\n            "rolled_back",\n            format!(\n                "Start Translation rolled back before Live because final My Voice readiness changed after native resources opened. Helper cleanup: {} Consumer cleanup: {}",\n                helper_cancel.message, consumer_cleanup.message\n            ),\n        );\n    }\n    remember_start_preflight(generation, prepared_preflight.clone());\n\n'''
text = once(text, commit_anchor, final_gate + commit_anchor, "final-prelive-gate")
text = once(
    text,
    '        "Required microphone, functional native Meeting output callback, and serialized outbound consumer were ready before the authoritative generation committed Live.",\n',
    '        "Required microphone, generation-bound ASR/translation/My Voice functional proof, native Meeting output callback, and serialized outbound consumer were ready before the authoritative generation committed Live.",\n',
    "live-commit-note",
)
text = once(
    text,
    '            "Translation Live committed with authoritative outbound capture/consumer. {incoming_message}"\n',
    '            "Translation Live committed with authoritative My Voice outbound capture/consumer. {incoming_message}"\n',
    "live-message",
)

MEETING.write_text(text, encoding="utf-8", newline="\n")
subprocess.run(["git", "diff", "--check", "--", str(MEETING.relative_to(ROOT))], check=True)
final = MEETING.read_text(encoding="utf-8")
if 'send_helper_worker_task(\n        "synthesize"' in final:
    raise RuntimeError("Meeting still invokes legacy synthesize")
if '"voice_actor_synthesize"' not in final or '"expected_actor_token": actor_token' not in final:
    raise RuntimeError("Meeting does not bind live synthesis to Start-proven actor")
start = final.index("pub fn start_meeting_translation")
capture = final.index("start_live_capture_runtime(starting.clone())", start)
ai = final.index("prepare_required_outbound_ai_runtime(generation)", capture)
native = final.index("probe_prepared_meeting_output_device_functionally", ai)
consumer = final.index("start_meeting_outbound_consumer", native)
commit = final.index("commit_application_meeting_session_live", consumer)
if not (capture < ai < native < consumer < commit):
    raise RuntimeError("A6 Start ordering is not atomic")
print("A6_MEETING_PATCH=PASS")
