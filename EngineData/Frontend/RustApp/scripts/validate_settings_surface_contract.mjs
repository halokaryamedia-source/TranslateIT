import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function read(relativePath) {
  const path = resolve(appRoot, relativePath);
  if (!existsSync(path)) {
    errors.push(`Missing file: ${relativePath}`);
    return "";
  }
  return readFileSync(path, "utf8");
}
function expect(source, marker, label) {
  if (!source.includes(marker)) errors.push(`${label}: missing ${marker}`);
}

const shell = read("src/app/active-launcher/lockedReferenceShellParts.ts");
const controller = read("src/app/simple-launcher/SimpleLauncherController.ts");
const renderer = read("src/app/active-launcher/launcherSettingsRenderer.ts");
const views = read("src/app/active-launcher/settingsViews.ts");
const actions = read("src/app/active-launcher/launcherSettingsActions.ts");
const runtimeApi = read("src/app/bridge/runtimeApi.ts");

for (const marker of [
  "SETTINGS_NAV_ITEMS",
  "tab: \"general\"",
  "tab: \"translate\"",
  "tab: \"audio\"",
  "tab: \"developer\"",
  "data-settings-tab=\"${item.tab}\"",
  "settingsContent",
  "settingsButton",
  "backHomeButton",
]) expect(shell, marker, "settings shell");

for (const marker of [
  "showSettings(tab: SettingsTab",
  "renderSettings(tab: SettingsTab)",
  "renderGeneralSettingsTab",
  "renderTranslateSettingsTab",
  "renderAudioSettingsTab",
  "renderDeveloperSettingsView",
  "saveSettings",
  "resetSettings",
  "selectLanguage",
  "toggleRuntimeProfile",
  "toggleVoiceOutput",
  "settingsNavItems.forEach",
]) expect(controller, marker, "settings controller");

for (const marker of [
  "runtimeApi.saveSettings",
  "runtimeApi.loadSettings",
  "runtimeApi.saveDefaultSettings",
  "Language pair changed",
  "Language focus:",
  "Saving settings...",
  "Restoring defaults...",
]) expect(controller, marker, "settings persistence feedback");

for (const marker of [
  "renderGeneralSettingsTab",
  "renderAudioSettingsTab",
  "renderTranslateSettingsTab",
  "saveSettingsButton",
  "resetSettingsButton",
  "sourceLanguageButton",
  "targetLanguageButton",
  "swapLanguageButton",
  "realtimeModeButton",
  "qualityModeButton",
  "saveTranslateButton",
  "checkAudioInputButton",
  "micTestButton",
  "audioVoiceToggleButton",
]) expect(renderer, marker, "settings renderer bindings");

for (const marker of [
  "generalSettingsView",
  "audioSettingsView",
  "translateSettingsView",
  "developerSettingsView",
  "runtimeProfileButton",
  "languageFocusButton",
  "auto_play_out_voice",
  "source_language",
  "target_language",
]) expect(views, marker, "settings view markup");

for (const marker of [
  "toggleVoiceOutput",
  "setRuntimeProfile",
  "swapLanguages",
  "Voice output enabled.",
  "Translate mode set to",
]) expect(actions, marker, "settings action helpers");

for (const marker of ["loadSettings", "saveSettings", "saveDefaultSettings"]) expect(runtimeApi, marker, "settings runtime API");

if (errors.length > 0) {
  console.error("Settings surface contract failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log("Settings surface contract passed: generated tabs, renderers, bindings, persistence, language/audio controls, and developer diagnostics are covered.");
