import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const paths = {
  index: resolve(root, "index.html"),
  main: resolve(root, "src/main.ts"),
  shell: resolve(root, "src/app/active-launcher/lockedReferenceShellParts.ts"),
  controller: resolve(root, "src/app/simple-launcher/SimpleLauncherController.ts"),
  runtimeApi: resolve(root, "src/app/bridge/runtimeApi.ts"),
  facade: resolve(root, "src/app/bridge/runtimeProductFacade.ts"),
  registry: resolve(root, "src-tauri/src/commands/registry.rs"),
  commandsMod: resolve(root, "src-tauri/src/commands/mod.rs"),
  meetingSession: resolve(root, "src-tauri/src/commands/meeting_session.rs"),
  runtimeState: resolve(root, "src-tauri/src/engine/runtime_state.rs"),
  helperBridge: resolve(root, "src-tauri/src/commands/helper_bridge.rs"),
  textTranslate: resolve(root, "src-tauri/src/commands/text_translate.rs"),
  worker: resolve(root, "../../Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py"),
  modelManifest: resolve(root, "../../Backend/LocalWorker/WorkerRuntime/model_manifest.json"),
};

for (const [label, path] of Object.entries(paths)) {
  if (!existsSync(path)) throw new Error(`Missing ${label}: ${path}`);
}
const source = Object.fromEntries(Object.entries(paths).map(([label, path]) => [label, readFileSync(path, "utf8")]));

function requireMarkers(body, label, markers) {
  for (const marker of markers) if (!body.includes(marker)) throw new Error(`${label} marker missing: ${marker}`);
}
function forbidMarkers(body, label, markers) {
  for (const marker of markers) if (body.includes(marker)) throw new Error(`${label} forbidden marker found: ${marker}`);
}

// One product entry. Retired feature modules must not be loaded in parallel.
requireMarkers(source.index, "frontend entry", ['/src/main.ts']);
forbidMarkers(source.index, "frontend entry", ["audioStudioEntry", "audioStudioThemeEntry"]);
const moduleEntries = [...source.index.matchAll(/<script\s+type=["']module["'][^>]*src=["']([^"']+)["']/g)].map((match) => match[1]);
if (moduleEntries.length !== 1 || moduleEntries[0] !== "/src/main.ts") throw new Error(`Expected one frontend module entry, found ${moduleEntries.join(", ")}`);

requireMarkers(source.main, "desktop entrypoint", [
  "SimpleLauncherController",
  "startDesktopWithFirstSetup",
  "startGlobalMeetingShell",
  "startMeetingLiveActivityPresentation",
]);
forbidMarkers(source.main, "desktop entrypoint", ["audioStudio", "bindDirectVoiceCaptureUi", "mountVirtualRouteSelectionSurface"]);

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
]);
forbidMarkers(source.controller, "active controller", [
  "Pause Translation",
  "Resume Translation",
  "createTextHistoryEntry",
  "listHistoryEntries",
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

requireMarkers(source.registry, "production registry", requiredApiCommands.map((command) => command));
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
forbidMarkers(source.commandsMod, "command module graph", [
  "pub mod audio_studio;",
  "pub mod history;",
  "pub mod chat;",
  "pub mod pipeline;",
  "pub mod professional_readiness_gate;",
  "pub mod runtime_preview;",
  "pub mod runtime_status;",
  "pub mod diagnostics;",
]);

requireMarkers(source.runtimeState, "Meeting lifecycle", [
  "begin_application_meeting_session",
  'phase: "starting".to_string()',
  "commit_application_meeting_session_live",
  'snapshot.phase = "live".to_string()',
  "revoke_application_meeting_session_authority",
  'snapshot.phase = "stopping".to_string()',
]);
forbidMarkers(source.runtimeState, "Meeting lifecycle", ["begin_application_meeting_session_resume", 'phase: "paused"', 'phase: "resuming"']);
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
forbidMarkers(source.worker, "direction-based worker", ["QUALITY_TRANSLATION_MODEL", "NLLB_LANGUAGE_CODES", "translation_model_for_mode"]);

const manifest = JSON.parse(source.modelManifest);
const models = Array.isArray(manifest.models) ? manifest.models : [];
const idEn = models.find((model) => model.model_id === "marianmt-id-en");
const enId = models.find((model) => model.model_id === "marianmt-en-id");
if (!idEn || !enId) throw new Error("Model manifest must contain both Marian translation directions");
if (models.some((model) => model.model_id === "nllb-200-distilled-600M")) throw new Error("NLLB must not return to current translation inventory");
if (models.some((model) => Object.hasOwn(model, "revision") || Object.hasOwn(model, "checksum"))) {
  throw new Error("Initial model inventory must not grow revision/checksum release-identity placeholders");
}

console.log("[startup-readiness] Small product source contract is aligned. Compile, model execution, Windows audio, and installed-runtime proof remain separate.");
