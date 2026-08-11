import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const paths = {
  index: resolve(root, "index.html"),
  main: resolve(root, "src/main.ts"),
  shell: resolve(root, "src/app/active-launcher/lockedReferenceShellParts.ts"),
  controller: resolve(root, "src/app/simple-launcher/SimpleLauncherController.ts"),
  settingsRenderer: resolve(root, "src/app/active-launcher/launcherSettingsRenderer.ts"),
  settingsActions: resolve(root, "src/app/active-launcher/launcherSettingsActions.ts"),
  firstSetup: resolve(root, "src/app/first-setup/FirstSetupBootstrap.ts"),
  frontendTypes: resolve(root, "src/app/shared/types.ts"),
  frontendState: resolve(root, "src/app/shared/state.ts"),
  runtimeApi: resolve(root, "src/app/bridge/runtimeApi.ts"),
  facade: resolve(root, "src/app/bridge/runtimeProductFacade.ts"),
  registry: resolve(root, "src-tauri/src/commands/registry.rs"),
  commandsMod: resolve(root, "src-tauri/src/commands/mod.rs"),
  commandAudio: resolve(root, "src-tauri/src/commands/audio.rs"),
  commandSettings: resolve(root, "src-tauri/src/commands/settings.rs"),
  meetingSession: resolve(root, "src-tauri/src/commands/meeting_session.rs"),
  engineMod: resolve(root, "src-tauri/src/engine/mod.rs"),
  settingsRust: resolve(root, "src-tauri/src/engine/settings.rs"),
  runtimeSettingsRust: resolve(root, "src-tauri/src/engine/runtime_settings.rs"),
  audioMod: resolve(root, "src-tauri/src/engine/audio/mod.rs"),
  liveCapture: resolve(root, "src-tauri/src/engine/audio/live_capture.rs"),
  meetingSound: resolve(root, "src-tauri/src/engine/audio/meeting_sound_capture.rs"),
  captureLifecycle: resolve(root, "src-tauri/src/engine/capture_lifecycle.rs"),
  runtimeState: resolve(root, "src-tauri/src/engine/runtime_state.rs"),
  helperBridge: resolve(root, "src-tauri/src/commands/helper_bridge.rs"),
  textTranslate: resolve(root, "src-tauri/src/commands/text_translate.rs"),
  worker: resolve(root, "../../Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py"),
  modelManifest: resolve(root, "../../Backend/LocalWorker/WorkerRuntime/model_manifest.json"),
};

for (const [label, path] of Object.entries(paths)) {
  if (!existsSync(path)) throw new Error(`Missing ${label}: ${path}`);
}
const source = Object.fromEntries(
  Object.entries(paths).map(([label, path]) => [label, readFileSync(path, "utf8")]),
);

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
  const path = resolve(root, relativePath);
  if (existsSync(path)) throw new Error(`${label} must remain removed: ${relativePath}`);
}

// One normal product entry.
requireMarkers(source.index, "frontend entry", ['/src/main.ts']);
forbidMarkers(source.index, "frontend entry", ["audioStudioEntry", "audioStudioThemeEntry"]);
const moduleEntries = [...source.index.matchAll(/<script\s+type=["']module["'][^>]*src=["']([^"']+)["']/g)]
  .map((match) => match[1]);
if (moduleEntries.length !== 1 || moduleEntries[0] !== "/src/main.ts") {
  throw new Error(`Expected one frontend module entry, found ${moduleEntries.join(", ")}`);
}

requireMarkers(source.main, "desktop entrypoint", [
  "SimpleLauncherController",
  "startDesktopWithFirstSetup",
  "startGlobalMeetingShell",
  "startMeetingLiveActivityPresentation",
]);
forbidMarkers(source.main, "desktop entrypoint", ["audioStudio", "mountVirtualRouteSelectionSurface"]);

requireMarkers(source.shell, "initial desktop surface", [
  'data-workspace-nav="meeting"',
  'data-workspace-nav="text"',
  'id="settingsButton"',
  'tab: "meeting"',
  'tab: "advanced"',
]);
forbidMarkers(source.shell, "initial desktop surface", [
  'data-workspace-nav="history"',
  "History & Privacy",
  '<span>Mode</span>',
  '<span>Tone</span>',
]);

requireMarkers(source.controller, "active controller", [
  'type ProductWorkspace = "meeting" | "text"',
  'type ProductSettingsTab = "meeting" | "advanced"',
  "handleMeetingPrimaryAction",
  "submitText",
  '"Start Translation"',
  '"Stop Translation"',
  "this.settings.source_language",
  "this.settings.target_language",
  "this.settings.audio.input_device_id",
  "this.settings.audio.output_device_id",
]);
forbidMarkers(source.controller, "active controller", [
  "Pause Translation",
  "Resume Translation",
  "createTextHistoryEntry",
  "runtime_profile",
  "latestGpuPolicy",
  "latestModelInventory",
]);

const requiredApiCommands = [
  "get_meeting_session_status",
  "get_meeting_committed_turns",
  "start_meeting_translation",
  "stop_meeting_translation",
  "get_helper_bridge_status",
  "start_helper_bridge",
  "helper_bridge_worker_status",
  "start_capture",
  "stop_capture",
  "get_input_status",
  "list_audio_devices",
  "probe_input_device_candidate",
  "probe_output_device_candidate",
  "load_runtime_settings",
  "save_runtime_settings",
  "translate_text",
  "verify_models",
];
requireMarkers(source.runtimeApi, "frontend bridge", requiredApiCommands.map((command) => `"${command}"`));
forbidMarkers(source.runtimeApi, "frontend bridge", [
  "audio_studio",
  "chat_session",
  "history_entry",
  "seed_dev_",
  "pipeline_contract_smoke",
  "prepare_asr_handoff",
  "dispatch_asr_handoff",
  "setup_models",
  "get_gpu_policy",
  "get_runtime_status_bundle",
  "get_runtime_diagnostics",
  "helper_bridge_preload",
  "helper_bridge_synthesize",
]);

requireMarkers(source.facade, "product facade", [
  "translationIdEnReady",
  "translationEnIdReady",
  "readiness.translation_id_en === true",
  "readiness.translation_en_id === true",
  "selectedTextDirection(settings)",
  "settings.source_language",
  "settings.target_language",
  "loadProductRuntimeSnapshot",
  "getMeetingSessionStatus",
  "getHelperBridgeStatus",
  "getInputStatus",
]);
forbidMarkers(source.facade, "normal readiness", [
  "getStatusBundle",
  "getDiagnostics",
  "getModelInventory",
  "getGpuPolicy",
  "translation_realtime",
  "translation_quality",
]);

requireMarkers(source.registry, "production registry", requiredApiCommands);
forbidMarkers(source.registry, "production registry", [
  "audio_studio",
  "history::",
  "chat::",
  "professional_readiness",
  "seed_dev_",
  "prepare_asr_handoff",
  "setup_models",
  "get_gpu_policy",
  "get_runtime_diagnostics",
]);

// Persisted settings stay one small owner. Serde reads the previous larger JSON shape
// by ignoring unknown legacy keys; save_pretty writes only the current schema.
requireMarkers(source.settingsRust, "Rust settings owner", [
  "const CURRENT_SCHEMA_VERSION: u32 = 6;",
  "#[serde(default)]",
  "pub source_language: String",
  "pub target_language: String",
  "pub meeting_setup_state: String",
  "pub meeting_setup_checkpoint: u8",
  "pub input_device_id: Option<String>",
  "pub output_device_id: Option<String>",
  "legacy_settings_shape_is_read_without_persisting_retired_fields",
]);
requireMarkers(source.frontendTypes, "frontend settings type", [
  "schema_version: number",
  "source_language: string",
  "target_language: string",
  'meeting_setup_state: "new" | "deferred" | "completed" | string',
  "meeting_setup_checkpoint: number",
  "input_device_id: string | null",
  "output_device_id: string | null",
]);
requireMarkers(source.frontendState, "frontend settings defaults", [
  "schema_version: 6",
  'source_language: "id"',
  'target_language: "en"',
  'meeting_setup_state: "new"',
  "meeting_setup_checkpoint: 1",
  "input_device_id: null",
  "output_device_id: null",
]);

const retiredSettingsMarkers = [
  "language_focus_mode",
  "runtime_profile",
  "history_enabled",
  "input_sensitivity",
  "show_advanced_devices",
  "allow_low_but_usable_input",
  "allow_cpu_degraded_mode",
  "auto_play_translation_voice",
  "auto_play_out_voice",
  "use_custom_voice_actor",
  "voice_actor_profiles_root",
  "voice_actor_profile_id",
];
const settingsImplementation = source.settingsRust.split("#[cfg(test)]")[0];
forbidMarkers(settingsImplementation, "persisted Rust settings schema", retiredSettingsMarkers);
forbidMarkers(settingsImplementation, "persisted Rust settings schema", ["pub sensitivity:"]);
forbidMarkers(source.frontendTypes, "frontend settings type", [...retiredSettingsMarkers, "sensitivity: number"]);
forbidMarkers(source.frontendState, "frontend settings defaults", retiredSettingsMarkers);
forbidMarkers(source.commandSettings, "settings command boundary", [
  "runtime_profile",
  "save_default_runtime_settings",
]);
forbidMarkers(source.runtimeSettingsRust, "runtime settings loader", ["save_default_settings"]);
forbidMarkers(source.engineMod, "engine settings facade", ["save_default_settings"]);

requireMarkers(source.textTranslate, "Text settings caller", [
  "settings.source_language",
  "settings.target_language",
]);
requireMarkers(source.liveCapture, "microphone preference caller", ["input_device_id"]);
requireMarkers(source.meetingSound, "Meeting Sound preference caller", ["output_device_id"]);
requireMarkers(source.firstSetup, "First Setup settings caller", [
  "meeting_setup_state",
  "meeting_setup_checkpoint",
  "audio.input_device_id",
  "audio.output_device_id",
]);
requireMarkers(source.settingsRenderer, "Meeting settings caller", [
  "settings.audio.input_device_id",
  "settings.audio.output_device_id",
]);
requireMarkers(source.settingsActions, "Text direction settings caller", [
  "source_language",
  "target_language",
]);

// Rust engine root is intentionally small. ASR/translation/TTS execution belongs to
// the persistent local worker, not a second Rust planning/inference architecture.
const expectedEngineModules = [
  "pub mod audio;",
  "pub mod capture_lifecycle;",
  "pub mod logging;",
  "pub mod paths;",
  "pub mod runtime_settings;",
  "pub mod runtime_state;",
  "pub mod settings;",
  "pub mod state;",
];
requireMarkers(source.engineMod, "engine root", expectedEngineModules);
forbidMarkers(source.engineMod, "engine root", [
  "#![allow(dead_code)]",
  "pub mod adapters;",
  "pub mod diagnostics;",
  "pub mod history_store;",
  "pub mod inference;",
  "pub mod native_execution;",
  "pub mod native_runners;",
  "pub mod session_chat;",
  "pub mod session_store;",
  "pub mod status_runtime;",
  "pub mod transcript;",
  "pub mod transcript_session;",
]);

requireMarkers(source.audioMod, "active audio graph", [
  "pub mod evidence;",
  "pub mod finalized_utterance;",
  "pub mod input;",
  "pub mod live_audio_buffer;",
  "pub mod live_capture;",
  "pub mod live_segment_writer;",
  "pub mod meeting_sound_capture;",
  "pub mod vad;",
]);
forbidMarkers(source.audioMod, "retired audio planning graph", [
  "pub mod calibration;",
  "pub mod capture_gate;",
  "pub mod capture_plan;",
  "pub mod device;",
  "pub mod input_config;",
  "pub mod noise_filter;",
  "pub mod preprocess;",
  "pub mod stream_build;",
]);

requireMarkers(source.commandAudio, "current audio command surface", [
  "pub fn list_audio_devices()",
  "pub fn probe_input_device_candidate",
  "pub fn probe_output_device_candidate",
  "pub fn get_input_status()",
]);
forbidMarkers(source.commandAudio, "retired audio command planning", [
  "analyze_realtime_handoff",
  "analyze_frame_pipeline",
  "analyze_audio_payload",
  "run_calibration_flow",
  "build_native_capture_bridge",
  "plan_capture_stream",
]);

requireMarkers(source.captureLifecycle, "Mic Test lifecycle", [
  "record_direct_live_capture_session",
  "start_live_capture_runtime",
  "stop_live_capture_runtime",
  "clear_runtime_session_state",
]);
forbidMarkers(source.captureLifecycle, "retired capture lifecycle", [
  "analyze_start_lifecycle_gate",
  "Realtime Handoff",
  "write_latest_live_target_segment_wav",
  "clear_legacy_audio_pipeline_evidence",
]);

requireMarkers(source.runtimeState, "current runtime authority", [
  "begin_application_meeting_session",
  "commit_application_meeting_session_live",
  "revoke_application_meeting_session_authority",
  "runtime_generation_is_authoritative",
  "record_direct_live_capture_session",
  "latest_runtime_session_state",
  "clear_runtime_session_state",
]);
forbidMarkers(source.runtimeState, "retired handoff state", [
  "RealtimeHandoffReport",
  "RUNTIME_HANDOFF_STATE",
  "RuntimeHandoffSnapshot",
  "record_realtime_handoff_report",
  "record_runtime_session_start",
]);

for (const [relativePath, label] of [
  ["src-tauri/src/engine/adapters", "adapter planning tree"],
  ["src-tauri/src/engine/history_store.rs", "History persistence engine"],
  ["src-tauri/src/engine/session_chat.rs", "session chat engine"],
  ["src-tauri/src/engine/session_store.rs", "session save engine"],
  ["src-tauri/src/engine/transcript_session.rs", "transcript session planner"],
  ["src-tauri/src/engine/inference", "native inference candidate tree"],
  ["src-tauri/src/engine/domain", "empty domain scaffold"],
  ["src-tauri/src/engine/services", "empty services scaffold"],
]) {
  requireAbsent(relativePath, label);
}

requireMarkers(source.runtimeState, "Meeting lifecycle", [
  'phase: "starting".to_string()',
  'snapshot.phase = "live".to_string()',
  'snapshot.phase = "stopping".to_string()',
]);
forbidMarkers(source.runtimeState, "Meeting lifecycle", [
  "begin_application_meeting_session_resume",
  'phase: "paused"',
  'phase: "resuming"',
]);
forbidMarkers(source.meetingSession, "Meeting commands", ["pause_meeting_translation", "resume_meeting_translation"]);
requireMarkers(source.meetingSession, "Meeting commands", ['snapshot.phase == "live"']);

requireMarkers(source.worker, "direction-based worker", [
  'TRANSLATION_MODEL_ID_EN = TRANSLATION_MODEL_ROOT / "marianmt-id-en"',
  'TRANSLATION_MODEL_EN_ID = TRANSLATION_MODEL_ROOT / "marianmt-en-id"',
  "def translation_model_for_direction(",
  'if pair == "id->en"',
  'if pair == "en->id"',
  '"translation_id_en"',
  '"translation_en_id"',
  'tokenizer(text, return_tensors="pt", truncation=False)',
  "translation_generation_completion",
]);
forbidMarkers(source.worker, "direction-based worker", [
  "QUALITY_TRANSLATION_MODEL",
  "NLLB_LANGUAGE_CODES",
  "translation_model_for_mode",
]);

const manifest = JSON.parse(source.modelManifest);
const models = Array.isArray(manifest.models) ? manifest.models : [];
if (!models.some((model) => model.model_id === "marianmt-id-en")) throw new Error("Missing marianmt-id-en inventory entry");
if (!models.some((model) => model.model_id === "marianmt-en-id")) throw new Error("Missing marianmt-en-id inventory entry");
if (models.some((model) => model.model_id === "nllb-200-distilled-600M")) throw new Error("NLLB must not return to current translation inventory");
if (models.some((model) => Object.hasOwn(model, "revision") || Object.hasOwn(model, "checksum"))) {
  throw new Error("Initial model inventory must not grow revision/checksum release-identity placeholders");
}

console.log("[startup-readiness] Small Meeting/Text product, persisted settings schema, and Rust engine source graph are aligned. Compile, model execution, Windows audio, and installed-runtime proof remain separate.");
