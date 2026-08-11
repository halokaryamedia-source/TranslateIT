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
  meetingSession: resolve(root, "src-tauri/src/commands/meeting_session.rs"),
  helperBridge: resolve(root, "src-tauri/src/commands/helper_bridge.rs"),
  helperBridgeRuntime: resolve(root, "src-tauri/src/commands/helper_bridge_runtime.rs"),
  virtualAudioRouteRuntime: resolve(root, "src-tauri/src/commands/virtual_audio_route_runtime.rs"),
  settingsCommands: resolve(root, "src-tauri/src/commands/settings.rs"),
  textTranslate: resolve(root, "src-tauri/src/commands/text_translate.rs"),
  finalizedUtterance: resolve(root, "src-tauri/src/engine/audio/finalized_utterance.rs"),
  runtimeState: resolve(root, "src-tauri/src/engine/runtime_state.rs"),
  settingsRust: resolve(root, "src-tauri/src/engine/settings.rs"),
  worker: resolve(root, "../../Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py"),
  routeProvider: resolve(root, "../../Backend/LocalWorker/WorkerRuntime/virtual_audio_route_provider.py"),
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
  'type AppRoute = "meeting" | "text" | "settings"',
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
  "<Settings",
  "setupBusy={setupActionBusy}",
]);
forbidMarkers(source.app, "Svelte application owner", ["SimpleLauncherController", "MutationObserver", "Pause Translation", "Resume Translation"]);

requireMarkers(source.meeting, "Meeting surface", [
  "Start Translation",
  "Stop Translation",
  "TranslateIT Meeting Microphone",
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
  "refreshDiagnostics",
  'aria-label="Settings sections"',
  "Check Microphone",
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
  'role="progressbar"',
  "Check Again",
]);
requireMarkers(source.sidebar, "Primary navigation", ["Meeting", "Text", "Settings", "Ready to translate", "Indonesian ↔ English"]);
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

for (const [relativePath, label] of [
  ["src/app/active-launcher", "retired active-launcher DOM owner"],
  ["src/app/simple-launcher", "retired simple-launcher controller owner"],
  ["src/app/first-setup", "retired vanilla First Setup owner"],
]) requireAbsent(relativePath, label);

const requiredCommands = [
  "get_meeting_session_status", "get_meeting_committed_turns", "start_meeting_translation", "stop_meeting_translation",
  "get_helper_bridge_status", "start_helper_bridge", "helper_bridge_worker_status", "start_capture", "stop_capture",
  "get_input_status", "list_audio_devices", "probe_input_device_candidate", "probe_output_device_candidate",
  "load_runtime_settings", "save_runtime_settings", "select_audio_device", "translate_text", "verify_models",
];
requireMarkers(source.runtimeApi, "frontend bridge", requiredCommands.map((command) => `"${command}"`));
requireMarkers(source.registry, "Tauri registry", requiredCommands);
forbidMarkers(source.runtimeApi, "frontend bridge", ["audio_studio", "history_entry", "setup_models", "get_gpu_policy", "get_runtime_diagnostics"]);
requireMarkers(source.runtimeApi, "frontend bridge contracts", [
  "Promise<RuntimeSettings | null>",
  "TextTranslationCommandResult",
  "AudioDeviceSelectionCommandResult",
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
  "pub fn select_audio_device",
  "probe_input_device_candidate",
  "probe_output_device_candidate",
  "The previous preference was kept",
]);
requireMarkers(source.textTranslate, "Text translation command contract", [
  "pub struct TextTranslationResult",
  "pub translated_text: String",
  "pub user_message: String",
  "pub blocker: String",
  "TextTranslationResult::success",
  "TextTranslationResult::blocked",
]);

requireMarkers(source.helperBridge, "Meeting outbound AI preparation", [
  "fn meeting_start_prepare",
  "prepare_required_outbound_ai_runtime",
  '"meeting_start_prepare": true',
  "HelperTaskPriority::MeetingOutbound",
  'send_worker_task("asr_preload"',
  '"translation_preload"',
  'send_worker_task("tts_preflight"',
]);
requireMarkers(source.helperBridge, "Meeting outbound helper priority continuity", [
  "MEETING_OUTBOUND_PIPELINE_GENERATION",
  "meeting_outbound_pipeline_active",
  "incoming_deferred_response",
  "send_worker_task_inner",
  "incoming-deferred-before-scheduler",
  'task == "synthesize"',
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
requireMarkers(source.helperBridgeRuntime, "required outbound readiness invalidation", [
  "required_outbound_prepare_failed",
  "runtime.provider_ready = false",
  'stage == "asr_preload"',
  'stage == "tts_preflight"',
  'Some("id->en")',
]);
requireMarkers(source.meetingSession, "Meeting outbound Start hardening", [
  "prepare_required_outbound_ai_runtime",
  '"outbound_runtime_prepare_failed"',
  '"blocked_after_runtime_prepare"',
  'if empty { "listening" } else { "attention_needed" }',
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
requireMarkers(source.virtualAudioRouteRuntime, "Meeting route provider preflight", [
  "pub fn prepare_meeting_virtual_audio_route_provider()",
  '"preflight_only": true',
  '"preflight_verified"',
  '"audio_route_ready"',
  "resolve_worker_python_command",
  "get_virtual_mic_route_selection",
]);
requireMarkers(source.routeProvider, "Meeting route provider preflight contract", [
  '"preflight_verified": False',
  "def _import_audio_runtime()",
  "def _preflight_virtual_audio(",
  "if preflight_only:",
  "preflight_verified=True",
  "audio_route_ready=True",
]);
requireMarkers(source.meetingSession, "Meeting route provider preparation before authority", [
  "prepare_meeting_virtual_audio_route_provider",
  '"meeting_route_prepare_failed"',
  "let starting = begin_application_meeting_session();",
]);
if (source.meetingSession.indexOf("prepare_meeting_virtual_audio_route_provider()") > source.meetingSession.indexOf("let starting = begin_application_meeting_session();")) {
  throw new Error("Meeting route provider preflight must run before Meeting authority creation");
}
requireMarkers(source.virtualAudioRouteRuntime, "Meeting route delivery hang containment", [
  "MEETING_ROUTE_PROVIDER_PREFLIGHT_ELAPSED_MS",
  "fn wav_duration_ms(",
  "fn meeting_route_delivery_deadline_ms(",
  "audio_duration_ms.saturating_mul(2)",
  "provider_preflight_elapsed_ms",
  "delivery_started.elapsed() >= Duration::from_millis(delivery_deadline_ms)",
  '"provider_delivery_timed_out"',
  '"virtual_audio_route:provider_delivery_deadline_exceeded"',
  '"meeting_route_provider_delivery_deadline_exceeded_no_replay"',
]);
requireMarkers(source.meetingSession, "Meeting route temporary TTS ownership", [
  "let route = dispatch_meeting_virtual_audio_route_provider(tts_path.clone(), generation);",
  "remove_temporary_tts(&tts_path);",
]);
const routeDispatchIndex = source.meetingSession.indexOf("let route = dispatch_meeting_virtual_audio_route_provider(tts_path.clone(), generation);");
const routeCleanupIndex = source.meetingSession.indexOf("remove_temporary_tts(&tts_path);", routeDispatchIndex);
if (routeDispatchIndex < 0 || routeCleanupIndex < routeDispatchIndex) {
  throw new Error("Meeting temporary TTS must remain owned until synchronous route dispatch returns");
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
forbidMarkers(source.frontendTypes, "frontend settings type", ["runtime_profile", "history_enabled", "voice_actor_profile_id"]);

requireMarkers(source.runtimeState, "Meeting lifecycle", ['phase: "starting".to_string()', 'snapshot.phase = "live".to_string()', 'snapshot.phase = "stopping".to_string()', "runtime_generation_is_authoritative"]);
forbidMarkers(source.runtimeState, "Meeting lifecycle", ['phase: "paused"', 'phase: "resuming"', "clear_runtime_handoff_state"]);
forbidMarkers(source.meetingSession, "Meeting commands", ["pause_meeting_translation", "resume_meeting_translation", "reset_live_pipeline_handoff_status"]);

requireMarkers(source.worker, "direction-based worker", [
  'TRANSLATION_MODEL_ID_EN = TRANSLATION_MODEL_ROOT / "marianmt-id-en"',
  'TRANSLATION_MODEL_EN_ID = TRANSLATION_MODEL_ROOT / "marianmt-en-id"',
  "def translation_model_for_direction(",
  'if pair == "id->en"',
  'if pair == "en->id"',
  'tokenizer(text, return_tensors="pt", truncation=False)',
  "translation_generation_completion",
]);
forbidMarkers(source.worker, "direction-based worker", ["QUALITY_TRANSLATION_MODEL", "NLLB_LANGUAGE_CODES", "translation_model_for_mode"]);

const manifest = JSON.parse(source.modelManifest);
const models = Array.isArray(manifest.models) ? manifest.models : [];
if (!models.some((model) => model.model_id === "marianmt-id-en")) throw new Error("Missing marianmt-id-en inventory entry");
if (!models.some((model) => model.model_id === "marianmt-en-id")) throw new Error("Missing marianmt-en-id inventory entry");
if (models.some((model) => model.model_id === "nllb-200-distilled-600M")) throw new Error("NLLB must not return to current translation inventory");
if (models.some((model) => Object.hasOwn(model, "revision") || Object.hasOwn(model, "checksum"))) throw new Error("Initial model inventory must not grow revision/checksum release-identity placeholders");

console.log("[startup-readiness] Svelte Meeting/Text/Settings/First Setup ownership, coherent Meeting projection, gated transcript polling, atomic audio-device selection, user-safe Text result separation, required outbound AI preparation before Meeting Live, outbound helper priority continuity across ASR/translation/TTS, bounded in-session helper transport recovery, bounded Stop-time helper recovery, Meeting Microphone provider preflight before authority, duration-grounded Meeting Microphone delivery deadline, truthful ASR attention state, bounded newest-preferred finalized speech backlog, familiar translation interaction hierarchy, runtime bridge, settings schema, Meeting lifecycle, and direction-based worker contracts are source-aligned. Dependency install, Svelte compile/render, model execution, Windows audio playback, and installed-runtime proof remain separate.");