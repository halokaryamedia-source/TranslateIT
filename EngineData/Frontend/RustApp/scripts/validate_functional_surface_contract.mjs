import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];

function read(relativePath) {
  const path = resolve(appRoot, relativePath);
  if (!existsSync(path)) {
    errors.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(path, "utf8");
}
function expect(content, marker, label) {
  if (!content.includes(marker)) errors.push(`${label}: missing ${marker}`);
}
function expectAny(content, markers, label) {
  if (!markers.some((marker) => content.includes(marker))) errors.push(`${label}: missing one of ${markers.join(" | ")}`);
}
function reject(content, marker, label) {
  if (content.includes(marker)) errors.push(`${label}: forbidden ${marker}`);
}
function collect(source, regex, group = 1) {
  const values = [];
  let match;
  while ((match = regex.exec(source))) values.push(match[group]);
  return Array.from(new Set(values)).sort();
}

const runtimeApi = read("src/app/bridge/runtimeApi.ts");
const facade = read("src/app/bridge/runtimeProductFacade.ts");
const controller = read("src/app/simple-launcher/SimpleLauncherController.ts");
const shell = read("src/app/active-launcher/lockedReferenceShellParts.ts");
const registry = read("src-tauri/src/commands/registry.rs");
const chatViews = read("src/app/active-launcher/chatViews.ts");
const styles = read("src/mainPageLayout.css");
const commandModules = [
  read("src-tauri/src/commands/text_translate.rs"),
  read("src-tauri/src/commands/helper_bridge.rs"),
  read("src-tauri/src/commands/helper_bridge_runtime.rs"),
  read("src-tauri/src/commands/audio.rs"),
  read("src-tauri/src/commands/settings.rs"),
  read("src-tauri/src/commands/chat.rs"),
  read("src-tauri/src/commands/runtime.rs"),
  read("src-tauri/src/commands/pipeline_handoff.rs"),
  read("src-tauri/src/commands/asr_payload_boundary.rs"),
].join("\n");

const shellIds = collect(shell, /id=\"([A-Za-z0-9_-]+)\"/g);
const requiredSelectors = collect(controller, /requireElement<[^>]+>\(\"#([A-Za-z0-9_-]+)\"\)/g);
const missingSelectors = requiredSelectors.filter((id) => !shellIds.includes(id));
for (const id of missingSelectors) errors.push(`Controller requires #${id}, but shell does not render it.`);

const commandMap = [
  ["translate text", "translateText", "translate_text"],
  ["runtime status", "getStatusBundle", "get_runtime_status_bundle"],
  ["diagnostics", "getDiagnostics", "get_runtime_diagnostics"],
  ["settings load", "loadSettings", "load_runtime_settings"],
  ["settings save", "saveSettings", "save_runtime_settings"],
  ["settings default", "saveDefaultSettings", "save_default_runtime_settings"],
  ["helper status", "getHelperBridgeStatus", "get_helper_bridge_status"],
  ["helper start", "startHelperBridge", "start_helper_bridge"],
  ["helper request", "sendHelperBridgeRequest", "send_helper_bridge_request"],
  ["helper worker status", "helperBridgeWorkerStatus", "helper_bridge_worker_status"],
  ["models inventory", "getModelInventory", "get_model_inventory"],
  ["models verify", "verifyModels", "verify_models"],
  ["gpu policy", "getGpuPolicy", "get_gpu_policy"],
  ["audio devices", "listAudioDevices", "list_audio_devices"],
  ["audio input status", "getInputStatus", "get_input_status"],
  ["voice prepare", "prepareVoiceCapture", "prepare_voice_capture"],
  ["voice start", "startCapture", "start_capture"],
  ["voice stop", "stopCapture", "stop_capture"],
  ["chat create", "createChatSession", "create_chat_session"],
  ["chat append", "appendChatMessage", "append_chat_message"],
  ["chat list", "listChatSessions", "list_chat_sessions"],
];
for (const [label, frontendMarker, rustMarker] of commandMap) {
  expect(runtimeApi, frontendMarker, `runtimeApi ${label}`);
  expect(registry, rustMarker, `registry ${label}`);
  expect(commandModules, rustMarker, `rust command module ${label}`);
}

for (const marker of [
  "runProductTranslation", "runtimeApi.translateText", "runProductSetupAction", "runtimeApi.startHelperBridge",
  "runtimeApi.getHelperBridgeStatus", "runtimeApi.verifyModels", "runtimeApi.getInputStatus", "loadProductRuntimeSnapshot",
  "runtimeApi.getStatusBundle", "runtimeApi.getDiagnostics", "runtimeApi.getModelInventory", "runtimeApi.getGpuPolicy",
]) expect(facade, marker, "runtime product facade functional wiring");

const controllerActions = [
  ["Translate button", "sendButton.addEventListener", "submitText"],
  ["Enter shortcut", "messageInput.addEventListener", "submitText"],
  ["Attach text", "composerPlusButton.addEventListener", "ingestAttachmentFiles"],
  ["Start helper", "startHelperButton.addEventListener", "start-helper"],
  ["Check worker", "checkWorkerStatusButton.addEventListener", "check-worker"],
  ["Check microphone", "checkMicButton.addEventListener", "check-microphone"],
  ["Voice button", "microphoneButton.addEventListener", "toggleVoice"],
  ["Record status", "recordStatusButton.addEventListener", "toggleVoice"],
  ["Settings", "settingsButton.addEventListener", "showSettings"],
  ["Back home", "backHomeButton.addEventListener", "showHome"],
  ["Developer diagnostics", "openDeveloperDiagnosticsButton.addEventListener", "developer"],
];
for (const [label, binding, handler] of controllerActions) {
  expect(controller, binding, `${label} binding`);
  expect(controller, handler, `${label} handler`);
}

for (const marker of [
  "Text is too long", "Type text before translating", "Translating with local engine", "Translation completed",
  "Translation blocked", "Voice setup is not ready", "Attachment read failed", "Saving settings", "Restoring defaults",
]) expect(controller, marker, "user-facing failure/success feedback");

for (const marker of [
  "sendButton", "messageInput", "composerPlusButton", "startHelperButton", "checkWorkerStatusButton", "checkMicButton",
  "openDeveloperDiagnosticsButton", "microphoneButton", "settingsButton", "backHomeButton", "chatList", "assistantMessage", "developerOutput",
]) expect(shell, marker, "shell required control");

for (const marker of ["escapeHtml", "cleanDisplayText", "TRANSLATION_PENDING_MESSAGE", "data-copy-translation"]) expect(chatViews, marker, "translation result safety");
for (const marker of [".simple-workspace", ".simple-translate-card", ".simple-composer textarea", ".simple-send-button", ".simple-status-card", ".simple-result-area"]) expect(styles, marker, "simple UI style");
expectAny(controller, ["MAX_MANUAL_TRANSLATION_CHARS", "exceedsManualTranslationLimit"], "manual translation guard");
expectAny(controller, ["MAX_ATTACHMENT_BYTES", "MAX_ATTACHMENT_FILES"], "attachment guard");
reject(controller, "alert(", "simple controller must use inline feedback");
reject(controller, "confirm(", "simple controller must use inline feedback");

const addEventTargets = collect(controller, /this\.ui\.([A-Za-z0-9_]+)\.addEventListener/g);
if (addEventTargets.length < 18) warnings.push(`Only ${addEventTargets.length} UI event targets found; review if new UI actions were added without bindings.`);

if (errors.length > 0) {
  console.error("Functional surface contract failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  if (warnings.length) warnings.forEach((warning) => console.warn(`warning: ${warning}`));
  process.exit(1);
}
if (warnings.length) warnings.forEach((warning) => console.warn(`warning: ${warning}`));
console.log(`Functional surface contract passed: ${requiredSelectors.length} DOM selectors, ${addEventTargets.length} event targets, ${commandMap.length} command surfaces, facade wiring, result safety, and feedback states are covered.`);
