import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

const main = read("src/main.ts");
const shell = read("src/app/active-launcher/shell.ts");
const chatViews = read("src/app/active-launcher/chatViews.ts");
const controller = read("src/app/active-launcher/launcherController.ts");
const settingsViews = read("src/app/active-launcher/settingsViews.ts");
const referenceLayout = read("src/referenceLayout.css");
const professionalUi = read("src/professionalUi.css");
const referenceBinding = read("src/app/active-launcher/referenceUiBinding.ts");
const primitives = read("src/app/active-launcher/referenceUiPrimitives.ts");
const guide = read("ui-reference.md");
const imageManifest = read("EngineData/Frontend/RustApp/docs/ui-reference/reference_images_manifest.json");
const realtimeRefresh = read("src/app/active-launcher/realtimeStatusPayloadRefresh.ts");
const audioWatcher = read("src/app/active-launcher/audioPipelineResultWatcher.ts");

const errors = [];

function requireContains(label, content, needle) {
  if (!content.includes(needle)) errors.push(`${label} is missing: ${needle}`);
}

function requireNotContains(label, content, needle) {
  if (content.includes(needle)) errors.push(`${label} must not include: ${needle}`);
}

function requireOrdered(label, content, first, second) {
  const firstIndex = content.indexOf(first);
  const secondIndex = content.indexOf(second);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex >= secondIndex) {
    errors.push(`${label} order is invalid: ${first} must appear before ${second}`);
  }
}

const requiredMainImportOrder = [
  'import "./styles.css";',
  'import "./launcherGuard.css";',
  'import "./professionalUi.css";',
  'import "./referenceLayout.css";',
  'import "./mainPageLayout.css";',
  'import "./audioSettingsLayout.css";',
  'import "./translateSettingsLayout.css";',
  'import "./developerSettingsLayout.css";'
];

for (const importLine of requiredMainImportOrder) requireContains("main.ts", main, importLine);
for (let index = 0; index < requiredMainImportOrder.length - 1; index += 1) {
  requireOrdered("main.ts", main, requiredMainImportOrder[index], requiredMainImportOrder[index + 1]);
}
requireContains("main.ts", main, "bindReferenceUi();");
requireContains("main.ts", main, "bindAttachmentLimitWatcher();");
requireContains("main.ts", main, "bindResultWatcher();");
requireContains("main.ts", main, "startRealtimeStatusPayloadAutoRefresh();");
requireContains("realtimeStatusPayloadRefresh.ts", realtimeRefresh, "window.setInterval");
requireContains("realtimeStatusPayloadRefresh.ts", realtimeRefresh, "document.hidden");
requireContains("realtimeStatusPayloadRefresh.ts", realtimeRefresh, "developerOutput");
requireContains("audioPipelineResultWatcher.ts", audioWatcher, "translationResultView");
requireContains("audioPipelineResultWatcher.ts", audioWatcher, "renderCompletedResult(evidence);");
requireContains("audioPipelineResultWatcher.ts", audioWatcher, "#chatList");

const requiredShellCopy = [
  "Speak Indonesian. Get translated English voice output.",
  "Type a message, or press the microphone button on the right to record speech locally.",
  "Ask anything...",
  "Local runtime is checking. You can type text or start recording after warmup.",
  "Type or paste Indonesian text and get an English translation in the conversation."
];

for (const copy of requiredShellCopy) requireContains("shell.ts", shell, copy);

const requiredIds = [
  "messageInput",
  "sendButton",
  "attachmentInput",
  "composerPlusButton",
  "microphoneButton",
  "quickMicButton",
  "recordStatusButton",
  "voiceOutputButton",
  "settingsButton",
  "backHomeButton",
  "saveSettingsButton",
  "resetSettingsButton",
  "checkAudioInputButton",
  "audioVoiceToggleButton",
  "micTestButton",
  "sourceLanguageButton",
  "targetLanguageButton",
  "swapLanguageButton",
  "saveTranslateButton",
  "realtimeModeButton",
  "qualityModeButton",
  "runDiagnosticButton",
  "seeAllLogsButton"
];

for (const id of requiredIds) {
  const owner = shell.includes(`id="${id}"`) || settingsViews.includes(`id="${id}"`);
  if (!owner) errors.push(`Required UI/backend contract id is missing: #${id}`);
  requireContains("referenceUiPrimitives.ts", primitives, `"${id}"`);
  requireContains("ui-reference.md", guide, `#${id}`);
}

const requiredCssTokens = [
  "--ref-main-sidebar: 360px;",
  "--ref-settings-sidebar: 322px;",
  "--ref-settings-content-width: 993px;",
  ".topbar { min-height: 72px",
  ".settings-topbar-v22 { min-height: 72px",
  ".hero-panel { width: 720px",
  ".composer-wrap { width: 990px"
];

for (const token of requiredCssTokens) {
  requireContains("referenceLayout.css", referenceLayout, token);
  if (token.startsWith("--ref-")) requireContains("ui-reference.md", guide, token.split(":")[0]);
}

const requiredProfessionalTokens = [
  ".translation-result-card",
  ".ui-toast",
  ".developer-log-row",
  ":focus-visible"
];

for (const token of requiredProfessionalTokens) requireContains("professionalUi.css", professionalUi, token);
requireContains("chatViews.ts", chatViews, "translationResultView");
requireContains("chatViews.ts", chatViews, "data-copy-translation");
requireContains("launcherController.ts", controller, "translationResultView(source, response, this.voiceOutputStatus())");
requireContains("referenceUiBinding.ts", referenceBinding, "copyTranslation(");
requireContains("referenceUiBinding.ts", referenceBinding, "showToast(");
requireContains("referenceUiBinding.ts", referenceBinding, "Saving settings...");

const requiredReferenceImages = [
  "main_page_v28_reference.png",
  "audio_settings_v22_reference.png",
  "translate_settings_v14_reference.png",
  "developer_settings_v37_reference.png"
];

for (const filename of requiredReferenceImages) requireContains("reference_images_manifest.json", imageManifest, filename);

const forbiddenBindingPatterns = [
  "new MutationObserver",
  "setText(",
  "setInputPlaceholder(",
  "setFeatureCardCopy",
  "applyReferenceCopy",
  "bindReferenceUi();\n"
];

for (const pattern of forbiddenBindingPatterns) requireNotContains("referenceUiBinding.ts", referenceBinding, pattern);

if (errors.length > 0) {
  console.error("UI reference check did not pass:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}

console.log("UI reference check passed.");


