import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

const main = read("src/main.ts");
const shell = read("src/app/launcher/shell.ts");
const settingsViews = read("src/app/launcher/settingsViews.ts");
const referenceLayout = read("src/referenceLayout.css");
const referenceBinding = read("src/app/launcher/referenceUiBinding.ts");

const errors = [];

function requireContains(label, content, needle) {
  if (!content.includes(needle)) errors.push(`${label} is missing: ${needle}`);
}

function requireOrdered(label, content, first, second) {
  const firstIndex = content.indexOf(first);
  const secondIndex = content.indexOf(second);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex >= secondIndex) {
    errors.push(`${label} order is invalid: ${first} must appear before ${second}`);
  }
}

requireOrdered("main.ts", main, 'import "./styles.css";', 'import "./settingsLayout.css";');
requireOrdered("main.ts", main, 'import "./settingsLayout.css";', 'import "./launcherGuard.css";');
requireOrdered("main.ts", main, 'import "./launcherGuard.css";', 'import "./referenceLayout.css";');
requireContains("main.ts", main, "bindReferenceUi();");
requireContains("main.ts", main, "bindAttachmentLimitWatcher();");
requireContains("main.ts", main, "bindResultWatcher();");

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
  "seeAllLogsButton",
];

for (const id of requiredIds) {
  const owner = shell.includes(`id=\"${id}\"`) || settingsViews.includes(`id=\"${id}\"`);
  if (!owner) errors.push(`Required UI/backend contract id is missing: #${id}`);
}

const requiredCssTokens = [
  "--ref-main-sidebar: 360px;",
  "--ref-settings-sidebar: 322px;",
  "--ref-settings-content-width: 993px;",
  ".topbar { min-height: 72px",
  ".settings-topbar-v22 { min-height: 72px",
  ".hero-panel { width: 720px",
  ".composer-wrap { width: 990px",
];

for (const token of requiredCssTokens) requireContains("referenceLayout.css", referenceLayout, token);

const forbiddenBindingPatterns = [
  "new MutationObserver",
  "bindReferenceUi();\n",
];

for (const pattern of forbiddenBindingPatterns) {
  if (referenceBinding.includes(pattern)) errors.push(`referenceUiBinding.ts must not include side-effect or persistent mutation hook: ${pattern}`);
}

if (errors.length > 0) {
  console.error("UI reference validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("UI reference validation passed.");
