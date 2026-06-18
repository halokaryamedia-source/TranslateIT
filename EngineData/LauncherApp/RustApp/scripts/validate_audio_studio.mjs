import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const repoRoot = resolve(packageRoot, "../../..");

const requiredFiles = [
  "EngineData/LauncherApp/RustApp/src/audioStudioEntry.ts",
  "EngineData/LauncherApp/RustApp/src/audioStudioThemeEntry.ts",
  "EngineData/LauncherApp/RustApp/src/app/launcher/audioStudioBinding.ts",
  "EngineData/LauncherApp/RustApp/src/app/launcher/audioStudioState.ts",
  "EngineData/LauncherApp/RustApp/src/app/launcher/audioStudioAdvancedBinding.ts",
  "EngineData/LauncherApp/RustApp/src/app/launcher/audioStudioAdvancedState.ts",
  "EngineData/LauncherApp/RustApp/src/app/engineTranslate/audioStudioApi.ts",
  "EngineData/LauncherApp/RustApp/src/app/shared/audioStudioTypes.ts",
  "EngineData/LauncherApp/RustApp/src-tauri/src/commands/audio_studio.rs",
  "EngineData/LauncherApp/RustApp/src-tauri/src/commands/mod.rs",
  "EngineData/LauncherApp/RustApp/src-tauri/src/main.rs",
  "EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ROUTE_PLACEHOLDER.json",
  "EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_PROJECT_METADATA_CONTRACT.json",
  "EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ADVANCED_QUALITY_CONTRACT.json",
];

const requiredText = [
  ["EngineData/LauncherApp/RustApp/index.html", "/src/audioStudioEntry.ts"],
  ["EngineData/LauncherApp/RustApp/src/audioStudioEntry.ts", "bindAudioStudioUi"],
  ["EngineData/LauncherApp/RustApp/src/audioStudioEntry.ts", "bindAudioStudioAdvancedUi"],
  ["EngineData/LauncherApp/RustApp/src/app/launcher/audioStudioBinding.ts", "validateImportFile"],
  ["EngineData/LauncherApp/RustApp/src/app/launcher/audioStudioBinding.ts", "commandNoticeSequence"],
  ["EngineData/LauncherApp/RustApp/src/app/launcher/audioStudioBinding.ts", "getSelectedReadingLine"],
  ["EngineData/LauncherApp/RustApp/src/app/launcher/audioStudioAdvancedBinding.ts", "isAdvancedMode"],
  ["EngineData/LauncherApp/RustApp/src/app/launcher/audioStudioAdvancedBinding.ts", "clampPercent"],
  ["EngineData/LauncherApp/RustApp/src/app/shared/audioStudioTypes.ts", "AUDIO_STUDIO_COMMAND_STATES"],
  ["EngineData/LauncherApp/RustApp/src/app/engineTranslate/audioStudioApi.ts", "normalizeCommandResult"],
  ["EngineData/LauncherApp/RustApp/src-tauri/src/commands/audio_studio.rs", "validate_take_request"],
  ["EngineData/LauncherApp/RustApp/src-tauri/src/commands/audio_studio.rs", "MAX_TAKE_TITLE_LENGTH"],
  ["EngineData/LauncherApp/RustApp/src-tauri/src/commands/mod.rs", "pub mod audio_studio"],
  ["EngineData/LauncherApp/RustApp/src-tauri/src/main.rs", "audio_studio_import_take"],
  ["EngineData/LauncherApp/RustApp/src-tauri/src/main.rs", "audio_studio_stage_guided_take"],
  ["EngineData/LauncherApp/RustApp/src-tauri/src/main.rs", "audio_studio_update_take_state"],
  ["EngineData/LauncherApp/RustApp/src-tauri/src/main.rs", "audio_studio_export_project_metadata"],
  ["EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_PROJECT_METADATA_CONTRACT.json", "UserData/CacheData/AudioStudio/logs/"],
  ["EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ADVANCED_QUALITY_CONTRACT.json", "root_contracts_normalized"],
];

const expectedTakeSources = ["import", "guided_reading"];
const expectedTakeStates = ["draft", "staged", "accepted", "needs_retry", "blocked"];
const expectedRoots = {
  cache: "UserData/CacheData/AudioStudio/",
  saved_project: "UserData/SavedProject/AudioStudio/",
  logs: "UserData/CacheData/AudioStudio/logs/",
};

const errors = [];

function readRepoFile(relativePath) {
  const absolutePath = resolve(repoRoot, relativePath);
  if (!existsSync(absolutePath)) return null;
  return readFileSync(absolutePath, "utf8");
}

function readJson(relativePath) {
  const content = readRepoFile(relativePath);
  if (content === null) {
    errors.push(`Cannot inspect missing JSON file: ${relativePath}`);
    return null;
  }
  try {
    return JSON.parse(content);
  } catch (error) {
    errors.push(`Invalid JSON in ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function expectArrayEquals(actual, expected, label) {
  if (!Array.isArray(actual)) {
    errors.push(`${label} must be an array.`);
    return;
  }
  const actualJoined = actual.join("|");
  const expectedJoined = expected.join("|");
  if (actualJoined !== expectedJoined) {
    errors.push(`${label} mismatch. Expected ${expectedJoined}, got ${actualJoined}.`);
  }
}

function expectValue(actual, expected, label) {
  if (actual !== expected) {
    errors.push(`${label} mismatch. Expected ${expected}, got ${String(actual)}.`);
  }
}

function expectScriptIncludes(scripts, scriptName, expectedText) {
  const script = scripts?.[scriptName];
  if (typeof script !== "string") {
    errors.push(`package.json script is missing: ${scriptName}`);
    return;
  }
  if (!script.includes(expectedText)) {
    errors.push(`package.json script ${scriptName} must include: ${expectedText}`);
  }
}

for (const relativePath of requiredFiles) {
  if (!existsSync(resolve(repoRoot, relativePath))) {
    errors.push(`Missing required Audio Studio file: ${relativePath}`);
  }
}

for (const [relativePath, expectedText] of requiredText) {
  const content = readRepoFile(relativePath);
  if (content === null) {
    errors.push(`Cannot inspect missing file: ${relativePath}`);
    continue;
  }
  if (!content.includes(expectedText)) {
    errors.push(`Missing expected Audio Studio marker in ${relativePath}: ${expectedText}`);
  }
}

const packageJson = readJson("EngineData/LauncherApp/RustApp/package.json");
if (packageJson) {
  expectScriptIncludes(packageJson.scripts, "validate:audio-studio", "node scripts/validate_audio_studio.mjs");
  expectScriptIncludes(packageJson.scripts, "validate:internal", "validate:audio-studio");
  expectScriptIncludes(packageJson.scripts, "validate:full", "validate:audio-studio");
}

const metadataContract = readJson("EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_PROJECT_METADATA_CONTRACT.json");
if (metadataContract) {
  expectValue(metadataContract.schema, "translateit.audio_studio_project_metadata_contract.v1", "metadata contract schema");
  expectValue(metadataContract.status, "contract_only", "metadata contract status");
  expectValue(metadataContract.local_validation_required_before_ready, true, "metadata local validation requirement");
  expectValue(metadataContract.approved_roots?.cache, expectedRoots.cache, "metadata cache root");
  expectValue(metadataContract.approved_roots?.saved_project, expectedRoots.saved_project, "metadata saved project root");
  expectValue(metadataContract.approved_roots?.logs, expectedRoots.logs, "metadata logs root");
  expectArrayEquals(metadataContract.allowed_take_sources, expectedTakeSources, "metadata allowed take sources");
  expectArrayEquals(metadataContract.allowed_take_states, expectedTakeStates, "metadata allowed take states");
}

const advancedContract = readJson("EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ADVANCED_QUALITY_CONTRACT.json");
if (advancedContract) {
  expectValue(advancedContract.schema, "translateit.audio_studio_advanced_quality_contract.v1", "advanced quality contract schema");
  expectValue(advancedContract.status, "advanced_non_local_contract", "advanced quality contract status");
  expectValue(advancedContract.approved_audio_studio_roots?.cache, expectedRoots.cache, "advanced cache root");
  expectValue(advancedContract.approved_audio_studio_roots?.saved_project, expectedRoots.saved_project, "advanced saved project root");
  expectValue(advancedContract.approved_audio_studio_roots?.logs, expectedRoots.logs, "advanced logs root");
  if (!Array.isArray(advancedContract.non_local_done_definition) || !advancedContract.non_local_done_definition.includes("root_contracts_normalized")) {
    errors.push("advanced non-local definition must include root_contracts_normalized.");
  }
}

if (errors.length > 0) {
  console.error("Audio Studio static validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Audio Studio static validation passed.");
