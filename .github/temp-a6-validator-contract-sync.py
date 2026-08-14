from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT = Path.cwd()
VALIDATOR = ROOT / "EngineData/Frontend/RustApp/scripts/validate_startup_runtime_readiness.mjs"
APP = ROOT / "EngineData/Frontend/RustApp"
EXPECTED = ["EngineData/Frontend/RustApp/scripts/validate_startup_runtime_readiness.mjs"]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one anchor, found {count}")
    return text.replace(old, new, 1)


def regex_once(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one block, found {count}")
    return updated


text = VALIDATOR.read_text(encoding="utf-8")

text = replace_once(
    text,
    '  "functional native Meeting output callback",\n',
    '  "generation-bound ASR/translation/My Voice functional proof",\n',
    "c5-a6-live-marker",
)

text = replace_once(
    text,
    '''const c5Order = [\n  "begin_application_meeting_session()",\n  "start_live_capture_runtime(starting.clone())",\n  "probe_prepared_meeting_output_device_functionally(output_device, generation)",\n  "start_meeting_outbound_consumer(generation, &session_id)",\n  "commit_application_meeting_session_live(",\n].map((marker) => c5Start.indexOf(marker));\nif (c5Order.some((index) => index < 0) || c5Order.some((index, i) => i > 0 && index <= c5Order[i - 1])) {\n  throw new Error(`C5 Start ordering is not authority -> microphone -> output probe -> outbound consumer -> Live: ${c5Order.join(",")}`);\n}\n''',
    '''const c5Order = [\n  "begin_application_meeting_session()",\n  "start_live_capture_runtime(starting.clone())",\n  "prepare_required_outbound_ai_runtime(generation)",\n  "probe_prepared_meeting_output_device_functionally(output_device, generation)",\n  "start_meeting_outbound_consumer(generation, &session_id)",\n  "commit_application_meeting_session_live(",\n].map((marker) => c5Start.indexOf(marker));\nif (c5Order.some((index) => index < 0) || c5Order.some((index, i) => i > 0 && index <= c5Order[i - 1])) {\n  throw new Error(`A6 Start ordering is not authority -> microphone -> MyVoice proof -> output probe -> outbound consumer -> Live: ${c5Order.join(",")}`);\n}\n''',
    "a6-start-order",
)

text = regex_once(
    text,
    r'requireMarkers\(source\.helperBridge, "C4 generation-bound functional ASR/translation/TTS readiness", \[.*?\n\]\);',
    '''requireMarkers(source.helperBridge, "A6 generation-bound functional ASR/translation/MyVoice readiness", [\n  "RequiredOutboundFunctionalReadiness",\n  "meeting_generation: u64",\n  "actor_token: String",\n  "required_outbound_functional_readiness_verified_unix_ms",\n  "decorate_functional_readiness_status",\n  "functional_voice_actor_output_path",\n  "functional_asr_output",\n  "run_required_outbound_ai_probe(",\n  '\"voice_actor_preflight\"',\n  '\"voice_actor_synthesize\"',\n  '\"expected_actor_token\"',\n  '\"transcribe\"',\n  '\"language\": \"en\"',\n  '\"vad_filter\": false',\n  "remember_required_outbound_functional_readiness",\n  "required_outbound_voice_actor_token",\n]);''',
    "a6-functional-readiness",
)

text = replace_once(
    text,
    '  "helper_bridge::prepare_required_outbound_ai_runtime()",\n',
    '  "helper_bridge::verify_required_outbound_ai_runtime()",\n',
    "diagnostic-readiness-owner",
)

text = regex_once(
    text,
    r'requireMarkers\(source\.helperBridge, "C3 generation-bound functional outbound AI readiness", \[.*?\n\]\);',
    '''requireMarkers(source.helperBridge, "A6 diagnostic and Meeting functional outbound identity", [\n  "fn meeting_start_prepare",\n  "run_required_outbound_ai_probe(",\n  "verify_required_outbound_ai_runtime()",\n  "prepare_required_outbound_ai_runtime(meeting_generation: u64)",\n  "HelperTaskPriority::MeetingOutbound",\n  "REQUIRED_OUTBOUND_FUNCTIONAL_ID_FIXTURE",\n  "REQUIRED_OUTBOUND_FUNCTIONAL_VOICE_OUTPUT",\n  "REQUIRED_OUTBOUND_DIAGNOSTIC_VOICE_OUTPUT",\n  "RequiredOutboundFunctionalReadiness",\n  "meeting_generation: u64",\n  "actor_token: String",\n  "remember_required_outbound_functional_readiness(generation_token, 0, actor_token);",\n  "invalidate_required_outbound_ai_readiness",\n  '\"voice_actor_preflight\"',\n  '\"voice_actor_synthesize\"',\n  '\"expected_actor_token\"',\n  "functional_voice_actor_output_path",\n  "fs::metadata",\n]);''',
    "a6-replaces-c3",
)

text = regex_once(
    text,
    r'requireMarkers\(source\.helperBridge, "Meeting outbound helper priority continuity", \[.*?\n\]\);',
    '''requireMarkers(source.helperBridge, "Meeting outbound helper priority continuity", [\n  "MEETING_OUTBOUND_PIPELINE_GENERATION",\n  "meeting_outbound_pipeline_active",\n  "incoming_deferred_response",\n  "send_worker_task_inner",\n  "incoming-deferred-before-scheduler",\n  'task == \"voice_actor_synthesize\"',\n  "clear_meeting_outbound_pipeline",\n]);''',
    "a6-pipeline-terminal-stage",
)

text = regex_once(
    text,
    r'requireMarkers\(source\.helperBridgeRuntime, "required outbound readiness invalidation", \[.*?\n\]\);',
    '''requireMarkers(source.helperBridgeRuntime, "required outbound MyVoice readiness invalidation", [\n  "required_outbound_prepare_failed",\n  "runtime.provider_ready = false",\n  'stage == \"asr_preload\"',\n  'stage == \"voice_actor_preflight\"',\n  "hard_voice_actor_failure",\n  'stage == \"voice_actor_synthesize\"',\n  'Some(\"id->en\")',\n]);''',
    "a6-runtime-invalidation",
)

text = regex_once(
    text,
    r'requireMarkers\(source\.meetingSession, "Meeting outbound Start hardening", \[.*?\n\]\);',
    '''requireMarkers(source.meetingSession, "A6 Meeting outbound Start hardening", [\n  "prepare_required_outbound_ai_runtime(generation)",\n  "Required outbound AI/My Voice verification failed during Starting",\n  "required_outbound_voice_actor_token(generation)",\n  "Final pre-Live My Voice readiness changed",\n  "Translation Live is listening. Rolling audio remains preview-only; finalized utterances receive shared Meeting event sequence before AI.",\n]);''',
    "a6-meeting-start-hardening",
)

VALIDATOR.write_text(text, encoding="utf-8", newline="\n")

subprocess.run(["git", "diff", "--check"], cwd=ROOT, check=True)
subprocess.run(["node", "scripts/validate_startup_runtime_readiness.mjs"], cwd=APP, check=True)
subprocess.run(["git", "add", "--", *EXPECTED], cwd=ROOT, check=True)
staged = subprocess.check_output(["git", "diff", "--cached", "--name-only"], cwd=ROOT, text=True).splitlines()
if staged != EXPECTED:
    raise RuntimeError(f"unexpected staged files: {staged!r}")
subprocess.run(["git", "config", "user.name", "TranslateIT Source Proof"], cwd=ROOT, check=True)
subprocess.run(["git", "config", "user.email", "actions@users.noreply.github.com"], cwd=ROOT, check=True)
subprocess.run(["git", "commit", "-m", "Sync startup validator with A6 MyVoice authority"], cwd=ROOT, check=True)
subprocess.run(["git", "push", "origin", "HEAD:New"], cwd=ROOT, check=True)
print("A6_VALIDATOR_CONTRACT_SYNC=PASS")
