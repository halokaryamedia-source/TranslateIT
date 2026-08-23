import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const paths = {
  index: resolve(root, "index.html"),
  main: resolve(root, "src/main.ts"),
  app: resolve(root, "src/App.svelte"),
  meeting: resolve(root, "src/pages/Meeting.svelte"),
  text: resolve(root, "src/pages/Text.svelte"),
  myVoice: resolve(root, "src/pages/MyVoice.svelte"),
  settings: resolve(root, "src/pages/Settings.svelte"),
  firstSetup: resolve(root, "src/pages/FirstSetup.svelte"),
  meetingActivity: resolve(root, "src/components/meeting/MeetingActivity.svelte"),
  sidebar: resolve(root, "src/components/layout/Sidebar.svelte"),
  statusRow: resolve(root, "src/components/ui/StatusRow.svelte"),
  frontendState: resolve(root, "src/app/shared/state.ts"),
  frontendTypes: resolve(root, "src/app/shared/types.ts"),
  runtimeApi: resolve(root, "src/app/bridge/runtimeApi.ts"),
  facade: resolve(root, "src/app/bridge/runtimeProductFacade.ts"),
  registry: resolve(root, "src-tauri/src/commands/registry.rs"),
  runtimeCommands: resolve(root, "src-tauri/src/commands/runtime.rs"),
  meetingSession: resolve(root, "src-tauri/src/commands/meeting_session.rs"),
  helperBridge: resolve(root, "src-tauri/src/commands/helper_bridge.rs"),
  helperBridgeRuntime: resolve(root, "src-tauri/src/commands/helper_bridge_runtime.rs"),
  virtualMicRoute: resolve(root, "src-tauri/src/commands/virtual_mic_route.rs"),
  meetingOutput: resolve(root, "src-tauri/src/engine/audio/meeting_output.rs"),
  settingsCommands: resolve(root, "src-tauri/src/commands/settings.rs"),
  audioCommands: resolve(root, "src-tauri/src/commands/audio.rs"),
  audioInput: resolve(root, "src-tauri/src/engine/audio/input.rs"),
  textTranslate: resolve(root, "src-tauri/src/commands/text_translation.rs"),
  finalizedUtterance: resolve(root, "src-tauri/src/engine/audio/finalized_utterance.rs"),
  runtimeState: resolve(root, "src-tauri/src/engine/runtime_state.rs"),
  settingsRust: resolve(root, "src-tauri/src/engine/settings.rs"),
  worker: resolve(root, "../../Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py"),
  workerBase: resolve(root, "../../Backend/LocalWorker/WorkerRuntime/realtime_local_worker_base.py"),
  milmmtProvider: resolve(root, "../../Backend/LocalWorker/WorkerRuntime/milmmt_translation_provider.py"),
  modelManifest: resolve(root, "../../Backend/LocalWorker/WorkerRuntime/model_manifest.json"),
};

for (const [label, path] of Object.entries(paths)) {
  if (!existsSync(path)) throw new Error(`Missing ${label}: ${path}`);
}
const source = Object.fromEntries(Object.entries(paths).map(([label, path]) => [label, readFileSync(path, "utf8")]));

function requireMarkers(body, label, markers) {
  for (const marker of markers) {
    if (!body.includes(marker)) throw new Error(`${label} marker missing: ${marker}`);
  }
}

function forbidMarkers(body, label, markers) {
  for (const marker of markers) {
    if (body.includes(marker)) throw new Error(`${label} forbidden marker found: ${marker}`);
  }
}

function requireAbsent(relativePath, label) {
  if (existsSync(resolve(root, relativePath))) throw new Error(`${label} must remain removed: ${relativePath}`);
}

const entries = [...source.index.matchAll(/<script\s+type=["']module["'][^>]*src=["']([^"']+)["']/g)].map((match) => match[1]);
if (entries.length !== 1 || entries[0] !== "/src/main.ts") throw new Error(`Expected one frontend module entry, found ${entries.join(", ")}`);
requireMarkers(source.main, "Svelte entrypoint", ['import { mount } from "svelte"', 'import App from "./App.svelte"', "mount(App, { target })"]);

requireMarkers(source.app, "Svelte application owner", [
  'route = $state<AppRoute>("meeting")',
  "runtimeProductFacade.loadProductRuntimeSnapshot",
  "runtimeProductFacade.runProductMeetingAction",
  "runtimeProductFacade.runProductRecoveryAction",
  "mapProductReadiness",
  "transcriptStatusKey",
  "lastTranscriptStatusKey",
  "applyMeetingStatus(result.status, resultNotice)",
  "getCurrentWindow().onCloseRequested",
  "<FirstSetup",
  "<Meeting",
  "<Text",
  "<MyVoice",
  "<Settings",
  "setupBusy={setupActionBusy}",
]);
forbidMarkers(source.app, "Svelte application owner", ["SimpleLauncherController", "MutationObserver", "Pause Translation", "Resume Translation"]);

requireMarkers(source.meeting, "Meeting surface", [
  "Start Translation",
  "Stop Translation",
  "getVirtualMicRouteStatus",
  "meetingMicrophoneDevice",
  "Choose this exact microphone",
  "English → Indonesian text",
  "You speak",
  "Meeting hears",
  "onMeetingAction",
  "Check Setup",
]);
requireMarkers(source.meetingActivity, "Meeting live activity", [
  "mapProductMeetingState",
  'case "transcribing"',
  'case "translating"',
  'case "synthesizing"',
  'case "delivering"',
  'turn.lane === "incoming" ? "MEETING" : "YOU"',
  "What was said and translated",
]);
requireMarkers(source.text, "Text surface", [
  "MAX_MANUAL_TRANSLATION_CHARS = 2000",
  "runtimeProductFacade.runProductTranslation",
  "runtimeApi.saveSettings",
  "source_language: settings.target_language",
  "target_language: settings.source_language",
  "copyTranslation",
  "navigator.clipboard.writeText",
  "targetRevision",
  "Ctrl + Enter to translate",
]);
requireMarkers(source.settings, "Settings surface", [
  'type SettingsTab = "meeting" | "advanced"',
  "selectProductAudioDevice",
  "loadProductAudioDevices",
  "getVirtualMicRouteStatus",
  "meetingResourcesLocked",
  "meetingMicrophoneDevice",
  "Choose this exact microphone inside your meeting app",
  "refreshDiagnostics",
  'aria-label="Settings sections"',
  "Stop Mic Test",
  "Mic Test",
  "Verify Models",
  "runtimeApi.getCommandErrors()",
]);
requireMarkers(source.firstSetup, "First Setup surface", [
  'type SetupStep = 1 | 2 | 3 | 4 | 5',
  'type SetupState = "new" | "deferred" | "completed"',
  "meeting_setup_state",
  "meeting_setup_checkpoint",
  "settings.audio.input_device_id",
  "settings.audio.output_device_id",
  "selectProductAudioDevice",
  "getVirtualMicRouteStatus",
  "currentMeetingMicrophone",
  "Set your meeting microphone",
  'role="progressbar"',
  "Check Again",
]);
requireMarkers(source.sidebar, "Primary navigation", ["Meeting", "Text", "My Voice", "Settings", "Ready to translate", "Indonesian ↔ English"]);
requireMarkers(source.statusRow, "shared status row", ["StatusBadge", "detail", "status = \"\"", "{#if status}"]);

for (const [label, body] of [
  ["App", source.app],
  ["Meeting", source.meeting],
  ["Text", source.text],
  ["First Setup", source.firstSetup],
  ["Sidebar", source.sidebar],
  ["Meeting activity", source.meetingActivity],
]) {
  forbidMarkers(body, `${label} normal-user copy`, [
    "canonical Stop lifecycle",
    "Current app capability state",
    "Finalized speech only",
    "Using the current local translation runtime",
    "Document attachments are not part of this workflow",
    "outbound-runtime setup",
  ]);
}
for (const [label, body] of [
  ["Meeting", source.meeting],
  ["Settings", source.settings],
  ["First Setup", source.firstSetup],
]) {
  forbidMarkers(body, `${label} invented Windows endpoint identity`, ["TranslateIT Meeting Microphone"]);
}

for (const [relativePath, label] of [
  ["src/app/active-launcher", "retired active-launcher DOM owner"],
  ["src/app/simple-launcher", "retired simple-launcher controller owner"],
  ["src/app/first-setup", "retired vanilla First Setup owner"],
]) requireAbsent(relativePath, label);

const requiredCommands = [
  "get_meeting_session_status", "get_meeting_committed_turns", "start_meeting_translation", "stop_meeting_translation",
  "get_virtual_mic_route_contract_status", "get_helper_bridge_status", "start_helper_bridge", "verify_required_outbound_ai_readiness", "helper_bridge_worker_status", "start_capture", "stop_capture",
  "get_input_status", "list_audio_devices", "probe_input_device_candidate", "probe_output_device_candidate",
  "load_runtime_settings", "save_runtime_settings", "select_audio_device", "translate_text", "verify_models",
];
requireMarkers(source.runtimeApi, "frontend bridge", requiredCommands.map((command) => `"${command}"`));
requireMarkers(source.registry, "Tauri registry", requiredCommands);
requireMarkers(source.registry, "guarded product command routing", [
  "crate::commands::runtime::start_helper_bridge",
  "crate::commands::runtime::start_meeting_translation",
  "crate::commands::virtual_mic_route::get_virtual_mic_route_contract_status",
]);
forbidMarkers(source.runtimeApi, "frontend bridge", ["audio_studio", "history_entry", "setup_models", "get_gpu_policy", "get_runtime_diagnostics"]);
requireMarkers(source.runtimeApi, "frontend bridge contracts", [
  "Promise<RuntimeSettings | null>",
  "TextTranslationCommandResult",
  "AudioDeviceSelectionCommandResult",
  "VirtualMicRouteContractStatus",
  "getVirtualMicRouteStatus",
]);

requireMarkers(source.facade, "product facade", [
  "selectedTextDirection(settings)",
  "loadProductRuntimeSnapshot(knownSettings?: RuntimeSettings)",
  "runProductMeetingAction",
  "runProductTranslation",
  "result.translated_text",
  "result.user_message",
  "selectAudioDevice",
  "translationIdEnReady",
  "translationEnIdReady",
]);
forbidMarkers(source.facade, "normal readiness", ["getStatusBundle", "getDiagnostics", "getModelInventory", "getGpuPolicy", "translation_realtime", "translation_quality"]);

requireMarkers(source.settingsCommands, "settings command ownership", [
  "pub struct AudioDeviceSelectionResult",
  "fn persist_runtime_settings",
  "fn runtime_session_owns_audio_resources()",
  "latest_runtime_session_state().has_active_session",
  "pub fn select_audio_device",
  "active_runtime_session_locked",
  "Stop Translation or Mic Test before changing audio devices",
  "probe_input_device_candidate",
  "probe_output_device_candidate",
  "probe.prepared && probe.functional_verified",
  "The previous preference was kept",
]);
requireMarkers(source.audioInput, "C1 functional microphone candidate verification", [
  "FUNCTIONAL_INPUT_PROBE_TIMEOUT_MS",
  "pub fn probe_input_device_functionally(",
  ".build_input_stream(",
  "stream.play()",
  "recv_timeout(Duration::from_millis(FUNCTIONAL_INPUT_PROBE_TIMEOUT_MS))",
  "functional_verified: true",
  "callback_frames_observed: observed",
  "No microphone samples were retained by this verification",
]);
forbidMarkers(source.audioInput, "C1 bounded functional microphone verification", ["thread::sleep("]);
requireMarkers(source.audioCommands, "C1 explicit-vs-routine microphone verification split", [
  "probe_input_device_functionally(device_id.as_deref())",
  "InputPreparationStatus::inspect_input_device(settings.audio.input_device_id.as_deref())",
]);
requireMarkers(source.facade, "C1 frontend functional microphone truth", [
  "status.functional_verified === true",
]);
requireMarkers(source.runtimeCommands, "active-session public helper restart guard", [
  "pub fn start_helper_bridge()",
  "latest_runtime_session_state().has_active_session",
  'state: "active_runtime_session".to_string()',
  "public_helper_restart_deferred_until_runtime_session_stop",
]);
requireMarkers(source.textTranslate, "Text translation command contract", [
  "pub struct TextTranslationResult",
  "pub translated_text: String",
  "pub user_message: String",
  "pub blocker: String",
  "TextTranslationResult::success",
  "TextTranslationResult::blocked",
  "use super::runtime::start_helper_bridge",
  'start.state == "active_runtime_session"',
]);

requireMarkers(source.finalizedUtterance, "C2 finalized latency seed", [
  "pub finalized_at: Instant",
  "pub enqueued_at: Instant",
  "pub finalized_unix_ms: u128",
  "pub speech_boundary_ms: u64",
  "pub finalization_ms: u64",
  "PR-052 begins at detected finalized-utterance end",
]);
requireMarkers(source.meetingOutput, "C2 first translated playback timestamp", [
  "first_playback_at: Option<Instant>",
  "first_playback_unix_ms: Option<u128>",
  "callback_info.timestamp()",
  ".playback",
  ".duration_since(&timestamp.callback)",
  "signal_first_playback(callback_info)",
]);
requireMarkers(source.meetingSession, "C2 transient outbound latency instrumentation", [
  "pub struct MeetingOutboundTiming",
  "pub timing: Option<MeetingOutboundTiming>",
  "pub outbound_timing: Option<MeetingOutboundTiming>",
  "speech_boundary_ms",
  "finalization_ms",
  "queue_ms",
  "audio_prepare_ms",
  "asr_ms",
  "translation_ms",
  "tts_ms",
  "delivery_ms",
  "outbound_latency_ms",
  "record_first_playback_timing",
]);
forbidMarkers(source.meetingSession, "C2 no speculative latency threshold", [
  "MAX_ACCEPTABLE_LATENCY",
  "TARGET_LATENCY_MS",
  "latency_threshold",
]);

requireMarkers(source.meetingOutput, "C5 bounded functional native Meeting output probe", [
  "FUNCTIONAL_OUTPUT_PROBE_TIMEOUT_MS",
  "FUNCTIONAL_OUTPUT_PROBE_FRAMES",
  "pub fn probe_prepared_meeting_output_device_functionally(",
  "prepared_output_device(requested_name)?",
  "Arc::new(vec![0.0_f32; sample_count])",
  "first_playback_rx.recv_timeout(Duration::from_millis(",
  '"meeting_output:functional_probe_callback_timeout"',
]);
requireMarkers(source.meetingSession, "C5 atomic required outbound activation", [
  "probe_prepared_meeting_output_device_functionally",
  "start_meeting_outbound_consumer(generation, &session_id)",
  "commit_application_meeting_session_live(",
  "generation-bound ASR/translation/My Voice functional proof",
]);
const c5Start = source.meetingSession.slice(
  source.meetingSession.indexOf("pub fn start_meeting_translation()"),
  source.meetingSession.indexOf("#[tauri::command]\npub fn stop_meeting_translation()"),
);
const c5Order = [
  "begin_application_meeting_session()",
  "start_live_capture_runtime(starting.clone())",
  "prepare_required_outbound_ai_runtime(generation)",
  "probe_prepared_meeting_output_device_functionally(output_device, generation)",
  "start_meeting_outbound_consumer(generation, &session_id)",
  "commit_application_meeting_session_live(",
].map((marker) => c5Start.indexOf(marker));
if (c5Order.some((index) => index < 0) || c5Order.some((index, i) => i > 0 && index <= c5Order[i - 1])) {
  throw new Error(`A6 Start ordering is not authority -> microphone -> MyVoice proof -> output probe -> outbound consumer -> Live: ${c5Order.join(",")}`);
}

requireMarkers(source.helperBridgeRuntime, "C4 helper functional readiness projection", [
  "pub functional_outbound_ready: bool",
  "pub functional_outbound_verified_unix_ms: Option<u128>",
]);
requireMarkers(source.helperBridge, "A6 generation-bound functional ASR/translation/MyVoice readiness", [
  "RequiredOutboundFunctionalReadiness",
  "meeting_generation: u64",
  "actor_token: String",
  "required_outbound_functional_readiness_verified_unix_ms",
  "decorate_functional_readiness_status",
  "functional_voice_actor_output_path",
  "functional_asr_output",
  "run_required_outbound_ai_probe(",
  '"voice_actor_preflight"',
  '"voice_actor_synthesize"',
  '"expected_actor_token"',
  '"transcribe"',
  '"language": "en"',
  '"vad_filter": false',
  "remember_required_outbound_functional_readiness",
  "required_outbound_voice_actor_token",
]);
requireMarkers(source.meetingSession, "C4 Start eligibility vs functional Ready", [
  "pub start_eligible: bool",
  "pub functional_outbound_ready: bool",
  "pub functional_outbound_verified_unix_ms: Option<u128>",
  "let start_eligible = start_blockers.is_empty();",
  "let ready_for_start = start_eligible && functional_outbound_ready;",
  '"meeting_session:functional_outbound_not_verified"',
  "if !preflight.start_eligible",
  "if !prepared_preflight.ready_for_start",
]);
requireMarkers(source.runtimeCommands, "C4 explicit bounded functional readiness command", [
  "pub fn verify_required_outbound_ai_readiness()",
  "helper_bridge::verify_required_outbound_ai_runtime()",
  "functional_outbound_ready_current_helper_generation",
]);
requireMarkers(source.facade, "C4 product readiness consumes functional truth", [
  "functionalOutboundReady",
  "preflight.start_eligible === true",
  "preflight.functional_outbound_ready === true",
  "preflight.startEligible",
  "verifyRequiredOutboundAiReadiness",
]);
requireMarkers(source.firstSetup, "C4 explicit final setup verification", [
  'if (step === 5)',
  'runProductSetupAction("check-readiness")',
]);
forbidMarkers(source.helperBridge, "C4 no fabricated ASR readiness", [
  "C3 therefore performs a real ASR model load here rather than fabricating",
]);

requireMarkers(source.helperBridge, "A6 diagnostic and Meeting functional outbound identity", [
  "fn meeting_start_prepare",
  "run_required_outbound_ai_probe(",
  "verify_required_outbound_ai_runtime()",
  "prepare_required_outbound_ai_runtime(meeting_generation: u64)",
  "HelperTaskPriority::MeetingOutbound",
  "REQUIRED_OUTBOUND_FUNCTIONAL_ID_FIXTURE",
  "REQUIRED_OUTBOUND_FUNCTIONAL_VOICE_OUTPUT",
  "REQUIRED_OUTBOUND_DIAGNOSTIC_VOICE_OUTPUT",
  "RequiredOutboundFunctionalReadiness",
  "meeting_generation: u64",
  "actor_token: String",
  "remember_required_outbound_functional_readiness(generation_token, 0, actor_token);",
  "invalidate_required_outbound_ai_readiness",
  '"voice_actor_preflight"',
  '"voice_actor_synthesize"',
  '"expected_actor_token"',
  "functional_voice_actor_output_path",
  "fs::metadata",
]);
requireMarkers(source.helperBridge, "Meeting outbound helper priority continuity", [
  "MEETING_OUTBOUND_PIPELINE_GENERATION",
  "meeting_outbound_pipeline_active",
  "incoming_deferred_response",
  "send_worker_task_inner",
  "incoming-deferred-before-scheduler",
  'task == "voice_actor_synthesize"',
  "clear_meeting_outbound_pipeline",
]);
requireMarkers(source.helperBridge, "Live Meeting helper transport recovery", [
  "fn helper_transport_failure(",
  'blocker.contains("_write_failed:")',
  'blocker.contains("_read_failed:")',
  "fn live_outbound_generation_is_authoritative(",
  "fn recover_live_meeting_helper_transport(",
  'matches!(task, "transcribe" | "translate")',
  "acquire_helper_task_permit(HelperTaskPriority::MeetingOutbound)",
  "meeting_live_helper_transport_recovered_same_worker",
  "response = send_worker_task_inner(task, retry_payload);",
  "meeting_live_helper_recovered_current_stage_not_retried",
  "this synthesis stage was not retried",
]);
forbidMarkers(source.helperBridge, "Live Meeting helper retry boundary", [
  'matches!(task, "transcribe" | "translate" | "synthesize")',
]);
forbidMarkers(source.helperBridge, "retired unregistered helper command surface", [
  "pub fn stop_helper_bridge()",
  "pub fn cancel_helper_bridge_meeting_generation(",
  "pub fn cancel_helper_bridge_task()",
  "pub fn send_helper_bridge_request(",
  "pub fn helper_bridge_preload_asr()",
  "pub fn helper_bridge_preload_translation(",
  "pub fn helper_bridge_tts_preflight()",
  "pub fn helper_bridge_pipeline_contract_smoke()",
  "pub fn helper_bridge_synthesize_text(",
]);
forbidMarkers(source.helperBridgeRuntime, "retired helper compatibility transport", [
  "pub struct HelperBridgeRequest",
  "pub fn write_worker_request(stdin:",
  "pub fn read_worker_response_with_deadline(",
  "is_contract_only_response",
]);
requireMarkers(source.helperBridge, "Optional incoming helper failure isolation", [
  "fn recover_incoming_transport_failure_before_permit_release(",
  ".filter(|value| incoming_session_is_eligible(value))",
  ".is_none()",
  "start_helper_bridge_internal(false)",
  "meeting_incoming_transport_recovered_same_worker_event_not_retried",
  "meeting_incoming_transport_recovery_failed",
  "this stale incoming event was not retried",
]);
requireMarkers(source.meetingSession, "Optional incoming freshness semantics", [
  "fn incoming_deferred_for_required_outbound(",
  'Some("helper_scheduler:incoming_deferred_for_outbound")',
  "event was discarded and incoming is listening for fresh Meeting Sound",
  "transcript was discarded and incoming is listening for fresh Meeting Sound",
]);
requireMarkers(source.helperBridgeRuntime, "required outbound MyVoice readiness invalidation", [
  "required_outbound_prepare_failed",
  "runtime.provider_ready = false",
  'stage == "asr_preload"',
  'stage == "voice_actor_preflight"',
  "hard_voice_actor_failure",
  'stage == "voice_actor_synthesize"',
  'Some("id->en")',
]);
requireMarkers(source.meetingSession, "A6 Meeting outbound Start hardening", [
  "prepare_required_outbound_ai_runtime(generation)",
  "Required outbound AI/My Voice verification failed during Starting",
  "required_outbound_voice_actor_token(generation)",
  "Final pre-Live My Voice readiness changed",
  "Translation Live is listening. Rolling audio remains preview-only; finalized utterances receive shared Meeting event sequence before AI.",
]);
requireMarkers(source.meetingSession, "Meeting helper Stop recovery", [
  "recover_helper_after_meeting_stop_if_needed",
  'Some("helper_bridge:meeting_session_hard_cancelled")',
  "let recovery = start_helper_bridge();",
  '"helper_recovery_failed"',
]);
forbidMarkers(source.meetingSession, "bounded Meeting helper Stop recovery", [
  'Some("helper_bridge:task_hard_cancelled")',
  'Some("helper_bridge:meeting_generation_hard_cancelled")',
]);

requireMarkers(source.virtualMicRoute, "matched Meeting route pair identity", [
  "pub route_pair_id: Option<String>",
  "fn endpoint_pair_identity(",
  "fn matched_pair_identity(",
  "fn matched_pair_candidates(",
  "fn primary_vb_cable_pair(",
  '"input"',
  '"output"',
  '"virtual_mic:selected_route_pair_mismatch"',
  '"virtual_mic:matched_route_pair_missing"',
  '"virtual_mic:matched_route_pair_ambiguous"',
  '"meeting_application_microphone_device"',
]);
forbidMarkers(source.virtualMicRoute, "retired independent virtual endpoint selection", [
  "fn has_virtual_device_keyword(",
  "fn auto_virtual_candidate(",
  "let route_ready = output_device_found && input_device_found;",
  '"blackhole"',
  '"stereo mix"',
]);
requireMarkers(source.virtualMicRoute, "Meeting generation route stability", [
  "struct MeetingVirtualMicRouteSelection",
  "pub fn prepare_current_virtual_mic_route_for_meeting()",
  "pub fn bind_prepared_virtual_mic_route_to_generation(generation: u64)",
  "fn active_application_meeting_generation()",
  "prepared.generation = Some(generation);",
  "virtual_mic_generation_bound_route_pair_source_side_not_audio_delivery_proof",
  "virtual_mic_active_meeting_route_not_bound_fail_closed",
]);
requireMarkers(source.runtimeCommands, "public Meeting route preparation before canonical Start", [
  "pub fn start_meeting_translation()",
  "clear_prepared_virtual_mic_route_selection();",
  "prepare_current_virtual_mic_route_for_meeting()",
  'state: "meeting_route_pair_prepare_failed".to_string()',
  "let result = meeting_session::start_meeting_translation();",
  "bind_prepared_virtual_mic_route_to_generation(generation)",
]);
if (source.runtimeCommands.indexOf("prepare_current_virtual_mic_route_for_meeting()") > source.runtimeCommands.indexOf("let result = meeting_session::start_meeting_translation();")) {
  throw new Error("Matched Meeting route pair must be prepared before canonical Meeting Start");
}

requireMarkers(source.meetingOutput, "Rust Meeting output runtime", [
  "pub fn prepare_meeting_output_device(",
  "pub fn deliver_meeting_output_wav(",
  "pub fn cancel_meeting_output_for_generation(",
  ".build_output_stream(",
  "runtime_generation_is_authoritative",
  '"meeting_output:delivery_deadline_exceeded"',
]);
requireMarkers(source.meetingSession, "Rust Meeting output preparation before authority", [
  "prepare_meeting_output_device",
  '"meeting_output_prepare_failed"',
  "let starting = begin_application_meeting_session();",
]);
if (source.meetingSession.indexOf("prepare_meeting_output_device(") > source.meetingSession.indexOf("let starting = begin_application_meeting_session();")) {
  throw new Error("Native Meeting output preflight must run before Meeting authority creation");
}
requireMarkers(source.meetingOutput, "Meeting route delivery hang containment", [
  "fn delivery_deadline_ms(",
  "saturating_mul(2)",
  "MAX_DELIVERY_DEADLINE_MS",
  "recv_timeout(deadline)",
  '"meeting_output:delivery_deadline_exceeded"',
]);
requireMarkers(source.meetingSession, "Rust Meeting route temporary TTS ownership", [
  "get_bound_virtual_mic_output_device(generation)",
  "deliver_meeting_output_wav(&tts_path, bound_output_device.as_deref().ok(), generation)",
  "remove_temporary_tts(&tts_path);",
]);
const routeDispatchIndex = source.meetingSession.indexOf("deliver_meeting_output_wav(&tts_path, bound_output_device.as_deref().ok(), generation)");
const routeCleanupIndex = source.meetingSession.indexOf("remove_temporary_tts(&tts_path);", routeDispatchIndex);
if (routeDispatchIndex < 0 || routeCleanupIndex < routeDispatchIndex) {
  throw new Error("Meeting temporary TTS must remain owned until synchronous Rust audio delivery returns");
}
requireMarkers(source.finalizedUtterance, "Meeting finalized speech freshness", [
  "MAX_PENDING_FINALIZED_UTTERANCES",
  "while state.pending.len() >= MAX_PENDING_FINALIZED_UTTERANCES",
  "let _ = state.pending.pop_front();",
  "Already-running output is not preempted here.",
  "state.pending.push_back(FinalizedMeetingUtterance",
]);
forbidMarkers(source.finalizedUtterance, "retired newest-drop overload policy", [
  "if state.lane == LANE_INCOMING {\n            // Incoming is comprehension assistance. Prefer the newest finalized speech",
]);

requireMarkers(source.settingsRust, "settings schema", ["const CURRENT_SCHEMA_VERSION: u32 = 6;", "pub source_language: String", "pub target_language: String", "pub meeting_setup_state: String", "pub meeting_setup_checkpoint: u8", "pub input_device_id: Option<String>", "pub output_device_id: Option<String>"]);
requireMarkers(source.frontendState, "frontend settings defaults", ["schema_version: 6", 'source_language: "id"', 'target_language: "en"', 'meeting_setup_state: "new"']);
requireMarkers(source.frontendTypes, "frontend shared route identity", [
  'export type AppRoute = "meeting" | "text" | "my-voice" | "settings"',
  'export const APPLICATION_MEETING_OWNER_ID = "translateit_application_meeting"',
]);
forbidMarkers(source.frontendTypes, "frontend settings type", ["runtime_profile", "history_enabled", "voice_actor_profile_id"]);

requireMarkers(source.runtimeState, "Meeting lifecycle", ['"starting",', 'snapshot.phase = "live".to_string()', 'snapshot.phase = "stopping".to_string()', "runtime_generation_is_authoritative"]);
forbidMarkers(source.runtimeState, "Meeting lifecycle", ['phase: "paused"', 'phase: "resuming"', "clear_runtime_handoff_state"]);
forbidMarkers(source.meetingSession, "Meeting commands", ["pause_meeting_translation", "resume_meeting_translation", "reset_live_pipeline_handoff_status"]);

requireMarkers(source.worker, "canonical MiLMMT translation worker composition", [
  "import milmmt_translation_provider",
  "milmmt_translation_provider.install(globals())",
]);
requireMarkers(source.workerBase, "canonical MiLMMT translation worker host", [
  "TRANSLATION_MODEL_ROOT = common.TRANSLATION_MODEL_ROOT",
]);
requireMarkers(source.milmmtProvider, "canonical MiLMMT bidirectional translation contract", [
  'MODEL_ID = "milmmt-46-1b-v1.0"',
  'HF_MODEL_ID = "xiaomi-research/MiLMMT-46-1B-v1.0"',
  'MODEL_DIRNAME = "xiaomi-research--MiLMMT-46-1B-v1.0"',
  'MODEL_REVISION = "4fc480b6c58dec29c159dcdf9fde0f6d5c354995"',
  'REVISION_MARKER = ".translateit_model_revision"',
  'marker.read_text(encoding="utf-8").strip() == MODEL_REVISION',
  'namespace["TRANSLATION_MODEL"] = namespace["TRANSLATION_MODEL_ROOT"] / MODEL_DIRNAME',
  'if pair in {"id->en", "en->id"}:',
  'f"Translate this from {source_name} to {target_name}:\\n"',
  "add_special_tokens=False",
  'return_tensors="pt"',
  "truncation=False",
  '"translation:input_too_long_for_model"',
  "do_sample=False",
  "values = sequences[0, prompt_tokens:]",
  '"translation:output_hit_token_ceiling_without_eos"',
  '"translation:output_ended_without_eos"',
]);
for (const [label, body] of [
  ["worker loader", source.worker],
  ["worker base", source.workerBase],
  ["MiLMMT provider", source.milmmtProvider],
]) {
  forbidMarkers(body, label, [
    "marianmt",
    "QUALITY_TRANSLATION_MODEL",
    "NLLB_LANGUAGE_CODES",
    "translation_model_for_mode",
    "translation_generation_completion",
    "translation_generation_options",
  ]);
}

const manifest = JSON.parse(source.modelManifest);
const models = Array.isArray(manifest.models) ? manifest.models : [];
if (!models.some((model) => model.model_id === "milmmt-46-1b-v1.0")) throw new Error("Missing milmmt-46-1b-v1.0 inventory entry");
if (models.some((model) => model.model_id === "nllb-200-distilled-600M")) throw new Error("NLLB must not return to current translation inventory");
for (const model of models.filter((entry) => entry.source_type === "huggingface")) {
  if (!/^[0-9a-f]{40}$/.test(String(model.revision ?? ""))) throw new Error(`Hugging Face model ${model.model_id} must pin a full immutable revision`);
}
if (models.some((model) => Object.hasOwn(model, "checksum"))) throw new Error("Model inventory must not invent checksum identity without a current packaging requirement");

console.log("[startup-readiness] Svelte Meeting/Text/Settings/First Setup ownership, coherent Meeting projection, gated transcript polling, atomic audio-device selection, active-session settings/helper-restart isolation, truthful matched Meeting-route pair identity with generation-stable endpoint selection, user-safe Text result separation, generation-bound functional outbound AI readiness before Meeting Live, outbound helper priority continuity across ASR/translation/TTS, bounded in-session outbound helper transport recovery, optional incoming freshness/failure isolation with no stale-event retry, bounded Stop-time helper recovery, native Meeting output preflight before authority, duration-grounded Meeting route delivery deadline, truthful ASR attention state, bounded newest-preferred finalized speech backlog, familiar translation interaction hierarchy, runtime bridge, settings schema, Meeting lifecycle, and canonical MiLMMT worker contracts are source-aligned. Dependency install, Svelte compile/render, model execution, Windows audio playback, and installed-runtime proof remain separate.");