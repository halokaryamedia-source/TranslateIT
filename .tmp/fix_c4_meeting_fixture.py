from pathlib import Path

path = Path('EngineData/Frontend/RustApp/src-tauri/src/commands/meeting_session.rs')
text = path.read_text(encoding='utf-8')
old = '''        MeetingSessionPreflightStatus {\n            ready_for_start: true,\n            microphone_ready: true,'''
new = '''        MeetingSessionPreflightStatus {\n            ready_for_start: true,\n            start_eligible: true,\n            functional_outbound_ready: true,\n            functional_outbound_verified_unix_ms: Some(1),\n            microphone_ready: true,'''
if text.count(old) != 1:
    raise SystemExit(f'Expected one B3 ready preflight fixture, found {text.count(old)}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('C4 Meeting preflight fixture updated')
