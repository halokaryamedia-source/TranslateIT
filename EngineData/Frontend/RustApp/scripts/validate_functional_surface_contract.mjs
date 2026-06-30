import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const read = (p) => { const f = resolve(appRoot, p); if (!existsSync(f)) { errors.push(`Missing required file: ${p}`); return ""; } return readFileSync(f, "utf8"); };
const expect = (s, m, label) => { if (!s.includes(m)) errors.push(`${label}: missing ${m}`); };
const expectAny = (s, ms, label) => { if (!ms.some((m) => s.includes(m))) errors.push(`${label}: missing one of ${ms.join(" | ")}`); };
const reject = (s, m, label) => { if (s.includes(m)) errors.push(`${label}: forbidden ${m}`); };
const collect = (s, r, group = 1) => { const out = []; let match; while ((match = r.exec(s))) out.push(match[group]); return Array.from(new Set(out)).sort(); };

const runtimeApi = read("src/app/bridge/runtimeApi.ts");
const facade = read("src/app/bridge/runtimeProductFacade.ts");
const controller = read("src/app/simple-launcher/SimpleLauncherController.ts");
const shell = read("src/app/active-launcher/lockedReferenceShellParts.ts");
const registry = read("src-tauri/src/commands/registry.rs");
const chatViews = read("src/app/active-launcher/chatViews.ts");
const styles = read("src/mainPageLayout.css");
const commandModules = [
  "diagnostics.rs", "text_translate.rs", "helper_bridge.rs", "helper_bridge_runtime.rs", "runtime_capture.rs", "audio.rs", "settings.rs", "chat.rs", "runtime.rs", "pipeline_handoff.rs", "asr_payload_boundary.rs",
].map((name) => read(`src-tauri/src/commands/${name}`)).join("\n");

const shellIds = collect(shell, /id=\"([A-Za-z0-9_-]+)\"/g);
const requiredSelectors = collect(controller, /requireElement<[^>]+>\(\"#([A-Za-z0-9_-]+)\"\)/g);
for (const id of requiredSelectors.filter((id) => !shellIds.includes(id))) errors.push(`Controller requires #${id}, but shell does not render it.`);

const commandMap = [
  ["translate text", "translateText", "translate_text"], ["runtime status", "getStatusBundle", "get_runtime_status_bundle"], ["diagnostics", "getDiagnostics", "get_runtime_diagnostics"],
  ["settings load", "loadSettings", "load_runtime_settings"], ["settings save", "saveSettings", "save_runtime_settings"], ["settings default", "saveDefaultSettings", "save_default_runtime_settings"],
  ["helper status", "getHelperBridgeStatus", "get_helper_bridge_status"], ["helper start", "startHelperBridge", "start_helper_bridge"], ["helper request", "sendHelperBridgeRequest", "send_helper_bridge_request"], ["helper worker", "helperBridgeWorkerStatus", "helper_bridge_worker_status"],
  ["models inventory", "getModelInventory", "get_model_inventory"], ["models verify", "verifyModels", "verify_models"], ["gpu policy", "getGpuPolicy", "get_gpu_policy"],
  ["audio devices", "listAudioDevices", "list_audio_devices"], ["audio input status", "getInputStatus", "get_input_status"], ["voice prepare", "prepareVoiceCapture", "prepare_voice_capture"], ["voice start", "startCapture", "start_capture"], ["voice stop", "stopCapture", "stop_capture"],
  ["chat create", "createChatSession", "create_chat_session"], ["chat append", "appendChatMessage", "append_chat_message"], ["chat list", "listChatSessions", "list_chat_sessions"],
];
for (const [label, frontendMarker, rustMarker] of commandMap) { expect(runtimeApi, frontendMarker, `runtimeApi ${label}`); expect(registry, rustMarker, `registry ${label}`); expect(commandModules, rustMarker, `rust command module ${label}`); }

for (const m of ["runProductTranslation", "runtimeApi.translateText", "runProductSetupAction", "runtimeApi.startHelperBridge", "runtimeApi.getHelperBridgeStatus", "runtimeApi.verifyModels", "runtimeApi.getInputStatus", "loadProductRuntimeSnapshot", "runtimeApi.getStatusBundle", "runtimeApi.getDiagnostics", "runtimeApi.getModelInventory", "runtimeApi.getGpuPolicy"]) expect(facade, m, "runtime product facade functional wiring");
for (const [label, binding, handler] of [["Translate", "sendButton.addEventListener", "submitText"], ["Enter", "messageInput.addEventListener", "submitText"], ["Attach", "composerPlusButton.addEventListener", "ingestAttachmentFiles"], ["Start helper", "startHelperButton.addEventListener", "start-helper"], ["Check worker", "checkWorkerStatusButton.addEventListener", "check-worker"], ["Check mic", "checkMicButton.addEventListener", "check-microphone"], ["Voice", "microphoneButton.addEventListener", "toggleVoice"], ["Settings", "settingsButton.addEventListener", "showSettings"], ["Back", "backHomeButton.addEventListener", "showHome"], ["Diagnostics", "openDeveloperDiagnosticsButton.addEventListener", "developer"]]) { expect(controller, binding, `${label} binding`); expect(controller, handler, `${label} handler`); }
for (const m of ["Text is too long", "Type text before translating", "Translating with local engine", "Translation completed", "Translation blocked", "Voice setup is not ready", "Attachment read failed", "Saving settings", "Restoring defaults"]) expect(controller, m, "user-facing feedback");
for (const m of ["sendButton", "messageInput", "composerPlusButton", "startHelperButton", "checkWorkerStatusButton", "checkMicButton", "openDeveloperDiagnosticsButton", "microphoneButton", "settingsButton", "backHomeButton", "chatList", "assistantMessage", "developerOutput"]) expect(shell, m, "shell required control");
for (const m of ["escapeHtml", "cleanDisplayText", "TRANSLATION_PENDING_MESSAGE", "data-copy-translation"]) expect(chatViews, m, "translation result safety");
for (const m of [".simple-workspace", ".simple-translate-card", ".simple-composer textarea", ".simple-send-button", ".simple-status-card", ".simple-result-area"]) expect(styles, m, "simple UI style");
expectAny(controller, ["MAX_MANUAL_TRANSLATION_CHARS", "exceedsManualTranslationLimit"], "manual translation guard");
expectAny(controller, ["MAX_ATTACHMENT_BYTES", "MAX_ATTACHMENT_FILES"], "attachment guard");
reject(controller, "alert(", "simple controller must use inline feedback");
reject(controller, "confirm(", "simple controller must use inline feedback");
const addEventTargets = collect(controller, /this\.ui\.([A-Za-z0-9_]+)\.addEventListener/g);
if (addEventTargets.length < 15) errors.push(`Only ${addEventTargets.length} UI event targets found; expected at least 15.`);
if (errors.length) { console.error("Functional surface contract failed:"); errors.forEach((e) => console.error(`- ${e}`)); process.exit(1); }
console.log(`Functional surface contract passed: ${requiredSelectors.length} DOM selectors, ${addEventTargets.length} event targets, ${commandMap.length} command surfaces, facade wiring, result safety, and feedback states are covered.`);
