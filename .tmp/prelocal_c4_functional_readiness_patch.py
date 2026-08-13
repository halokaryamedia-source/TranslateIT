from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def write(rel: str, text: str) -> None:
    (ROOT / rel).write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


def replace_section(text: str, start: str, end: str, replacement: str, label: str) -> str:
    start_index = text.find(start)
    if start_index < 0:
        raise RuntimeError(f"{label}: start marker not found")
    end_index = text.find(end, start_index)
    if end_index < 0:
        raise RuntimeError(f"{label}: end marker not found")
    return text[:start_index] + replacement + text[end_index:]


HELPER_RUNTIME = "EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge_runtime.rs"
HELPER = "EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge.rs"
MEETING = "EngineData/Frontend/RustApp/src-tauri/src/commands/meeting_session.rs"
RUNTIME = "EngineData/Frontend/RustApp/src-tauri/src/commands/runtime.rs"
REGISTRY = "EngineData/Frontend/RustApp/src-tauri/src/commands/registry.rs"
RUNTIME_API = "EngineData/Frontend/RustApp/src/app/bridge/runtimeApi.ts"
TYPES = "EngineData/Frontend/RustApp/src/app/shared/types.ts"
FACADE = "EngineData/Frontend/RustApp/src/app/bridge/runtimeProductFacade.ts"
FIRST_SETUP = "EngineData/Frontend/RustApp/src/pages/FirstSetup.svelte"
MEETING_UI = "EngineData/Frontend/RustApp/src/pages/Meeting.svelte"
VALIDATOR = "EngineData/Frontend/RustApp/scripts/validate_startup_runtime_readiness.mjs"
CONTEXT = "CONTEXT.md"
OWNERSHIP = "docs/knowledge/source-ownership.md"
NEXT_ACTION = "docs/knowledge/next-action.md"

# 1) Public helper status carries generation-bound functional truth, but the runtime
# process struct stays the single lifecycle owner. The functional cache remains in
# helper_bridge.rs.
text = read(HELPER_RUNTIME)
text = replace_once(
    text,
    """    pub provider_ready: bool,\n    pub degraded_mode: bool,""",
    """    pub provider_ready: bool,\n    pub functional_outbound_ready: bool,\n    pub functional_outbound_verified_unix_ms: Option<u128>,\n    pub degraded_mode: bool,""",
    "helper status fields",
)
text = replace_once(
    text,
    """        provider_ready: runtime.provider_ready,\n        degraded_mode: runtime.degraded_mode,""",
    """        provider_ready: runtime.provider_ready,\n        functional_outbound_ready: false,\n        functional_outbound_verified_unix_ms: None,\n        degraded_mode: runtime.degraded_mode,""",
    "helper status projection defaults",
)
write(HELPER_RUNTIME, text)

# 2) C4 reuses the C3 functional TTS WAV for real ASR inference before deleting it.
# The cache is surfaced only when it matches the current helper generation.
text = read(HELPER)
old_cache = '''fn required_outbound_functional_readiness_cached(generation_token: u64) -> bool {\n    if generation_token == 0 {\n        return false;\n    }\n    required_outbound_functional_readiness_store()\n        .lock()\n        .ok()\n        .and_then(|guard| guard.as_ref().cloned())\n        .map(|cached| cached.generation_token == generation_token && cached.verified_unix_ms > 0)\n        .unwrap_or(false)\n}\n'''
new_cache = '''fn required_outbound_functional_readiness_verified_unix_ms(\n    generation_token: u64,\n) -> Option<u128> {\n    if generation_token == 0 {\n        return None;\n    }\n    required_outbound_functional_readiness_store()\n        .lock()\n        .ok()\n        .and_then(|guard| guard.as_ref().cloned())\n        .filter(|cached| cached.generation_token == generation_token && cached.verified_unix_ms > 0)\n        .map(|cached| cached.verified_unix_ms)\n}\n\nfn required_outbound_functional_readiness_cached(generation_token: u64) -> bool {\n    required_outbound_functional_readiness_verified_unix_ms(generation_token).is_some()\n}\n\nfn decorate_functional_readiness_status(mut status: HelperBridgeStatus) -> HelperBridgeStatus {\n    let verified_unix_ms =\n        required_outbound_functional_readiness_verified_unix_ms(status.generation_token);\n    status.functional_outbound_ready = status.state == \"ready\"\n        && status.provider_ready\n        && verified_unix_ms.is_some();\n    status.functional_outbound_verified_unix_ms = verified_unix_ms;\n    status\n}\n'''
text = replace_once(text, old_cache, new_cache, "functional cache projection")
old_tts = '''fn consume_functional_tts_output(response: &HelperBridgeWorkerResponse) -> bool {\n    let value = worker_response_value(response);\n    let output_path = worker_text(&value, \"output_path\");\n    let file_ready = output_path\n        .as_deref()\n        .and_then(|path| fs::metadata(path).ok())\n        .map(|metadata| metadata.is_file() && metadata.len() > 44)\n        .unwrap_or(false);\n    if let Some(path) = output_path {\n        let _ = fs::remove_file(path);\n    }\n    response.ok && file_ready\n}\n'''
new_tts = '''fn functional_tts_output_path(response: &HelperBridgeWorkerResponse) -> Option<String> {\n    let value = worker_response_value(response);\n    let output_path = worker_text(&value, \"output_path\")?;\n    let file_ready = fs::metadata(&output_path)\n        .map(|metadata| metadata.is_file() && metadata.len() > 44)\n        .unwrap_or(false);\n    if response.ok && file_ready {\n        Some(output_path)\n    } else {\n        let _ = fs::remove_file(&output_path);\n        None\n    }\n}\n\nfn functional_asr_output(response: &HelperBridgeWorkerResponse) -> bool {\n    if !response.ok {\n        return false;\n    }\n    let value = worker_response_value(response);\n    value.get(\"stage\").and_then(Value::as_str) == Some(\"transcribe\")\n        && worker_text(&value, \"transcript_text\").is_some()\n}\n'''
text = replace_once(text, old_tts, new_tts, "functional TTS/ASR helpers")

prepare_start = text.index("pub fn prepare_required_outbound_ai_runtime() -> Result<(), &'static str> {")
prepare_end = text.index("#[tauri::command]\npub fn get_helper_bridge_status()", prepare_start)
new_prepare = '''pub fn prepare_required_outbound_ai_runtime() -> Result<(), &'static str> {\n    let helper = get_helper_bridge_status();\n    if helper.state != \"ready\" || !helper.provider_ready || helper.generation_token == 0 {\n        invalidate_required_outbound_ai_readiness();\n        return Err(\"local translation runtime\");\n    }\n    let generation_token = helper.generation_token;\n    if required_outbound_functional_readiness_cached(generation_token) {\n        return Ok(());\n    }\n\n    // Load the canonical ASR runtime first so a model/device failure stops the bounded\n    // self-test before translation/TTS work. C4 still requires a real transcribe call\n    // below before this worker generation may be marked functionally ready.\n    let asr = send_worker_task(\"asr_preload\", json!({ \"meeting_start_prepare\": true }));\n    if !asr.ok {\n        invalidate_required_outbound_ai_readiness();\n        return Err(\"speech recognition\");\n    }\n\n    // Exercise the real ID -> EN model with a fixed non-user fixture. Do not compare\n    // exact wording; readiness requires non-empty output plus the worker's canonical\n    // EOS-completion truth.\n    let translation = send_worker_task(\n        \"translate\",\n        json!({\n            \"text\": REQUIRED_OUTBOUND_FUNCTIONAL_ID_FIXTURE,\n            \"source_language\": \"id\",\n            \"target_language\": \"en\",\n            \"max_new_tokens\": 24,\n            \"meeting_start_prepare\": true,\n        }),\n    );\n    let Some(translated_fixture) = functional_translation_output(&translation) else {\n        invalidate_required_outbound_ai_readiness();\n        return Err(\"Indonesian to English translation\");\n    };\n\n    // Synthesize the actual functional translation result, then reuse that temporary\n    // English speech WAV as the bounded ASR inference fixture. This proves the ASR\n    // execution path without introducing a repository binary fixture. C4 checks only\n    // non-empty inference capability here; ASR language/quality accuracy remains\n    // target-runtime evidence.\n    let tts = send_worker_task(\n        \"synthesize\",\n        json!({\n            \"text\": translated_fixture,\n            \"output_path\": REQUIRED_OUTBOUND_FUNCTIONAL_TTS_OUTPUT,\n            \"meeting_start_prepare\": true,\n        }),\n    );\n    let Some(functional_tts_path) = functional_tts_output_path(&tts) else {\n        invalidate_required_outbound_ai_readiness();\n        return Err(\"English voice output\");\n    };\n\n    let asr_inference = send_worker_task(\n        \"transcribe\",\n        json!({\n            \"audio_path\": functional_tts_path,\n            \"language\": \"en\",\n            \"beam_size\": 1,\n            \"vad_filter\": false,\n            \"meeting_start_prepare\": true,\n        }),\n    );\n    let functional_tts_path = worker_response_value(&tts)\n        .get(\"output_path\")\n        .and_then(Value::as_str)\n        .map(str::to_string);\n    if let Some(path) = functional_tts_path.as_deref() {\n        let _ = fs::remove_file(path);\n    }\n    if !functional_asr_output(&asr_inference) {\n        invalidate_required_outbound_ai_readiness();\n        return Err(\"speech recognition\");\n    }\n\n    // Re-read capability truth only after all three required execution stages. A\n    // worker replaced during the self-test cannot donate readiness to the new\n    // generation.\n    let status = send_worker_task(\"status\", json!({ \"meeting_start_prepare\": true }));\n    if !status.ok {\n        invalidate_required_outbound_ai_readiness();\n        return Err(\"local translation runtime\");\n    }\n    let current = get_helper_bridge_status();\n    if current.state != \"ready\"\n        || !current.provider_ready\n        || current.generation_token != generation_token\n    {\n        invalidate_required_outbound_ai_readiness();\n        return Err(\"local translation runtime\");\n    }\n\n    remember_required_outbound_functional_readiness(generation_token);\n    Ok(())\n}\n\n'''
text = text[:prepare_start] + new_prepare + text[prepare_end:]
text = replace_once(
    text,
    """            let result = status_from_runtime(&runtime);""",
    """            let result = decorate_functional_readiness_status(status_from_runtime(&runtime));""",
    "helper public status decoration",
)
text = replace_once(
    text,
    """                provider_ready: false,\n                degraded_mode: false,""",
    """                provider_ready: false,\n                functional_outbound_ready: false,\n                functional_outbound_verified_unix_ms: None,\n                degraded_mode: false,""",
    "helper error status functional fields",
)
text = replace_once(
    text,
    """mod c3_functional_readiness_tests {\n    use super::{\n        failed_required_outbound_task_invalidates_cache, functional_translation_output,\n        HelperBridgeWorkerResponse, RequiredOutboundFunctionalReadiness,\n    };""",
    """mod c4_functional_readiness_tests {\n    use super::{\n        failed_required_outbound_task_invalidates_cache, functional_asr_output,\n        functional_translation_output, HelperBridgeWorkerResponse,\n        RequiredOutboundFunctionalReadiness,\n    };""",
    "C4 test module rename/import",
)
insert_after = '''    #[test]\n    fn functional_translation_requires_id_en_complete_eos_output() {\n        let complete = response(\n            true,\n            r#\"{\\\"ok\\\":true,\\\"direction_pair\\\":\\\"id->en\\\",\\\"complete\\\":true,\\\"finished_with_eos\\\":true,\\\"translated_text\\\":\\\"good morning\\\"}\"#,\n        );\n        assert_eq!(\n            functional_translation_output(&complete).as_deref(),\n            Some(\"good morning\")\n        );\n\n        let incomplete = response(\n            true,\n            r#\"{\\\"ok\\\":true,\\\"direction_pair\\\":\\\"id->en\\\",\\\"complete\\\":false,\\\"finished_with_eos\\\":false,\\\"translated_text\\\":\\\"partial\\\"}\"#,\n        );\n        assert!(functional_translation_output(&incomplete).is_none());\n    }\n'''
if insert_after not in text:
    raise RuntimeError("C4 ASR test insertion anchor missing")
text = text.replace(
    insert_after,
    insert_after
    + '''\n    #[test]\n    fn functional_asr_requires_real_nonempty_transcribe_output() {\n        let complete = response(\n            true,\n            r#\"{\\\"ok\\\":true,\\\"stage\\\":\\\"transcribe\\\",\\\"transcript_text\\\":\\\"good morning\\\"}\"#,\n        );\n        assert!(functional_asr_output(&complete));\n\n        let empty = response(\n            false,\n            r#\"{\\\"ok\\\":false,\\\"stage\\\":\\\"transcribe\\\",\\\"blocker\\\":\\\"asr:empty_transcript\\\"}\"#,\n        );\n        assert!(!functional_asr_output(&empty));\n    }\n''',
    1,
)
write(HELPER, text)

# 3) Meeting preflight distinguishes cheap Start eligibility from functional Ready.
text = read(MEETING)
text = replace_once(
    text,
    """pub struct MeetingSessionPreflightStatus {\n    pub ready_for_start: bool,""",
    """pub struct MeetingSessionPreflightStatus {\n    pub ready_for_start: bool,\n    pub start_eligible: bool,\n    pub functional_outbound_ready: bool,\n    pub functional_outbound_verified_unix_ms: Option<u128>,""",
    "meeting preflight C4 fields",
)
start_marker = "fn meeting_required_ai_ready(helper_ready: bool, provider_ready: bool) -> bool {"
end_marker = "fn status_from_report("
new_preflight = '''fn meeting_required_ai_ready(helper_ready: bool, provider_ready: bool) -> bool {\n    helper_ready && provider_ready\n}\n\nfn meeting_start_ai_eligible(helper_ready: bool, provider_ready: bool) -> bool {\n    helper_ready && provider_ready\n}\n\nfn build_preflight() -> MeetingSessionPreflightStatus {\n    let input = get_input_status();\n    let helper = get_helper_bridge_status();\n    let route = get_virtual_mic_route_selection();\n\n    let microphone_ready = input.prepared;\n    let helper_ready = helper.state == \"ready\";\n    let provider_ready = helper.provider_ready;\n    let functional_outbound_ready = helper.functional_outbound_ready;\n    let functional_outbound_verified_unix_ms = helper.functional_outbound_verified_unix_ms;\n    // `models_ready` remains the inexpensive required outbound capability view. C4\n    // keeps functional truth separate so routine status stays cheap and Start can run\n    // the bounded self-test only when needed.\n    let models_ready = meeting_required_ai_ready(helper_ready, provider_ready);\n    let meeting_route_ready = route.route_ready;\n    let generation_aware_outbound_stages_ready = generation_aware_outbound_stages_ready();\n    let finalized_utterance_source_connected = finalized_utterance_source_connected();\n    let outbound_runtime_connected = application_outbound_runtime_connected();\n\n    let mut start_blockers = Vec::new();\n    if !microphone_ready {\n        start_blockers.push(\"meeting_session:microphone_not_ready\".to_string());\n    }\n    if !meeting_start_ai_eligible(helper_ready, provider_ready) {\n        start_blockers.push(\"meeting_session:local_runtime_not_ready\".to_string());\n    }\n    if !meeting_route_ready {\n        start_blockers.push(if route.blocker.is_empty() {\n            \"meeting_session:meeting_microphone_route_not_ready\".to_string()\n        } else {\n            route.blocker.clone()\n        });\n    }\n    if !generation_aware_outbound_stages_ready {\n        start_blockers.push(\"meeting_session:generation_aware_outbound_stages_not_ready\".to_string());\n    }\n    if !finalized_utterance_source_connected {\n        start_blockers.push(\"meeting_session:finalized_utterance_source_not_connected\".to_string());\n    }\n    if !outbound_runtime_connected {\n        start_blockers.push(\"meeting_session:continuous_outbound_runtime_not_connected\".to_string());\n    }\n    start_blockers.sort();\n    start_blockers.dedup();\n\n    let start_eligible = start_blockers.is_empty();\n    let ready_for_start = start_eligible && functional_outbound_ready;\n    let mut blockers = start_blockers;\n    if start_eligible && !functional_outbound_ready {\n        blockers.push(\"meeting_session:functional_outbound_not_verified\".to_string());\n    }\n\n    MeetingSessionPreflightStatus {\n        ready_for_start,\n        start_eligible,\n        functional_outbound_ready,\n        functional_outbound_verified_unix_ms,\n        microphone_ready,\n        models_ready,\n        helper_ready,\n        provider_ready,\n        meeting_route_ready,\n        generation_aware_outbound_stages_ready,\n        finalized_utterance_source_connected,\n        outbound_runtime_connected,\n        blockers,\n        summary: if ready_for_start {\n            \"Required outbound Meeting capabilities are functionally verified for the current local worker and current preflight prerequisites are ready. Incoming Meeting Sound remains optional/degradable.\"\n                .to_string()\n        } else if start_eligible {\n            \"Required Meeting setup is available. A bounded local translation check must complete before Translation can become Live.\"\n                .to_string()\n        } else {\n            \"Start Translation remains blocked until all required current outbound Meeting prerequisites are available.\"\n                .to_string()\n        },\n        runtime_claim: \"meeting_start_preflight_source_contract_not_windows_runtime_proof\"\n            .to_string(),\n    }\n}\n\n'''
text = replace_section(text, start_marker, end_marker, new_preflight, "meeting preflight section")
text = replace_once(
    text,
    """    if !preflight.ready_for_start {\n        return MeetingSessionActionResult {""",
    """    if !preflight.start_eligible {\n        return MeetingSessionActionResult {""",
    "Meeting initial Start eligibility",
)
text += '''\n\n#[cfg(test)]\nmod c4_functional_preflight_tests {\n    use super::{meeting_required_ai_ready, meeting_start_ai_eligible};\n\n    #[test]\n    fn static_prerequisites_can_be_start_eligible_before_functional_ready() {\n        assert!(meeting_start_ai_eligible(true, true));\n        assert!(meeting_required_ai_ready(true, true));\n        assert!(!meeting_start_ai_eligible(true, false));\n        assert!(!meeting_required_ai_ready(false, true));\n    }\n}\n'''
write(MEETING, text)

# 4) Explicit setup verification lives on the existing guarded Rust runtime command
# boundary and never runs during an active Meeting/Mic Test.
text = read(RUNTIME)
anchor = '''#[tauri::command]\npub fn start_meeting_translation() -> MeetingSessionActionResult {'''
command = '''#[tauri::command]\npub fn verify_required_outbound_ai_readiness() -> HelperBridgeActionResult {\n    let runtime_state = latest_runtime_session_state();\n    if runtime_state.has_active_session {\n        let helper = helper_bridge::get_helper_bridge_status();\n        return HelperBridgeActionResult {\n            ok: false,\n            state: \"active_runtime_session\".to_string(),\n            message: \"Finish the current Meeting or Mic Test before running the local translation check.\"\n                .to_string(),\n            generation_token: helper.generation_token,\n            runtime_claim: \"functional_readiness_check_deferred_until_runtime_session_stop\"\n                .to_string(),\n        };\n    }\n\n    let mut helper = helper_bridge::get_helper_bridge_status();\n    if matches!(helper.state.as_str(), \"not_started\" | \"stopped\") {\n        let started = helper_bridge::start_helper_bridge();\n        if !started.ok {\n            return started;\n        }\n        helper = helper_bridge::get_helper_bridge_status();\n    }\n    if helper.state != \"ready\" {\n        return HelperBridgeActionResult {\n            ok: false,\n            state: helper.state,\n            message: \"The local translator is not available for the final readiness check.\"\n                .to_string(),\n            generation_token: helper.generation_token,\n            runtime_claim: \"functional_readiness_check_helper_not_ready\".to_string(),\n        };\n    }\n\n    if let Err(stage) = helper_bridge::prepare_required_outbound_ai_runtime() {\n        let current = helper_bridge::get_helper_bridge_status();\n        return HelperBridgeActionResult {\n            ok: false,\n            state: \"blocked\".to_string(),\n            message: format!(\n                \"The final local translation check could not complete at {stage}. Check Diagnostics and try again.\"\n            ),\n            generation_token: current.generation_token,\n            runtime_claim: \"functional_readiness_check_failed\".to_string(),\n        };\n    }\n\n    let current = helper_bridge::get_helper_bridge_status();\n    HelperBridgeActionResult {\n        ok: current.functional_outbound_ready,\n        state: if current.functional_outbound_ready {\n            \"ready\".to_string()\n        } else {\n            \"blocked\".to_string()\n        },\n        message: if current.functional_outbound_ready {\n            \"The final local translation check passed.\".to_string()\n        } else {\n            \"The final local translation check did not produce verified readiness.\"\n                .to_string()\n        },\n        generation_token: current.generation_token,\n        runtime_claim: if current.functional_outbound_ready {\n            \"functional_outbound_ready_current_helper_generation\".to_string()\n        } else {\n            \"functional_outbound_readiness_unverified\".to_string()\n        },\n    }\n}\n\n'''
text = replace_once(text, anchor, command + anchor, "explicit C4 verification command")
write(RUNTIME, text)

text = read(REGISTRY)
text = replace_once(
    text,
    """        crate::commands::runtime::start_helper_bridge,\n        crate::commands::helper_bridge::helper_bridge_worker_status,""",
    """        crate::commands::runtime::start_helper_bridge,\n        crate::commands::runtime::verify_required_outbound_ai_readiness,\n        crate::commands::helper_bridge::helper_bridge_worker_status,""",
    "C4 command registry",
)
write(REGISTRY, text)

# 5) Frontend bridge/types project functional Ready separately from Start eligibility.
text = read(TYPES)
text = replace_once(
    text,
    """  provider_ready: boolean;\n  degraded_mode: boolean;""",
    """  provider_ready: boolean;\n  functional_outbound_ready: boolean;\n  functional_outbound_verified_unix_ms: number | null;\n  degraded_mode: boolean;""",
    "frontend helper status C4 fields",
)
write(TYPES, text)

text = read(RUNTIME_API)
text = replace_once(
    text,
    """export type MeetingSessionPreflightStatus = {\n  ready_for_start: boolean;""",
    """export type MeetingSessionPreflightStatus = {\n  ready_for_start: boolean;\n  start_eligible: boolean;\n  functional_outbound_ready: boolean;\n  functional_outbound_verified_unix_ms: number | null;""",
    "runtime API preflight C4 fields",
)
text = replace_once(
    text,
    """    provider_ready: false,\n    degraded_mode: false,""",
    """    provider_ready: false,\n    functional_outbound_ready: false,\n    functional_outbound_verified_unix_ms: null,\n    degraded_mode: false,""",
    "runtime API helper fallback C4 fields",
)
text = replace_once(
    text,
    """      ready_for_start: false,\n      microphone_ready: false,""",
    """      ready_for_start: false,\n      start_eligible: false,\n      functional_outbound_ready: false,\n      functional_outbound_verified_unix_ms: null,\n      microphone_ready: false,""",
    "runtime API Meeting fallback C4 fields",
)
text = replace_once(
    text,
    """  async helperBridgeWorkerStatus(): Promise<HelperBridgeWorkerResponse> {""",
    """  async verifyRequiredOutboundAiReadiness(): Promise<HelperBridgeActionResult> {\n    return invokeOr<HelperBridgeActionResult>(\n      \"verify_required_outbound_ai_readiness\",\n      undefined,\n      helperActionFallback(\"The final local translation check failed before reaching the Tauri runtime.\"),\n    );\n  },\n\n  async helperBridgeWorkerStatus(): Promise<HelperBridgeWorkerResponse> {""",
    "runtime API C4 command method",
)
write(RUNTIME_API, text)

text = read(FACADE)
text = replace_once(
    text,
    """  modelsReady: boolean;\n  asrReady: boolean;""",
    """  modelsReady: boolean;\n  functionalOutboundReady: boolean;\n  asrReady: boolean;""",
    "ProductReadiness C4 field",
)
text = replace_once(
    text,
    """type MeetingPreflightSnapshot = {\n  readyForStart: boolean;""",
    """type MeetingPreflightSnapshot = {\n  readyForStart: boolean;\n  startEligible: boolean;\n  functionalOutboundReady: boolean;""",
    "MeetingPreflightSnapshot C4 fields",
)
text = replace_once(
    text,
    """export type ProductSetupAction = \"start-helper\" | \"check-worker\" | \"verify-models\" | \"check-microphone\";""",
    """export type ProductSetupAction = \"start-helper\" | \"check-worker\" | \"check-readiness\" | \"verify-models\" | \"check-microphone\";""",
    "ProductSetupAction C4 action",
)
text = replace_once(
    text,
    """      readyForStart: false,\n      microphoneReady: false,""",
    """      readyForStart: false,\n      startEligible: false,\n      functionalOutboundReady: false,\n      microphoneReady: false,""",
    "empty preflight C4 fields",
)
text = replace_once(
    text,
    """    readyForStart: preflight.ready_for_start === true,\n    microphoneReady: preflight.microphone_ready === true,""",
    """    readyForStart: preflight.ready_for_start === true,\n    startEligible: preflight.start_eligible === true,\n    functionalOutboundReady: preflight.functional_outbound_ready === true,\n    microphoneReady: preflight.microphone_ready === true,""",
    "preflight C4 projection",
)
text = replace_once(
    text,
    """  const canStart = !unavailable && !hasSession && preflight.readyForStart;""",
    """  const canStart = !unavailable && !hasSession && preflight.startEligible;""",
    "Meeting canStart uses cheap eligibility",
)
text = replace_once(
    text,
    """  const modelsReady = meeting.modelsReady;\n\n  const textDirection""",
    """  const modelsReady = meeting.modelsReady;\n  const functionalOutboundReady = meeting.functionalOutboundReady;\n\n  const textDirection""",
    "map readiness functional local",
)
text = replace_once(
    text,
    """    modelsReady,\n    asrReady,""",
    """    modelsReady,\n    functionalOutboundReady,\n    asrReady,""",
    "return ProductReadiness functional field",
)
text = replace_once(
    text,
    """      : meeting.readyForStart\n        ? \"Meeting Translation is ready to start.\"\n        : textReady""",
    """      : meeting.readyForStart\n        ? \"Meeting Translation is ready to start.\"\n        : productMeeting.canStart\n          ? \"Start Translation will run a quick final translation check before going live.\"\n          : textReady""",
    "C4 next action projection",
)
text = replace_once(
    text,
    """      : meeting.readyForStart\n        ? \"Meeting Translation is ready.\"\n        : textReady""",
    """      : meeting.readyForStart\n        ? \"Meeting Translation is ready.\"\n        : productMeeting.canStart\n          ? \"Meeting setup is available; the final local translation check has not passed for this helper session yet.\"\n          : textReady""",
    "C4 readiness summary",
)
text = replace_once(
    text,
    """      : modelsReady\n        ? \"Required outbound model runtime ready\"\n        : worker.responseAvailable""",
    """      : modelsReady && functionalOutboundReady\n        ? \"Required outbound translation check passed\"\n        : modelsReady\n          ? \"Final local translation check pending\"\n          : worker.responseAvailable""",
    "C4 model status copy",
)
text = replace_once(
    text,
    """  if (action === \"check-worker\") {\n    const status = await runtimeApi.helperBridgeWorkerStatus().catch(() => null);""",
    """  if (action === \"check-worker\") {\n    const status = await runtimeApi.helperBridgeWorkerStatus().catch(() => null);""",
    "check-worker anchor sanity",
)
text = replace_once(
    text,
    """  if (action === \"verify-models\") {""",
    """  if (action === \"check-readiness\") {\n    const result = await runtimeApi.verifyRequiredOutboundAiReadiness().catch(() => null);\n    return result?.ok\n      ? \"The final local translation check passed.\"\n      : \"The final local translation check still needs attention. Open Diagnostics if this continues.\";\n  }\n  if (action === \"verify-models\") {""",
    "C4 setup action",
)
old_recovery = '''export async function runProductRecoveryAction(action: ProductRecoveryAction): Promise<string> {\n  if (action !== \"fix-setup\") return \"No product recovery action was selected.\";\n\n  const helper = await runtimeApi.startHelperBridge().catch(() => null);\n  const input = await runtimeApi.getInputStatus().catch(() => null);\n  const workerStatus = helper?.ok ? await runtimeApi.helperBridgeWorkerStatus().catch(() => null) : null;\n  const worker = parseWorkerCapabilities(workerStatus);\n  const hasProblem = Boolean(\n    (helper && !helper.ok) ||\n    input?.blocker ||\n    (worker.responseAvailable && !worker.translationIdEnReady),\n  );\n\n  if (hasProblem) return \"Setup still needs attention. Open Diagnostics for technical details.\";\n  return \"Setup checks completed. Check Meeting again; the Meeting microphone may still need attention.\";\n}\n'''
new_recovery = '''export async function runProductRecoveryAction(action: ProductRecoveryAction): Promise<string> {\n  if (action !== \"fix-setup\") return \"No product recovery action was selected.\";\n\n  let helper = await runtimeApi.getHelperBridgeStatus().catch(() => null);\n  if (helper && helperNeedsLazyStart(helper)) {\n    const started = await runtimeApi.startHelperBridge().catch(() => null);\n    if (!started?.ok) return \"Setup still needs attention. Open Diagnostics for technical details.\";\n    helper = await runtimeApi.getHelperBridgeStatus().catch(() => null);\n  }\n  const readiness = helper?.state === \"ready\"\n    ? await runtimeApi.verifyRequiredOutboundAiReadiness().catch(() => null)\n    : null;\n  const input = await runtimeApi.getInputStatus().catch(() => null);\n  const workerStatus = helper?.state === \"ready\"\n    ? await runtimeApi.helperBridgeWorkerStatus().catch(() => null)\n    : null;\n  const worker = parseWorkerCapabilities(workerStatus);\n  const hasProblem = Boolean(\n    !helper ||\n    helper.state !== \"ready\" ||\n    !readiness?.ok ||\n    input?.blocker ||\n    (worker.responseAvailable && !worker.translationIdEnReady),\n  );\n\n  if (hasProblem) return \"Setup still needs attention. Open Diagnostics for technical details.\";\n  return \"The local translation check passed. Check Meeting again; the Meeting microphone may still need attention.\";\n}\n'''
text = replace_once(text, old_recovery, new_recovery, "C4 recovery action")
write(FACADE, text)

# 6) First Setup runs the heavy check only at the final readiness step. Returning
# Meeting keeps Start enabled through startEligible and explains the bounded check.
text = read(FIRST_SETUP)
old_verify = '''  async function verifySetup(): Promise<void> {\n    if (busy) return;\n    busy = true;\n    message = \"Checking setup...\";\n    await refreshSnapshot();\n    message = snapshot?.readiness.meetingReady ? \"Everything needed for Meeting translation is ready.\" : \"Setup still needs attention.\";\n    busy = false;\n  }\n'''
new_verify = '''  async function verifySetup(): Promise<void> {\n    if (busy) return;\n    busy = true;\n    message = \"Checking setup...\";\n    if (step === 5) {\n      await runtimeProductFacade.runProductSetupAction(\"check-readiness\");\n    }\n    await refreshSnapshot();\n    message = snapshot?.readiness.meetingReady ? \"Everything needed for Meeting translation is ready.\" : \"Setup still needs attention.\";\n    busy = false;\n  }\n'''
text = replace_once(text, old_verify, new_verify, "First Setup final functional check")
write(FIRST_SETUP, text)

text = read(MEETING_UI)
text = replace_once(
    text,
    """        : readiness.meetingReady\n          ? \"Ready to translate. Start when your meeting is open.\"\n          : \"Finish the setup items below before starting translation.\",""",
    """        : readiness.meetingReady\n          ? \"Ready to translate. Start when your meeting is open.\"\n          : meeting.canStart\n            ? \"Start Translation will run a quick final translation check before going live.\"\n            : \"Finish the setup items below before starting translation.\",""",
    "Meeting C4 ready message",
)
write(MEETING_UI, text)

# 7) Source validator follows the current truth without making the self-test a polling
# command or reviving a second readiness owner.
text = read(VALIDATOR)
text = replace_once(
    text,
    '"get_virtual_mic_route_contract_status", "get_helper_bridge_status", "start_helper_bridge", "helper_bridge_worker_status", "start_capture", "stop_capture",',
    '"get_virtual_mic_route_contract_status", "get_helper_bridge_status", "start_helper_bridge", "verify_required_outbound_ai_readiness", "helper_bridge_worker_status", "start_capture", "stop_capture",',
    "validator command list C4",
)
insert_marker = '''requireMarkers(source.helperBridge, "Meeting outbound AI preparation", [\n'''
index = text.find(insert_marker)
if index < 0:
    raise RuntimeError("validator C4 insertion marker missing")
c4_validator = '''requireMarkers(source.helperBridgeRuntime, "C4 helper functional readiness projection", [\n  "pub functional_outbound_ready: bool",\n  "pub functional_outbound_verified_unix_ms: Option<u128>",\n]);\nrequireMarkers(source.helperBridge, "C4 generation-bound functional ASR/translation/TTS readiness", [\n  "required_outbound_functional_readiness_verified_unix_ms",\n  "decorate_functional_readiness_status",\n  "functional_tts_output_path",\n  "functional_asr_output",\n  'send_worker_task("asr_preload"',\n  '"synthesize",',\n  '"transcribe",',\n  '"language": "en"',\n  '"vad_filter": false',\n  "remember_required_outbound_functional_readiness",\n]);\nrequireMarkers(source.meetingSession, "C4 Start eligibility vs functional Ready", [\n  "pub start_eligible: bool",\n  "pub functional_outbound_ready: bool",\n  "pub functional_outbound_verified_unix_ms: Option<u128>",\n  "let start_eligible = start_blockers.is_empty();",\n  "let ready_for_start = start_eligible && functional_outbound_ready;",\n  '"meeting_session:functional_outbound_not_verified"',\n  "if !preflight.start_eligible",\n  "if !prepared_preflight.ready_for_start",\n]);\nrequireMarkers(source.runtimeCommands, "C4 explicit bounded functional readiness command", [\n  "pub fn verify_required_outbound_ai_readiness()",\n  "helper_bridge::prepare_required_outbound_ai_runtime()",\n  "functional_outbound_ready_current_helper_generation",\n]);\nrequireMarkers(source.facade, "C4 product readiness consumes functional truth", [\n  "functionalOutboundReady",\n  "preflight.start_eligible === true",\n  "preflight.functional_outbound_ready === true",\n  "preflight.startEligible",\n  "verifyRequiredOutboundAiReadiness",\n]);\nrequireMarkers(source.firstSetup, "C4 explicit final setup verification", [\n  'if (step === 5)',\n  'runProductSetupAction("check-readiness")',\n]);\nforbidMarkers(source.helperBridge, "C4 no fabricated ASR readiness", [\n  "C3 therefore performs a real ASR model load here rather than fabricating",\n]);\n\n'''
text = text[:index] + c4_validator + text[index:]
write(VALIDATOR, text)

# 8) Canonical state: C4 closes PR-028; C5 remains the only mapped pre-local source
# correctness wave before target Windows acceptance.
text = read(CONTEXT)
old_context = '''Required outbound AI Start readiness is now generation-bound functional truth rather than preload-only truth. On the first Meeting preparation for a helper generation, TranslateIT loads the ASR runtime, executes a fixed non-user Indonesian -> English translation and requires EOS-complete output, then synthesizes that actual translated fixture through the selected English TTS provider and verifies a real WAV before deleting it. Later Starts reuse only the successful cache for that same helper generation; worker replacement or a hard required-stage execution failure invalidates it. No repository-owned canonical ASR speech fixture currently exists, so C3 does not fabricate ASR inference success from synthetic silence or source markers.\n'''
new_context = '''Required outbound AI Start readiness is generation-bound functional truth rather than preload-only truth. On the first explicit final-readiness check or Meeting Start for a helper generation, TranslateIT loads the ASR runtime, executes a fixed non-user Indonesian -> English translation and requires EOS-complete output, synthesizes that actual translated fixture through the selected English TTS provider into a real WAV, then reuses that temporary speech WAV for a real ASR transcription call before deleting it. The self-test requires non-empty ASR output but does not claim language/quality accuracy from the fixture. Later checks/Starts reuse only the successful cache for that same helper generation; worker replacement or a hard required-stage execution failure invalidates it. Product `Ready` consumes this functional cache, while static prerequisites remain separately `start_eligible` so pressing Start can run the bounded self-test without heavy work in routine polling.\n'''
text = replace_once(text, old_context, new_context, "CONTEXT C4 readiness truth")
write(CONTEXT, text)

text = read(OWNERSHIP)
text = replace_once(
    text,
    """| Local worker/scheduler | `helper_bridge.rs`, `helper_bridge_runtime.rs`, `realtime_local_worker.py` | ACTIVE / GENERATION-BOUND FUNCTIONAL OUTBOUND READINESS |""",
    """| Local worker/scheduler | `helper_bridge.rs`, `helper_bridge_runtime.rs`, `realtime_local_worker.py` | ACTIVE / GENERATION-BOUND FUNCTIONAL ASR + ID->EN + TTS READINESS / PUBLIC READY TRUTH |""",
    "source ownership C4 status",
)
write(OWNERSHIP, text)

text = read(NEXT_ACTION)
old_tail = '''## Current Mode\n\n**Maintenance / Pre-Local Source Readiness — RE-AUDIT CLOSED, TWO IMPLEMENTATION WAVES REMAIN.** A1-A7, B1-B6, and C1-C3 remain closed at their proven boundaries. Local-PC testing is still deferred by user decision. C4 and C5 are source-level correctness closures, not target-hardware acceptance.\n\n## Next Step — Pre-Local C4 Functional Readiness Truth Closure\n\nComplete PR-028 at the existing helper/Meeting owners: make the generation-bound self-test execute real ASR inference as well as real ID -> EN inference and English TTS, and make product/Meeting readiness consume the functional cache truth so First Setup/returning Meeting cannot report functional Ready after an unverified or hard-failed generation. Keep Start eligibility usable without running the full self-test on routine polling, and do not change model quality/tuning, CUDA fallback policy, audio routing, installer staging, or local-PC proof.'''
new_tail = '''## Pre-Local C4 — IMPLEMENTED / TARGET AI-HARDWARE PROOF DEFERRED\n\nC4 closes the remaining PR-028 source gap. The generation-bound self-test still preloads the canonical ASR runtime early, then performs real ID -> EN inference with EOS-completion truth, real English TTS synthesis to a bounded temporary WAV, and now a real ASR `transcribe` call on that generated speech WAV before deleting it. The ASR fixture check requires a non-empty inference result only; it deliberately does not promote fixture wording or language accuracy into a quality claim. No repository binary speech fixture or second readiness service was added.\n\nFunctional capability truth is now projected from the existing helper-generation cache. `HelperBridgeStatus` exposes whether the current generation has passed the full self-test, Meeting preflight separates cheap `start_eligible` prerequisites from `ready_for_start`, and product/First Setup `Ready` requires the functional flag. Routine status/polling never runs the heavy self-test. Explicit final setup checking and Start can execute it on cache miss, while an unverified generation may remain Start-eligible so Start can perform the bounded check before any Live commit. Worker replacement or hard required-stage failure still invalidates the cache.\n\nRemote Windows/source proof for this slice passed:\n\n```text\nreal fixed-fixture ID -> EN inference            -> PASS / hosted CPU fallback\nreal English TTS synthesis + WAV validity        -> PASS / Windows SAPI\nreal ASR inference on generated readiness WAV    -> PASS / hosted CPU fallback\nWorkerRuntime deterministic tests                -> PASS\nC4 helper/preflight deterministic Rust tests     -> PASS\ncanonical source validators                      -> PASS\nsvelte-check + frontend build                    -> PASS\nRust full test-target compile (`--no-run`)        -> PASS\ncargo check                                      -> PASS\nTauri release build --no-bundle                  -> PASS\nC4 ownership/polling guard                        -> PASS\n```\n\nThis proves the functional execution and source truth on the hosted CPU path. It does not prove Indonesian ASR quality, NVIDIA CUDA execution, physical microphone/virtual-cable behavior, or target-PC performance. No VAD tuning, model-quality tuning, installer work, or local-PC test is part of C4.\n\n## Current Mode\n\n**Developing / Pre-Local Source Readiness — C4 IMPLEMENTED, ONE SOURCE CLOSURE REMAINS.** A1-A7, B1-B6, C1-C3, and the source re-audit remain closed at their proven boundaries. Local-PC testing is still deferred by user decision. C5 is the final mapped non-hardware source-correctness wave.\n\n## Next Step — Pre-Local C5 Atomic Outbound Activation Closure\n\nComplete PR-053 at the existing Meeting/audio owners: functionally probe the prepared virtual output endpoint with a bounded silent/callback-only native output stream before Live, and create the serialized outbound consumer before `commit_application_meeting_session_live`. Preserve authority-first rollback, prepared-device reuse, at-most-once delivery, B3 hot-path efficiency, and optional-incoming independence. Do not mix VAD tuning, installer staging, endpoint-GUID migration, or local-PC proof.'''
text = replace_once(text, old_tail, new_tail, "next-action C4 closure")
write(NEXT_ACTION, text)

print("C4 functional readiness patch applied")
