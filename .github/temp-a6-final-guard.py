from __future__ import annotations

import json
from pathlib import Path

ROOT = Path.cwd()
WORKER = ROOT / "EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py"
MANIFEST = ROOT / "EngineData/Backend/LocalWorker/WorkerRuntime/model_manifest.json"
HELPER = ROOT / "EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge.rs"
HELPER_RUNTIME = ROOT / "EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge_runtime.rs"
MEETING = ROOT / "EngineData/Frontend/RustApp/src-tauri/src/commands/meeting_session.rs"
RUNTIME_COMMAND = ROOT / "EngineData/Frontend/RustApp/src-tauri/src/commands/runtime.rs"
FACADE = ROOT / "EngineData/Frontend/RustApp/src/app/bridge/runtimeProductFacade.ts"
NEXT_ACTION = ROOT / "docs/knowledge/next-action.md"

worker = WORKER.read_text(encoding="utf-8")
manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
helper = HELPER.read_text(encoding="utf-8")
helper_runtime = HELPER_RUNTIME.read_text(encoding="utf-8")
meeting = MEETING.read_text(encoding="utf-8")
runtime_command = RUNTIME_COMMAND.read_text(encoding="utf-8")
facade = FACADE.read_text(encoding="utf-8")
next_action = NEXT_ACTION.read_text(encoding="utf-8")

# One daily custom-TTS authority: trained MyVoice through GPT-SoVITS.
if '"voice_actor_preflight": handle_voice_actor_preflight' not in worker:
    raise RuntimeError("voice_actor_preflight is not registered")
if '"voice_actor_synthesize": handle_voice_actor_synthesize' not in worker:
    raise RuntimeError("voice_actor_synthesize is not registered")
for forbidden in ('"tts_preflight":', '"synthesize": handle_synthesize', 'PIPER_ROOT', 'windows-sapi'):
    if forbidden in worker:
        raise RuntimeError(f"legacy daily TTS authority remains: {forbidden}")
if '"voice_actor_tts": voice_actor_ready' not in worker:
    raise RuntimeError("worker provider readiness is not bound to MyVoice")
if 'expected_actor_token' not in worker or 'actor_changed_since_meeting_start' not in worker:
    raise RuntimeError("worker actor identity enforcement is incomplete")
if any(item.get("model_id") == "piper" for item in manifest.get("models", [])):
    raise RuntimeError("Piper remains in canonical release inventory")

# Same helper owns setup diagnostics and generation-bound Meeting functional proof.
if 'pub fn verify_required_outbound_ai_runtime()' not in helper:
    raise RuntimeError("diagnostic functional MyVoice probe missing")
if 'pub fn prepare_required_outbound_ai_runtime(meeting_generation: u64)' not in helper:
    raise RuntimeError("generation-bound Meeting MyVoice probe missing")
if 'meeting_generation: 0' not in helper:
    raise RuntimeError("diagnostic readiness scope is not explicit")
if 'if generation_token == 0 || actor_token.is_empty()' not in helper:
    raise RuntimeError("diagnostic readiness cannot be stored")
if 'if meeting_generation == 0 || !runtime_generation_is_authoritative(meeting_generation)' not in helper:
    raise RuntimeError("live actor retrieval does not reject diagnostic scope")
if '"voice_actor_tts"' not in helper_runtime:
    raise RuntimeError("helper runtime still reads legacy TTS readiness")
if '"voice_actor_preflight"' not in helper_runtime or '"voice_actor_synthesize"' not in helper_runtime:
    raise RuntimeError("helper scheduler deadlines do not know MyVoice tasks")

# Meeting live output must use the actor proven during the same Start generation.
if 'required_outbound_voice_actor_token(generation)' not in meeting:
    raise RuntimeError("Meeting live actor authority lookup missing")
if '"voice_actor_synthesize"' not in meeting:
    raise RuntimeError("Meeting live output does not call trained actor synthesis")
if '"expected_actor_token": actor_token' not in meeting:
    raise RuntimeError("Meeting live output is not pinned to Start-proven actor")
if 'send_helper_worker_task(\n        "synthesize"' in meeting:
    raise RuntimeError("Meeting still invokes legacy synthesis")

# C5 ordering is retained and A6 functional proof is inserted after authoritative
# Starting + microphone but before native output, consumer, and Live commit.
start = meeting.index("pub fn start_meeting_translation")
begin = meeting.index("begin_application_meeting_session()", start)
capture = meeting.index("start_live_capture_runtime(starting.clone())", begin)
ai = meeting.index("prepare_required_outbound_ai_runtime(generation)", capture)
native = meeting.index("probe_prepared_meeting_output_device_functionally", ai)
consumer = meeting.index("start_meeting_outbound_consumer", native)
final_preflight = meeting.index("Final pre-Live My Voice readiness", consumer)
commit = meeting.index("commit_application_meeting_session_live", final_preflight)
if not (begin < capture < ai < native < consumer < final_preflight < commit):
    raise RuntimeError("A6 Start ordering is not atomic")
if 'if !preflight.start_eligible' not in meeting[start:begin]:
    raise RuntimeError("Start does not separate cheap eligibility from functional proof")

# Direct consumers are reconciled rather than supplied compatibility aliases.
if 'helper_bridge::verify_required_outbound_ai_runtime()' not in runtime_command:
    raise RuntimeError("setup/diagnostic caller does not use diagnostic MyVoice probe")
if 'readiness.voice_actor_tts === true' not in facade:
    raise RuntimeError("frontend product facade still projects legacy TTS readiness")

# Canonical state remains A6-in-progress until this proof is accepted.
if "VoiceLab A6" not in next_action or "Meeting Atomic Custom-TTS Readiness" not in next_action:
    raise RuntimeError("canonical next action moved before A6 proof acceptance")

print("A6_FINAL_STATIC_GUARD=PASS")
